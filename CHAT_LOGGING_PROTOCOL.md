# Chat Food Log Write Protocol

This repository is the user's canonical Food Log. Chats with GitHub write access should use this protocol whenever the user asks to log food, a meal, a drink, a recipe serving, or a correction to the daily log.

## Canonical sources

1. Read the current canonical database first:
   `https://dnpfritorhkyqfxqicnd.supabase.co/storage/v1/object/public/food-log-public/canonical-food-database.json`
2. Read the pending queue before writing:
   `log-queue.json` in `talayahya/tala-recipe-library`
3. Use saved ingredient and recipe values when an exact match exists.
4. For new branded products or restaurant items, verify current nutrition before logging. Do not guess exact values.

## How to log an entry

Fetch the latest `log-queue.json`, preserve every existing entry, append one new entry, and update the same file using its current blob SHA.

Queue format:

```json
{
  "version": 1,
  "entries": [
    {
      "id": "chat-20260718-143000-example",
      "date": "2026-07-18",
      "label": "Meal name",
      "createdAt": "2026-07-18T13:30:00.000Z",
      "macros": {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fibre": 0,
        "addedSugar": 0,
        "naturalSugar": 0
      },
      "details": [
        {
          "name": "Ingredient name",
          "amount": 0,
          "unit": "g"
        }
      ]
    }
  ]
}
```

## Required behaviour

- Never overwrite or remove existing queue entries when adding a new one.
- Use a unique `id` for every new entry.
- Use the user's local calendar date unless they specify another date.
- Use a fixed `createdAt` timestamp when the queue entry is created so duplicate detection works across devices.
- Include all known macros. Use zero only when that nutrient is genuinely unavailable or zero; do not silently invent missing values.
- Include ingredient-level `details` whenever the meal is composed from known foods.
- If the user asks to correct a previously logged meal, first inspect the canonical daily log and pending queue. Add a corrected replacement only after clearly identifying what is being replaced; do not create accidental duplicates.
- After writing, tell the user the entry has been queued. The Food Log website imports queued entries automatically when opened and polls for new entries while open.

## Website import behaviour

The website reads `log-queue.json` automatically, deduplicates entries by their fixed signature, adds new entries to the daily diary, syncs them to Supabase when the user is logged in, and republishes the canonical database.
