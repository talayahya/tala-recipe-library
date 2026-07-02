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
