# Food lookup Edge Function

This Supabase Edge Function lets the static GitHub Pages app search richer food
providers without exposing private API keys in frontend JavaScript.

It always searches Open Food Facts, which needs no secret key. Nutritionix and
FatSecret are optional and turn on automatically when their secrets are present.

## Deploy

From the repository root:

```powershell
supabase login
supabase link --project-ref dnpfritorhkyqfxqicnd
supabase functions deploy food-lookup
```

## Optional provider secrets

Nutritionix:

```powershell
supabase secrets set NUTRITIONIX_APP_ID="your_app_id" NUTRITIONIX_APP_KEY="your_app_key"
```

Optional UK branded filter, if your Nutritionix plan supports it:

```powershell
supabase secrets set NUTRITIONIX_BRANDED_REGION="2"
```

FatSecret:

```powershell
supabase secrets set FATSECRET_CLIENT_ID="your_client_id" FATSECRET_CLIENT_SECRET="your_client_secret"
```

Optional UK/localization filter, if your FatSecret plan supports it:

```powershell
supabase secrets set FATSECRET_REGION="GB"
```

Never commit real values for these secrets. For local testing, put them in
`supabase/functions/.env`; that file is ignored by git.
