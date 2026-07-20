type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  addedSugar: number;
  naturalSugar: number;
};

type FoodCandidate = {
  id: string;
  name: string;
  unit: string;
  source: string;
  sourceId?: string;
  defaultAmount?: number;
  note?: string;
  macros: Macros;
};

type ProviderStatus = {
  name: string;
  status: "ok" | "not_configured" | "error";
  count?: number;
  message?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const offFields = [
  "code",
  "product_name",
  "brands",
  "nutriments",
  "serving_size",
  "serving_quantity",
  "quantity",
  "countries_tags",
].join(",");

let fatSecretToken = "";
let fatSecretTokenExpiresAt = 0;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const query = String(body.query || "").trim().slice(0, 160);
  if (!query) return json({ error: "Missing query" }, 400);

  const providers: ProviderStatus[] = [];
  const providerRuns: Promise<{ status: ProviderStatus; candidates: FoodCandidate[] }>[] = [
    runProvider("Open Food Facts", () => searchOpenFoodFacts(query)),
  ];

  if (nutritionixConfigured()) {
    providerRuns.push(runProvider("Nutritionix", () => searchNutritionix(query)));
  } else {
    providers.push({ name: "Nutritionix", status: "not_configured" });
  }

  if (fatSecretConfigured()) {
    providerRuns.push(runProvider("FatSecret", () => searchFatSecret(query)));
  } else {
    providers.push({ name: "FatSecret", status: "not_configured" });
  }

  const results = await Promise.all(providerRuns);
  const candidates: FoodCandidate[] = [];
  for (const result of results) {
    providers.push(result.status);
    candidates.push(...result.candidates);
  }

  return json({
    query,
    candidates: dedupeCandidates(candidates, 14),
    providers,
  });
});

async function runProvider(
  name: string,
  search: () => Promise<FoodCandidate[]>,
): Promise<{ status: ProviderStatus; candidates: FoodCandidate[] }> {
  try {
    const candidates = await search();
    return { status: { name, status: "ok", count: candidates.length }, candidates };
  } catch (error) {
    console.error(`${name} lookup failed`, error);
    return {
      status: { name, status: "error", message: errorMessage(error) },
      candidates: [],
    };
  }
}

async function searchOpenFoodFacts(query: string): Promise<FoodCandidate[]> {
  const seen = new Set<string>();
  const out: FoodCandidate[] = [];

  if (/^\d{8,14}$/.test(query)) {
    const productUrl = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(query)}?fields=${encodeURIComponent(offFields)}`;
    const data = await fetchJson(productUrl, openFoodFactsHeaders());
    pushUnique(out, seen, openFoodFactsProductToCandidate(data.product));
  }

  const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=${encodeURIComponent(offFields)}`;
  const data = await fetchJson(searchUrl, openFoodFactsHeaders());
  for (const product of data.products || []) {
    pushUnique(out, seen, openFoodFactsProductToCandidate(product));
  }

  return out;
}

function openFoodFactsHeaders(): RequestInit {
  return {
    headers: {
      Accept: "application/json",
      "User-Agent": "TalaFoodLog/1.0 (GitHub Pages food log)",
    },
  };
}

function openFoodFactsProductToCandidate(product: any): FoodCandidate | null {
  const nutriments = product?.nutriments || {};
  const name = [product?.product_name, product?.brands].filter(Boolean).join(" - ").trim();
  const calories = safeNum(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? nutriments.energy_kcal_100g);
  if (!name || calories <= 0) return null;

  return {
    id: `off-${product.code || slugify(name)}`,
    name,
    unit: "100g",
    source: "Open Food Facts",
    sourceId: String(product.code || ""),
    defaultAmount: 100,
    note: "Open data result. Total sugars are saved as natural sugar unless the source splits them.",
    macros: {
      calories,
      protein: safeNum(nutriments.proteins_100g ?? nutriments.proteins),
      carbs: safeNum(nutriments.carbohydrates_100g ?? nutriments.carbohydrates),
      fat: safeNum(nutriments.fat_100g ?? nutriments.fat),
      fibre: safeNum(nutriments.fiber_100g ?? nutriments.fiber),
      addedSugar: 0,
      naturalSugar: safeNum(nutriments.sugars_100g ?? nutriments.sugars),
    },
  };
}

function nutritionixConfigured(): boolean {
  return Boolean(Deno.env.get("NUTRITIONIX_APP_ID") && Deno.env.get("NUTRITIONIX_APP_KEY"));
}

async function searchNutritionix(query: string): Promise<FoodCandidate[]> {
  const out: FoodCandidate[] = [];
  const seen = new Set<string>();
  const headers = nutritionixHeaders();

  const instantUrl = new URL("https://trackapi.nutritionix.com/v2/search/instant");
  instantUrl.searchParams.set("query", query);
  instantUrl.searchParams.set("common", "true");
  instantUrl.searchParams.set("branded", "true");
  const brandedRegion = Deno.env.get("NUTRITIONIX_BRANDED_REGION");
  if (brandedRegion) instantUrl.searchParams.set("branded_region", brandedRegion);

  const instant = await fetchJson(instantUrl.toString(), { headers });
  for (const item of (instant.branded || []).slice(0, 5)) {
    const itemId = item.nix_item_id;
    if (!itemId) {
      pushUnique(out, seen, nutritionixFoodToCandidate(item, "Nutritionix"));
      continue;
    }
    const detailUrl = new URL("https://trackapi.nutritionix.com/v2/search/item");
    detailUrl.searchParams.set("nix_item_id", itemId);
    const detail = await fetchJson(detailUrl.toString(), { headers }).catch(() => null);
    for (const food of detail?.foods || [item]) {
      pushUnique(out, seen, nutritionixFoodToCandidate(food, "Nutritionix"));
    }
  }

  const natural = await fetchJson("https://trackapi.nutritionix.com/v2/natural/nutrients", {
    method: "POST",
    headers,
    body: JSON.stringify({
      query,
      use_branded_foods: true,
      timezone: "Europe/London",
    }),
  }).catch(() => null);

  for (const food of natural?.foods || []) {
    pushUnique(out, seen, nutritionixFoodToCandidate(food, "Nutritionix natural"));
  }

  return out;
}

function nutritionixHeaders(): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-app-id": Deno.env.get("NUTRITIONIX_APP_ID") || "",
    "x-app-key": Deno.env.get("NUTRITIONIX_APP_KEY") || "",
  };
}

function nutritionixFoodToCandidate(food: any, source: string): FoodCandidate | null {
  const baseName = food.food_name || food.nix_item_name || food.item_name || "";
  const brand = food.brand_name || food.nix_brand_name || "";
  const name = [baseName, brand].filter(Boolean).join(" - ").trim();
  const calories = safeNum(food.nf_calories);
  if (!name || calories <= 0) return null;

  const serving = [food.serving_qty, food.serving_unit].filter(Boolean).join(" ");
  const grams = safeNum(food.serving_weight_grams);
  const note = serving || grams ? `Serving: ${serving || "1 serving"}${grams ? ` (${fmt(grams)}g)` : ""}` : "Serving nutrition from Nutritionix.";

  return {
    id: `nutritionix-${food.nix_item_id || food.upc || slugify(`${name}-${serving}`)}`,
    name,
    unit: "item",
    source,
    sourceId: String(food.nix_item_id || food.upc || ""),
    defaultAmount: 1,
    note,
    macros: {
      calories,
      protein: safeNum(food.nf_protein),
      carbs: safeNum(food.nf_total_carbohydrate),
      fat: safeNum(food.nf_total_fat),
      fibre: safeNum(food.nf_dietary_fiber),
      addedSugar: 0,
      naturalSugar: safeNum(food.nf_sugars),
    },
  };
}

function fatSecretConfigured(): boolean {
  return Boolean(Deno.env.get("FATSECRET_CLIENT_ID") && Deno.env.get("FATSECRET_CLIENT_SECRET"));
}

async function searchFatSecret(query: string): Promise<FoodCandidate[]> {
  const token = await getFatSecretToken();
  const searchParams: Record<string, string> = {
    method: "foods.search",
    search_expression: query,
    max_results: "8",
    format: "json",
  };
  const region = Deno.env.get("FATSECRET_REGION");
  if (region) searchParams.region = region;

  const search = await fatSecretApi(token, searchParams);
  const foods = asArray(search?.foods?.food).slice(0, 5);
  const out: FoodCandidate[] = [];
  const seen = new Set<string>();

  for (const food of foods) {
    if (!food.food_id) continue;
    const detail = await fatSecretApi(token, {
      method: "food.get.v5",
      food_id: String(food.food_id),
      format: "json",
    }).catch(() => null);
    pushUnique(out, seen, fatSecretFoodToCandidate(detail?.food || food));
  }

  return out;
}

async function getFatSecretToken(): Promise<string> {
  if (fatSecretToken && fatSecretTokenExpiresAt > Date.now() + 60000) return fatSecretToken;

  const clientId = Deno.env.get("FATSECRET_CLIENT_ID") || "";
  const clientSecret = Deno.env.get("FATSECRET_CLIENT_SECRET") || "";
  const scope = Deno.env.get("FATSECRET_SCOPE") || "basic";
  const body = new URLSearchParams({ grant_type: "client_credentials", scope });
  const data = await fetchJson("https://oauth.fatsecret.com/connect/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });

  fatSecretToken = String(data.access_token || "");
  fatSecretTokenExpiresAt = Date.now() + Math.max(60, safeNum(data.expires_in) - 60) * 1000;
  if (!fatSecretToken) throw new Error("FatSecret did not return an access token");
  return fatSecretToken;
}

async function fatSecretApi(token: string, params: Record<string, string>): Promise<any> {
  return fetchJson("https://platform.fatsecret.com/rest/server.api", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params),
  });
}

function fatSecretFoodToCandidate(food: any): FoodCandidate | null {
  const servings = asArray(food?.servings?.serving);
  const serving = servings.find((s) => String(s.metric_serving_unit || "").toLowerCase() === "g" && Math.abs(safeNum(s.metric_serving_amount) - 100) < 0.5) ||
    servings[0] || food;
  const calories = safeNum(serving.calories);
  const name = [food?.food_name, food?.brand_name].filter(Boolean).join(" - ").trim();
  if (!name || calories <= 0) return null;

  const isPer100g = String(serving.metric_serving_unit || "").toLowerCase() === "g" &&
    Math.abs(safeNum(serving.metric_serving_amount) - 100) < 0.5;
  const servingDescription = serving.serving_description || serving.measurement_description || "serving";

  return {
    id: `fatsecret-${food.food_id || slugify(`${name}-${servingDescription}`)}`,
    name,
    unit: isPer100g ? "100g" : "item",
    source: "FatSecret",
    sourceId: String(food.food_id || ""),
    defaultAmount: isPer100g ? 100 : 1,
    note: `Serving: ${servingDescription}`,
    macros: {
      calories,
      protein: safeNum(serving.protein),
      carbs: safeNum(serving.carbohydrate),
      fat: safeNum(serving.fat),
      fibre: safeNum(serving.fiber),
      addedSugar: 0,
      naturalSugar: safeNum(serving.sugar),
    },
  };
}

async function fetchJson(url: string, init: RequestInit = {}): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`${response.status} ${text.slice(0, 160)}`);
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeCandidates(candidates: FoodCandidate[], limit: number): FoodCandidate[] {
  const seen = new Set<string>();
  const out: FoodCandidate[] = [];
  for (const candidate of candidates) {
    if (!candidate || !candidate.name || safeNum(candidate.macros?.calories) <= 0) continue;
    const key = candidate.sourceId ? `${candidate.source}:${candidate.sourceId}` : `${candidate.name.toLowerCase()}:${fmt(candidate.macros.calories)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(candidate);
    if (out.length >= limit) break;
  }
  return out;
}

function pushUnique(out: FoodCandidate[], seen: Set<string>, candidate: FoodCandidate | null): void {
  if (!candidate || safeNum(candidate.macros?.calories) <= 0) return;
  const key = candidate.sourceId ? `${candidate.source}:${candidate.sourceId}` : `${candidate.name.toLowerCase()}:${fmt(candidate.macros.calories)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(candidate);
}

function asArray(value: any): any[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function safeNum(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function fmt(value: unknown): string {
  const n = safeNum(value);
  return (Math.round(n * 10) / 10).toString();
}

function slugify(value: unknown): string {
  return String(value || "food")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "food";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
