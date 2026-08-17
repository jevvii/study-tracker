-- Study Tracker — Reference URLs on non-resource items.
-- Apply to your Supabase project:
--   supabase db execute --file supabase/migration_item_reference_urls.sql
-- or paste into the SQL editor. Safe to re-run: `||` merges jsonb without
-- clobbering other keys, and re-running just re-applies the same value.
--
-- Item metadata now supports a `url` reference link for every track (not just
-- resources), surfaced as an "Open reference" link in the item details. This
-- backfills the seeded Week-1 reading so it links out to the C4 model site
-- without a manual edit; other items get their URLs via the new form field.

update items
  set metadata = metadata || '{"url":"https://c4model.com"}'::jsonb
  where id = 'se-plan-w1-3';