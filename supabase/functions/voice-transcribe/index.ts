const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const maxAudioBytes = 25 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const isLoggedIn = await hasSupabaseUser(authHeader);
  if (!isLoggedIn) return json({ error: "Log in to use high-accuracy voice." }, 401);

  const openAiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openAiKey) return json({ error: "OPENAI_API_KEY is not configured." }, 500);

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) return json({ error: "Missing audio file." }, 400);
  if (audio.size <= 0) return json({ error: "Empty audio file." }, 400);
  if (audio.size > maxAudioBytes) return json({ error: "Audio file is too large." }, 413);

  const transcriptionForm = new FormData();
  transcriptionForm.append("file", audio, audio.name || "food-voice.webm");
  transcriptionForm.append("model", "gpt-4o-transcribe");
  transcriptionForm.append("language", "en");
  transcriptionForm.append(
    "prompt",
    "Food diary dictation. Preserve food names, brands, restaurant names, quantities, and units.",
  );

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: transcriptionForm,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("OpenAI transcription failed", data);
    return json({ error: openAiErrorMessage(response.status, data) }, 502);
  }

  return json({ text: String(data.text || "").trim(), model: "gpt-4o-transcribe" });
});

async function hasSupabaseUser(authHeader: string): Promise<boolean> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey || !authHeader.startsWith("Bearer ")) return false;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authHeader,
    },
  });

  return response.ok;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function openAiErrorMessage(status: number, data: any): string {
  const error = data?.error || {};
  const code = String(error.code || error.type || "");
  const message = String(error.message || "");
  const combined = `${code} ${message}`;

  if (status === 401 || /invalid.*key|incorrect.*key|api.?key/i.test(combined)) {
    return "OpenAI API key was rejected.";
  }
  if (status === 429 || /quota|billing|rate limit|insufficient/i.test(combined)) {
    return "OpenAI billing or quota needs attention.";
  }
  if (status === 400 || /audio|file|format/i.test(combined)) {
    return "OpenAI could not read that audio. Try recording again.";
  }

  return "Voice transcription failed. Try again.";
}
