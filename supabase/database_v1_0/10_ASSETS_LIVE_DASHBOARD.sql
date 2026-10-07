-- SAAMS Production — Live Assets + Dashboard Integration
-- آمن: ينشئ جدول الأصول إذا لم يكن موجوداً ولا يحذف أي بيانات حالية.

create extension if not exists pgcrypto;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  barcode text not null,
  central_finance_barcode text,
  name_ar text,
  name_en text,
  category_ar text,
  category_en text,
  nursery_id uuid references public.nurseries(id),
  status text not null default 'active',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assets add column if not exists barcode text;
alter table public.assets add column if not exists central_finance_barcode text;
alter table public.assets add column if not exists name_ar text;
alter table public.assets add column if not exists name_en text;
alter table public.assets add column if not exists category_ar text;
alter table public.assets add column if not exists category_en text;
alter table public.assets add column if not exists nursery_id uuid;
alter table public.assets add column if not exists status text default 'active';
alter table public.assets add column if not exists notes text;
alter table public.assets add column if not exists created_by uuid;
alter table public.assets add column if not exists created_at timestamptz default now();
alter table public.assets add column if not exists updated_at timestamptz default now();

-- Normalize empty barcodes only; do not alter valid values.
delete from public.assets where barcode is null or btrim(barcode)='';
alter table public.assets alter column barcode set not null;

-- Global barcode uniqueness. If legacy duplicates already exist, keep the oldest row and stop here with a readable exception.
do $$
begin
  if exists (
    select lower(regexp_replace(btrim(barcode),'\\s+','','g'))
    from public.assets
    group by lower(regexp_replace(btrim(barcode),'\\s+','','g'))
    having count(*) > 1
  ) then
    raise exception 'Duplicate asset barcodes exist. Remove duplicates before enabling the global unique barcode index.';
  end if;
end $$;

create unique index if not exists assets_barcode_unique_normalized
on public.assets (lower(regexp_replace(btrim(barcode),'\\s+','','g')));

create index if not exists assets_nursery_id_idx on public.assets(nursery_id);
create index if not exists assets_status_idx on public.assets(status);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists assets_updated_at on public.assets;
create trigger assets_updated_at before update on public.assets
for each row execute function public.set_updated_at();

-- Security / RLS
alter table public.assets enable row level security;

drop policy if exists saams_assets_select on public.assets;
create policy saams_assets_select on public.assets for select to authenticated using (
  public.has_page_permission('assets') or nursery_id=public.current_nursery_id()
);

drop policy if exists saams_assets_insert on public.assets;
create policy saams_assets_insert on public.assets for insert to authenticated with check (
  public.has_page_permission('assets')
);

drop policy if exists saams_assets_update on public.assets;
create policy saams_assets_update on public.assets for update to authenticated using (
  public.has_page_permission('assets')
) with check (
  public.has_page_permission('assets')
);

drop policy if exists saams_assets_delete on public.assets;
create policy saams_assets_delete on public.assets for delete to authenticated using (
  public.has_page_permission('assets')
);

-- Verification
select
  (select count(*) from public.assets) as assets,
  (select count(*) from public.invoices) as invoices,
  (select count(*) from public.advance_allocations aa join public.advances a on a.id=aa.advance_id where a.status='open') as open_advance_allocations;
