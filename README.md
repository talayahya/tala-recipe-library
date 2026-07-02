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
Supabase when you are logged in (magic-link email). Entries then persist across
refreshes and devices.

### One-time Supabase setup

1. **Database + RLS** — In the Supabase dashboard → SQL Editor, paste and run
   [`supabase-setup.sql`](supabase-setup.sql). It creates the `daily_entries`
   table (with all expected columns), an index, enables Row Level Security, and
   creates select/insert/update/delete policies scoped to `auth.uid() = user_id`.
   The script is idempotent, so it is safe to re-run.

2. **Auth → URL Configuration** (this is what fixes the old `localhost:3000`
   redirect):
   - **Site URL:** `https://talayahya.github.io/tala-recipe-library/`
   - **Redirect URLs (allow list):** add
     `https://talayahya.github.io/tala-recipe-library/`
     (optionally also `https://talayahya.github.io/tala-recipe-library/**`).

3. **Auth → Providers → Email:** make sure Email is enabled. The app uses
   magic links (`signInWithOtp`), so "Confirm email" / magic link must be on.

The front end already requests the redirect explicitly via
`emailRedirectTo = location.origin + location.pathname`, so once the live URL is
in the redirect allow list, login links come back to the GitHub Pages site
instead of localhost.

### Status messages

- **Log in to sync** — logged out; entries save locally only.
- **Check email** — a magic link was sent.
- **Synced as [email]** — logged in and syncing.
- **Synced** — an entry saved to Supabase.
- **Saved locally** — saved to `localStorage` (logged out / offline).
- **Supabase error: [message]** — the actual error from Supabase (table/RLS/auth).

Local entries made while logged out are migrated to Supabase automatically after
login, de-duplicated by id and by content signature so nothing doubles up.
