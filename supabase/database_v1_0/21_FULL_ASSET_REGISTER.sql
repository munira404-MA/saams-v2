-- SAAMS V20 — السجل الكامل للأصول (بيانات الإدارة)
-- Safe to run more than once. Deletes nothing and does not change existing asset names,
-- categories, nurseries or barcodes.
--
-- 1) Adds the Consolidated Asset Register columns to public.assets.
-- 2) Adds saams_apply_asset_register(jsonb): the app sends the register rows in batches;
--    each row updates the asset with the same internal barcode. The Central Finance (SFD)
--    barcode is filled only where the asset has none and the value is not used by another asset.

alter table public.assets add column if not exists site_location text;
alter table public.assets add column if not exists fund_source text;
alter table public.assets add column if not exists main_category text;
alter table public.assets add column if not exists sub_category_1 text;
alter table public.assets add column if not exists sub_category_2 text;
alter table public.assets add column if not exists item_description text;
alter table public.assets add column if not exists model text;
alter table public.assets add column if not exists brand text;
alter table public.assets add column if not exists serial_number text;
alter table public.assets add column if not exists cost numeric(14,2);
alter table public.assets add column if not exists supplier_name text;
alter table public.assets add column if not exists document_reference text;
alter table public.assets add column if not exists receiving_date date;
alter table public.assets add column if not exists warranty_expiry date;
alter table public.assets add column if not exists asset_condition text;
alter table public.assets add column if not exists disposal_reference text;
alter table public.assets add column if not exists register_status text;
alter table public.assets add column if not exists register_customer text;
alter table public.assets add column if not exists register_updated_at timestamptz;

create or replace function public.saams_norm_barcode(v text)
returns text language sql immutable as $$
  select lower(regexp_replace(btrim(coalesce(v, '')), '\s+', '', 'g'))
$$;

create index if not exists assets_barcode_norm_v20 on public.assets (public.saams_norm_barcode(barcode));

create or replace function public.saams_apply_asset_register(p_rows jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matched int := 0;
  v_finance int := 0;
  v_finance_skipped int := 0;
  v_unmatched jsonb;
  r record;
begin
  if not (public.is_super_admin() or (public.has_page_permission('assets') and public.has_page_permission('asset_register'))) then
    raise exception 'ASSET_REGISTER_FORBIDDEN' using errcode = '42501';
  end if;

  with src as (
    select distinct on (public.saams_norm_barcode(x.barcode)) x.*, public.saams_norm_barcode(x.barcode) as k
    from jsonb_to_recordset(p_rows) as x(
      barcode text, customer_name text, sfd_barcode text,
      site_location text, fund_source text, main_category text, sub_category_1 text, sub_category_2 text,
      item_description text, model text, brand text, serial_number text, cost numeric, supplier_name text,
      document_reference text, receiving_date date, warranty_expiry date, asset_condition text,
      disposal_reference text, register_status text)
    where public.saams_norm_barcode(x.barcode) <> ''
  )
  update public.assets a set
    site_location = s.site_location, fund_source = s.fund_source, main_category = s.main_category,
    sub_category_1 = s.sub_category_1, sub_category_2 = s.sub_category_2, item_description = s.item_description,
    model = s.model, brand = s.brand, serial_number = s.serial_number, cost = s.cost, supplier_name = s.supplier_name,
    document_reference = s.document_reference, receiving_date = s.receiving_date, warranty_expiry = s.warranty_expiry,
    asset_condition = s.asset_condition, disposal_reference = s.disposal_reference, register_status = s.register_status,
    register_customer = s.customer_name, register_updated_at = now()
  from src s
  where public.saams_norm_barcode(a.barcode) = s.k;
  get diagnostics v_matched = row_count;

  -- Central Finance (SFD) barcode: fill only empty ones, one at a time, never overwrite.
  for r in
    select distinct on (public.saams_norm_barcode(x.sfd_barcode)) x.barcode, x.sfd_barcode
    from jsonb_to_recordset(p_rows) as x(barcode text, sfd_barcode text)
    where coalesce(btrim(x.sfd_barcode), '') <> ''
  loop
    begin
      update public.assets a set central_finance_barcode = btrim(r.sfd_barcode)
      where public.saams_norm_barcode(a.barcode) = public.saams_norm_barcode(r.barcode)
        and coalesce(btrim(a.central_finance_barcode), '') = ''
        and not exists (select 1 from public.assets b
                        where public.saams_norm_barcode(b.central_finance_barcode) = public.saams_norm_barcode(r.sfd_barcode));
      if found then v_finance := v_finance + 1; end if;
    exception when unique_violation then
      v_finance_skipped := v_finance_skipped + 1;
    end;
  end loop;

  select coalesce(jsonb_agg(x.barcode), '[]'::jsonb) into v_unmatched
  from jsonb_to_recordset(p_rows) as x(barcode text)
  where public.saams_norm_barcode(x.barcode) <> ''
    and not exists (select 1 from public.assets a where public.saams_norm_barcode(a.barcode) = public.saams_norm_barcode(x.barcode));

  return jsonb_build_object('matched', v_matched, 'finance_filled', v_finance, 'finance_skipped', v_finance_skipped, 'unmatched', v_unmatched);
end;
$$;

revoke all on function public.saams_apply_asset_register(jsonb) from public, anon;
grant execute on function public.saams_apply_asset_register(jsonb) to authenticated;

notify pgrst, 'reload schema';

select 'full_asset_register_ready' as status,
       count(*) as total_assets,
       count(*) filter (where register_updated_at is not null) as assets_with_register_data
from public.assets;
