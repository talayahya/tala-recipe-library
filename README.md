# Recipe Library

A searchable, scalable recipe and ingredient library for regular meals.

## How it works

- `recipes.json` stores recipes, ingredients, default grams, cooking instructions, and tags.
- `ingredients.json` stores nutrition per 100 g or per item.
- `index.html`, `styles.css`, and `app.js` create the searchable website.

## Updating from ChatGPT

When you make a new recipe in chat, ask: “Add this recipe to my recipe site.” I can update the JSON files in this repository so the website stays current.

## Hosting

Use GitHub Pages: Settings → Pages → Deploy from branch → `main` → `/root`.

## Food log sync (Supabase)

The daily food log saves to `localStorage` always, and additionally syncs to
Supabase when you are logged in (email + password). Entries then persist across
refreshes and devices.

## Food lookup backend

The Today page can search saved foods, public Open Food Facts data, and optional
private food databases through the Supabase Edge Function at
`supabase/functions/food-lookup`.

The function keeps private API keys out of the browser. With no secrets
configured it still searches Open Food Facts. Add provider secrets in Supabase to
turn on richer results:

- Nutritionix: `NUTRITIONIX_APP_ID`, `NUTRITIONIX_APP_KEY`
- Optional Nutritionix UK branded filter: `NUTRITIONIX_BRANDED_REGION=2`
- FatSecret: `FATSECRET_CLIENT_ID`, `FATSECRET_CLIENT_SECRET`
- Optional FatSecret UK/localization filter: `FATSECRET_REGION=GB`

Deploy it with:

```powershell
supabase link --project-ref dnpfritorhkyqfxqicnd
supabase functions deploy food-lookup
```

See `supabase/functions/food-lookup/README.md` for provider setup details.

## Free in-app voice input

The Voice button uses the browser's built-in speech recognition and a local Web
Audio meter. It does not call the OpenAI API or the `voice-transcribe` Edge
Function.

The transcript is written into the Add food box. Tapping Find food searches for
matches and still requires approval before anything is logged.

### One-time Supabase setup

1. **Database + RLS** — In the Supabase dashboard → SQL Editor, paste and run
   [`supabase-setup.sql`](supabase-setup.sql). It creates the `daily_entries`
   table (with all expected columns), an index, enables Row Level Security, and
   creates select/insert/update/delete policies scoped to `auth.uid() = user_id`.
   The script is idempotent, so it is safe to re-run.

2. **Auth → Providers → Email:** make sure Email is enabled. The app uses
   email + password (`signInWithPassword` / `signUp`). To skip confirmation
   emails entirely (and avoid the email rate limit), turn **off** "Confirm
   email" — then Create account logs you straight in. If you leave it on, new
   accounts must click a confirmation email once before they can log in.

The app uses email + password only — there is no redirect/magic-link flow, so
no Site URL / redirect allow-list configuration is required.

### Status messages

- **Log in to sync** — logged out; entries save locally only.
- **Logged in as [email]** — logged in and syncing.
- **Synced** — an entry saved to Supabase.
- **Saved locally** — saved to `localStorage` (logged out / offline).
- **Supabase error: [message]** — the actual error from Supabase (table/RLS/auth).

Local entries made while logged out are migrated to Supabase automatically after
login, de-duplicated by id and by content signature so nothing doubles up.

### Duplicate / reappearing entries

Entries are stored only in Supabase (when logged in) and `localStorage` — there
is no static seed file re-imported on load, so a deleted entry stays deleted.
If you still see old duplicate rows from before this fix, run
[`cleanup-duplicates.sql`](cleanup-duplicates.sql) once in the Supabase SQL
editor; it keeps one row per identical entry and removes the rest.
