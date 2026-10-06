-- SAAMS Production - Live Asset Requests
-- Safe: creates the asset_requests table and RLS policies without deleting existing production data.

create extension if not exists pgcrypto;

create table if not exists public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  request_type text not null check (request_type in ('transfer','surplus','disposal')),
  asset_id uuid null references public.assets(id) on delete set null,
  barcode text not null,
  asset_name_ar text not null,
  asset_name_en text,
  from_name_ar text not null,
  from_name_en text,
  to_name_ar text,
  to_name_en text,
  reason_ar text not null,
  reason_en text,
  status text not null default 'pending' check (status in ('pending','approved','returned','rejected')),
  rejection_reason_ar text,
  rejection_reason_en text,
  created_by uuid null references auth.users(id) on delete set null,
  decided_by uuid null references auth.users(id) on delete set null,
  decision_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists asset_requests_status_idx on public.asset_requests(status);
create index if not exists asset_requests_type_idx on public.asset_requests(request_type);
create index if not exists asset_requests_created_by_idx on public.asset_requests(created_by);
create index if not exists asset_requests_barcode_idx on public.asset_requests(barcode);

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

alter table public.asset_requests enable row level security;

drop policy if exists asset_requests_select on public.asset_requests;
create policy asset_requests_select on public.asset_requests
for select to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','super_admin')
  )
);

drop policy if exists asset_requests_insert on public.asset_requests;
create policy asset_requests_insert on public.asset_requests
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists asset_requests_admin_update on public.asset_requests;
create policy asset_requests_admin_update on public.asset_requests
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','super_admin')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','super_admin')
  )
);

grant select, insert, update on public.asset_requests to authenticated;

select 'asset_requests_ready' as status, count(*) as existing_requests from public.asset_requests;
