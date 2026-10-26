-- SAAMS V12 — Asset requests repair + nursery links
-- Safe to run more than once. Deletes nothing.
--
-- What it does:
-- 1) Makes sure public.asset_requests exists with every column the app sends
--    (fixes «تعذر إرسال الطلب إلى الإدارة» when the table, a column, a grant or the
--    insert policy is missing).
-- 2) Adds category_ar/category_en to requests (category picker in the request form).
-- 3) Adds from_nursery_id / to_nursery_id, filled automatically from the nursery names,
--    so the receiving nursery can see a transfer that is coming to it.
-- 4) Re-creates the asset_requests policies (nursery reads its own outgoing and incoming
--    requests; administration keeps full access) and reloads the API schema cache.

begin;

create extension if not exists pgcrypto;

create table if not exists public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  request_type text not null,
  asset_id uuid null references public.assets(id) on delete set null,
  barcode text not null,
  central_finance_barcode text,
  asset_name_ar text not null,
  asset_name_en text,
  from_name_ar text not null,
  from_name_en text,
  to_name_ar text,
  to_name_en text,
  reason_ar text not null,
  reason_en text,
  status text not null default 'pending',
  rejection_reason_ar text,
  rejection_reason_en text,
  created_by uuid null references auth.users(id) on delete set null,
  decided_by uuid null references auth.users(id) on delete set null,
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columns used by the app (older databases may be missing some of them).
alter table public.asset_requests add column if not exists central_finance_barcode text;
alter table public.asset_requests add column if not exists asset_name_en text;
alter table public.asset_requests add column if not exists from_name_en text;
alter table public.asset_requests add column if not exists to_name_ar text;
alter table public.asset_requests add column if not exists to_name_en text;
alter table public.asset_requests add column if not exists reason_en text;
alter table public.asset_requests add column if not exists rejection_reason_ar text;
alter table public.asset_requests add column if not exists rejection_reason_en text;
alter table public.asset_requests add column if not exists decided_by uuid references auth.users(id) on delete set null;
alter table public.asset_requests add column if not exists decision_at timestamptz;
alter table public.asset_requests add column if not exists updated_at timestamptz not null default now();
alter table public.asset_requests add column if not exists transport_status text;
alter table public.asset_requests add column if not exists pickup_at timestamptz;
alter table public.asset_requests add column if not exists delivered_at timestamptz;
alter table public.asset_requests add column if not exists picked_up_by uuid references auth.users(id) on delete set null;
alter table public.asset_requests add column if not exists delivered_by uuid references auth.users(id) on delete set null;
-- New in V12
alter table public.asset_requests add column if not exists category_ar text;
alter table public.asset_requests add column if not exists category_en text;
alter table public.asset_requests add column if not exists from_nursery_id uuid references public.nurseries(id) on delete set null;
alter table public.asset_requests add column if not exists to_nursery_id uuid references public.nurseries(id) on delete set null;

-- Finance barcode is optional on requests.
alter table public.asset_requests alter column central_finance_barcode drop not null;

-- Allowed values (same as 13_TRANSPORT_WORKFLOW.sql).
alter table public.asset_requests drop constraint if exists asset_requests_request_type_check;
alter table public.asset_requests add constraint asset_requests_request_type_check
  check (request_type in ('transfer','surplus','disposal')) not valid;
alter table public.asset_requests drop constraint if exists asset_requests_status_check;
alter table public.asset_requests add constraint asset_requests_status_check
  check (status in ('pending','approved','returned','rejected','completed')) not valid;
alter table public.asset_requests drop constraint if exists asset_requests_transport_status_check;
alter table public.asset_requests add constraint asset_requests_transport_status_check
  check (transport_status is null or transport_status in ('awaiting_pickup','in_transit','delivered')) not valid;

create index if not exists asset_requests_status_idx on public.asset_requests(status);
create index if not exists asset_requests_type_idx on public.asset_requests(request_type);
create index if not exists asset_requests_created_by_idx on public.asset_requests(created_by);
create index if not exists asset_requests_barcode_idx on public.asset_requests(barcode);
create index if not exists asset_requests_from_nursery_idx on public.asset_requests(from_nursery_id);
create index if not exists asset_requests_to_nursery_idx on public.asset_requests(to_nursery_id);

-- updated_at
create or replace function public.set_asset_requests_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_asset_requests_updated_at on public.asset_requests;
create trigger trg_asset_requests_updated_at
before update on public.asset_requests
for each row execute function public.set_asset_requests_updated_at();

-- Fill nursery ids from the names the app already sends (and from the asset itself).
create or replace function public.saams_fill_asset_request_nurseries()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.from_nursery_id is null and coalesce(btrim(new.from_name_ar), '') <> '' then
    select n.id into new.from_nursery_id from public.nurseries n
    where n.name_ar = btrim(new.from_name_ar) or n.name_en = btrim(new.from_name_ar)
    limit 1;
  end if;
  if new.from_nursery_id is null and new.asset_id is not null then
    select a.nursery_id into new.from_nursery_id from public.assets a where a.id = new.asset_id;
  end if;
  if new.request_type = 'transfer' and new.to_nursery_id is null and coalesce(btrim(new.to_name_ar), '') <> '' then
    select n.id into new.to_nursery_id from public.nurseries n
    where n.name_ar = btrim(new.to_name_ar) or n.name_en = btrim(new.to_name_ar)
    limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_asset_requests_fill_nurseries on public.asset_requests;
create trigger trg_asset_requests_fill_nurseries
before insert or update of from_name_ar, to_name_ar, asset_id on public.asset_requests
for each row execute function public.saams_fill_asset_request_nurseries();

-- Backfill existing requests.
update public.asset_requests r set from_nursery_id = n.id
from public.nurseries n
where r.from_nursery_id is null and (n.name_ar = btrim(r.from_name_ar) or n.name_en = btrim(r.from_name_ar));
update public.asset_requests r set to_nursery_id = n.id
from public.nurseries n
where r.request_type = 'transfer' and r.to_nursery_id is null and (n.name_ar = btrim(r.to_name_ar) or n.name_en = btrim(r.to_name_ar));
update public.asset_requests r set category_ar = a.category_ar, category_en = a.category_en
from public.assets a
where r.asset_id = a.id and r.category_ar is null;

-- Security
alter table public.asset_requests enable row level security;

drop policy if exists asset_requests_select on public.asset_requests;
create policy asset_requests_select on public.asset_requests
for select to authenticated
using (
  created_by = auth.uid()
  or public.is_super_admin()
  or public.has_page_permission('assets')
  or public.has_page_permission('transport')
  or (public.current_nursery_id() is not null
      and (from_nursery_id = public.current_nursery_id() or to_nursery_id = public.current_nursery_id()))
);

drop policy if exists asset_requests_insert on public.asset_requests;
create policy asset_requests_insert on public.asset_requests
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists asset_requests_admin_update on public.asset_requests;
create policy asset_requests_admin_update on public.asset_requests
for update to authenticated
using (
  public.is_super_admin()
  or public.has_page_permission('assets')
  or public.has_page_permission('transport')
)
with check (
  public.is_super_admin()
  or public.has_page_permission('assets')
  or public.has_page_permission('transport')
);

grant select, insert, update on public.asset_requests to authenticated;

commit;

-- Let the API see new columns immediately.
notify pgrst, 'reload schema';

-- Verification (read-only)
select
  'asset_requests_v12_ready' as status,
  count(*) as total_requests,
  count(*) filter (where from_nursery_id is not null) as linked_to_source_nursery,
  count(*) filter (where request_type = 'transfer' and to_nursery_id is not null) as transfers_linked_to_destination
from public.asset_requests;
