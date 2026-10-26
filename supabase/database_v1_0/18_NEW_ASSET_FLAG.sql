-- SAAMS V13 — «هل هذا أصل جديد؟»
-- Safe to run more than once. Deletes nothing.
-- Adds assets.is_new_asset. Every asset that already exists stays NOT new (false);
-- only assets the authorised employee marks as new from now on are counted as new.

alter table public.assets add column if not exists is_new_asset boolean not null default false;

create index if not exists assets_new_asset_created_idx
  on public.assets (nursery_id, created_at)
  where is_new_asset;

notify pgrst, 'reload schema';

select
  'new_asset_flag_ready' as status,
  count(*) as total_assets,
  count(*) filter (where is_new_asset) as marked_new
from public.assets;
