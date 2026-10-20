-- Run once in Supabase SQL Editor as the database administrator.
-- This intentionally clears ALL asset finance barcodes, including request snapshots.
-- Internal barcodes, asset records, Arabic names and finance uniqueness indexes remain.
begin;

create schema if not exists saams_private;
revoke all on schema saams_private from public, anon, authenticated;
create table if not exists saams_private.finance_barcode_reset_v1 (
  source_table text not null,
  row_id text not null,
  internal_barcode text,
  old_finance_barcode text not null,
  backed_up_at timestamptz not null default now(),
  primary key (source_table, row_id)
);
create table if not exists saams_private.finance_barcode_reset_runs (
  reset_key text primary key,
  completed_at timestamptz not null default now()
);
revoke all on all tables in schema saams_private from public, anon, authenticated;

-- Serialize repeated executions and prevent values changing between backup and clear.
lock table saams_private.finance_barcode_reset_runs in exclusive mode;
lock table public.assets in share row exclusive mode;
do $$
begin
  if exists(select 1 from saams_private.finance_barcode_reset_runs where reset_key='clear_finance_v1') then
    raise notice 'Reset already completed. Newly entered finance barcodes are preserved.';
    return;
  end if;
  alter table public.assets alter column central_finance_barcode drop not null;
  insert into saams_private.finance_barcode_reset_v1(source_table,row_id,internal_barcode,old_finance_barcode)
  select 'assets',id::text,barcode,central_finance_barcode from public.assets
  where central_finance_barcode is not null;
  update public.assets set central_finance_barcode=null where central_finance_barcode is not null;

  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='asset_requests' and column_name='central_finance_barcode') then
    lock table public.asset_requests in share row exclusive mode;
    alter table public.asset_requests alter column central_finance_barcode drop not null;
    insert into saams_private.finance_barcode_reset_v1(source_table,row_id,internal_barcode,old_finance_barcode)
    select 'asset_requests',id::text,barcode,central_finance_barcode from public.asset_requests
    where central_finance_barcode is not null;
    update public.asset_requests set central_finance_barcode=null where central_finance_barcode is not null;
  end if;
  insert into saams_private.finance_barcode_reset_runs(reset_key) values('clear_finance_v1');
end $$;
commit;

select count(*) as total_assets,
       count(*) filter(where central_finance_barcode is not null) as assets_still_with_finance_barcode,
       count(*) filter(where central_finance_barcode is null) as assets_with_blank_finance_barcode
from public.assets;
select source_table,count(*) as backed_up_values
from saams_private.finance_barcode_reset_v1 group by source_table;
