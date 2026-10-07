-- SAAMS Production — Dual Asset Barcodes
-- Adds Central Finance barcode support without deleting or overwriting existing asset data.

alter table public.assets
  add column if not exists central_finance_barcode text;

-- Normalize blanks to NULL so existing production rows remain valid until they are backfilled.
update public.assets
set central_finance_barcode = null
where central_finance_barcode is not null and btrim(central_finance_barcode)='';

-- Prevent duplicate Central Finance barcodes when a value is present.
do $$
begin
  if exists (
    select lower(regexp_replace(btrim(central_finance_barcode),'\\s+','','g'))
    from public.assets
    where central_finance_barcode is not null and btrim(central_finance_barcode)<>''
    group by lower(regexp_replace(btrim(central_finance_barcode),'\\s+','','g'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate Central Finance asset barcodes exist. Resolve duplicates before enabling the unique index.';
  end if;
end $$;

create unique index if not exists assets_central_finance_barcode_unique_normalized
on public.assets (lower(regexp_replace(btrim(central_finance_barcode),'\\s+','','g')))
where central_finance_barcode is not null and btrim(central_finance_barcode)<>'';

create index if not exists assets_central_finance_barcode_idx
on public.assets(central_finance_barcode);

-- Carry both barcodes on future asset requests for easier tracing and reporting.
do $$
begin
  if to_regclass('public.asset_requests') is not null then
    alter table public.asset_requests add column if not exists central_finance_barcode text;
    create index if not exists asset_requests_central_finance_barcode_idx
      on public.asset_requests(central_finance_barcode);
  end if;
end $$;

-- Verification only.
select
  count(*) as total_assets,
  count(*) filter (where central_finance_barcode is not null and btrim(central_finance_barcode)<>'') as assets_with_both_barcodes,
  count(*) filter (where central_finance_barcode is null or btrim(central_finance_barcode)='') as assets_missing_central_finance_barcode
from public.assets;
