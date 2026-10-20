-- OPTIONAL recovery only. Do not run this when intentionally clearing finance barcodes.
-- Restores still-empty fields only, without replacing newly entered numbers.
begin;
lock table public.assets in share row exclusive mode;
update public.assets a
set central_finance_barcode=b.old_finance_barcode
from saams_private.finance_barcode_reset_v1 b
where b.source_table='assets' and a.id::text=b.row_id
  and a.barcode is not distinct from b.internal_barcode
  and a.central_finance_barcode is null
  and not exists (
    select 1 from public.assets other
    where other.id<>a.id and other.central_finance_barcode is not null
      and lower(regexp_replace(btrim(other.central_finance_barcode),'[[:space:]]+','','g'))
        =lower(regexp_replace(btrim(b.old_finance_barcode),'[[:space:]]+','','g'))
  );
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='asset_requests' and column_name='central_finance_barcode') then
    lock table public.asset_requests in share row exclusive mode;
    update public.asset_requests r set central_finance_barcode=b.old_finance_barcode
    from saams_private.finance_barcode_reset_v1 b
    where b.source_table='asset_requests' and r.id::text=b.row_id
      and r.barcode is not distinct from b.internal_barcode
      and r.central_finance_barcode is null;
  end if;
end $$;
commit;
