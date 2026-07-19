# AGENTS.md

## Project overview

This repository powers Tala's personal Food Log and recipe library.

- Live site: https://talayahya.github.io/tala-recipe-library/
- Repository: `talayahya/tala-recipe-library`
- Default branch: `main`
- Hosting: GitHub Pages
- Backend/sync: Supabase
- Canonical public data export: https://dnpfritorhkyqfxqicnd.supabase.co/storage/v1/object/public/food-log-public/canonical-food-database.json

The application is a lightweight browser-based HTML/CSS/JavaScript app. Avoid introducing a build system or framework unless the user explicitly asks for one.

## Important files

- `index.html` — page structure and script loading order.
- `styles.css` — site styling and responsive/mobile layout.
- `app.js` — core Food Log logic, Supabase auth/sync, daily entries, recipes, ingredients, calculations.
- `enhancements.js` — editing UI and local custom ingredient/recipe overlays.
- `daily-food-picker.js` — saved-food picker on the Today page.
- `queue-import.js` — imports food entries queued by ChatGPT/Codex from GitHub.
- `canonical-sync.js` — publishes ingredients, recipes, macro targets, and daily logs to the canonical Supabase JSON object.
- `ingredients.json` — canonical repository ingredient database.
- `recipes.json` — canonical repository recipe database.
- `log-queue.json` — append-only queue used by chats/agents to send new daily log entries to the site.
- `CHAT_LOGGING_PROTOCOL.md` — exact protocol for writing food-log queue entries.
- `supabase-public-food-database.sql` — Storage bucket/RLS setup used for the canonical JSON export.

## Core product rules

1. Preserve nutrition accuracy. Never invent branded food macros.
2. Avoid duplicate ingredient or recipe records.
3. Preserve existing daily food history unless explicitly asked to modify or delete it.
4. Keep raw/cooked weights and per-100g/per-serving units consistent.
5. Keep mobile layout as a first-class requirement; the user primarily checks the site on iPhone.
6. Do not silently break the cross-chat logging flow or canonical database publishing.
7. Do not expose private credentials or add service-role keys to the repository.

## Data model conventions

Ingredient records generally contain:

```json
{
  "id": "unique-slug",
  "name": "Display name",
  "unit": "100g",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "fibre": 0,
  "addedSugar": 0,
  "naturalSugar": 0
}
```

Valid quantity-style units currently used by the app include `100g`, `100g raw`, `item`, `scoop`, `can`, and `pack`. Code treats `item`, `scoop`, `can`, and `pack` as per-unit values; other units are scaled per 100 g.

Daily log queue entries must follow `CHAT_LOGGING_PROTOCOL.md`. When editing `log-queue.json`, fetch the latest file first, preserve all existing entries, append only the requested new entries, and avoid duplicate IDs.

## Supabase and sync behavior

- The app authenticates users with Supabase.
- Daily entries are synced to the `daily_entries` table when logged in.
- `queue-import.js` polls the raw GitHub `log-queue.json` and imports unseen queue entries.
- `canonical-sync.js` publishes the current ingredients, recipes, macro targets, and daily log to the canonical JSON object in the `food-log-public` bucket.
- The canonical JSON is intended as the shared read source for food-related chats and agents.

When changing sync code, preserve:

- duplicate prevention,
- fixed entry timestamps where supplied,
- entry IDs,
- Supabase persistence,
- canonical republishing after imports.

## Development workflow

This is a static site, so local development can usually be done with any simple static server. Do not rely on `file://` behavior for testing because browser CORS and fetch behavior differ from served pages.

A typical local preview command, when Python is available, is:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

For changes affecting Supabase, authentication, or the canonical export, local testing may not fully reproduce the production GitHub Pages origin. Verify production behavior after deployment when practical.

## Validation checklist before finishing a code change

For UI changes:

- Confirm the page does not overflow horizontally on narrow mobile widths.
- Confirm the bottom navigation remains usable.
- Confirm Today, History, Recipes, Foods, and New tabs still open correctly.

For ingredient/recipe changes:

- Confirm calculations use the correct unit scaling.
- Confirm existing saved items are not duplicated.
- Confirm recipe totals still calculate correctly.

For logging/sync changes:

- Confirm `log-queue.json` remains valid JSON.
- Confirm queue imports are deduplicated.
- Confirm imported entries appear on the correct date.
- Confirm authenticated entries sync to Supabase.
- Confirm the canonical JSON can still be republished.

## Deployment

Changes merged or pushed to `main` are served through GitHub Pages. Allow for GitHub Pages propagation and browser caching.

When changing JavaScript or CSS files that are loaded with query-string cache versions in `index.html`, update the version string when necessary so browsers fetch the new asset instead of using a stale cached copy.

## Working style for Codex

- Inspect the current implementation before editing; this project has evolved through incremental compatibility layers.
- Prefer small, targeted changes over broad rewrites.
- Preserve user data and backwards compatibility.
- Explain any schema or sync migration before implementing it.
- When a task is ambiguous, choose the option that is least likely to corrupt or lose food-log data.
