-- One-off cleanup: remove duplicate rows in daily_entries.
-- A duplicate = same user, date, label, macros and details (jsonb equality
-- ignores key order, so re-synced copies match). Keeps one row per group.
-- Run once in the Supabase SQL editor if old rows were duplicated.

delete from daily_entries a
using daily_entries b
where a.user_id = b.user_id
  and a.entry_date = b.entry_date
  and a.label = b.label
  and a.calories = b.calories
  and a.protein = b.protein
  and a.carbs = b.carbs
  and a.fat = b.fat
  and a.fibre = b.fibre
  and a.added_sugar = b.added_sugar
  and a.natural_sugar = b.natural_sugar
  and a.details = b.details
  and a.ctid > b.ctid;
