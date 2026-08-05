-- SAAMS Database V1.0 — 02 Upgrade Existing Database
-- آمن لقاعدة البيانات الحالية: يضيف الأعمدة والعلاقات الناقصة ولا يحذف البيانات.

create extension if not exists pgcrypto;

-- 1) NURSERIES
create table if not exists public.nurseries (
  id uuid primary key default gen_random_uuid(),
  code text,
  name_ar text,
  name_en text,
  active boolean default true,
  created_at timestamptz default now()
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='nurseries' and column_name='is_active')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='nurseries' and column_name='active') then
    alter table public.nurseries rename column is_active to active;
  end if;
end $$;

alter table public.nurseries add column if not exists code text;
alter table public.nurseries add column if not exists name_ar text;
alter table public.nurseries add column if not exists name_en text;
alter table public.nurseries add column if not exists active boolean default true;
alter table public.nurseries add column if not exists created_at timestamptz default now();

update public.nurseries
set code = 'NUR-' || upper(substr(replace(id::text,'-',''),1,8))
where code is null or btrim(code)='';

alter table public.nurseries alter column code set default ('NUR-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
alter table public.nurseries alter column code set not null;
alter table public.nurseries alter column active set default true;

-- Add unique constraints only when safe.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='nurseries_code_unique') then
    if not exists (select code from public.nurseries group by code having count(*)>1) then
      alter table public.nurseries add constraint nurseries_code_unique unique(code);
    end if;
  end if;
  if not exists (select 1 from pg_constraint where conname='nurseries_name_ar_unique') then
    if not exists (select name_ar from public.nurseries where name_ar is not null group by name_ar having count(*)>1) then
      alter table public.nurseries add constraint nurseries_name_ar_unique unique(name_ar);
    end if;
  end if;
end $$;

-- 2) PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  role text,
  nursery_id uuid references public.nurseries(id),
  active boolean default true,
  permissions jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='is_active')
     and not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='active') then
    alter table public.profiles rename column is_active to active;
  end if;
end $$;

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists nursery_id uuid;
alter table public.profiles add column if not exists active boolean default true;
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists created_at timestamptz default now();
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- 3) ADVANCES
create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name_ar text,
  name_en text,
  advance_type text default 'monthly',
  date_from date,
  date_to date,
  status text default 'draft',
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.advances add column if not exists code text;
alter table public.advances add column if not exists name_ar text;
alter table public.advances add column if not exists name_en text;
alter table public.advances add column if not exists advance_type text default 'monthly';
alter table public.advances add column if not exists date_from date;
alter table public.advances add column if not exists date_to date;
alter table public.advances add column if not exists status text default 'draft';
alter table public.advances add column if not exists created_by uuid;
alter table public.advances add column if not exists created_at timestamptz default now();
alter table public.advances add column if not exists updated_at timestamptz default now();

update public.advances set code='ADV-'||upper(substr(replace(id::text,'-',''),1,8)) where code is null or btrim(code)='';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='advances_code_unique')
     and not exists (select code from public.advances group by code having count(*)>1) then
    alter table public.advances add constraint advances_code_unique unique(code);
  end if;
end $$;

-- 4) ADVANCE ALLOCATIONS
create table if not exists public.advance_allocations (
  id uuid primary key default gen_random_uuid(),
  advance_id uuid references public.advances(id) on delete cascade,
  nursery_id uuid references public.nurseries(id),
  allocated numeric(14,2) default 0,
  created_at timestamptz default now()
);

alter table public.advance_allocations add column if not exists advance_id uuid;
alter table public.advance_allocations add column if not exists nursery_id uuid;
alter table public.advance_allocations add column if not exists allocated numeric(14,2) default 0;
alter table public.advance_allocations add column if not exists created_at timestamptz default now();

-- 5) INVOICES — use existing canonical names total_amount / vat_amount
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text,
  nursery_id uuid references public.nurseries(id),
  advance_allocation_id uuid references public.advance_allocations(id),
  supplier_name text,
  invoice_date date,
  subtotal numeric(14,2) default 0,
  vat_amount numeric(14,2) default 0,
  total_amount numeric(14,2) default 0,
  trn text,
  payment_method text,
  status text default 'review',
  return_reason text,
  attachment_path text,
  receipt_path text,
  ocr_payload jsonb default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  returned_by uuid references public.profiles(id),
  returned_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.invoices add column if not exists invoice_number text;
alter table public.invoices add column if not exists nursery_id uuid;
alter table public.invoices add column if not exists advance_allocation_id uuid;
alter table public.invoices add column if not exists supplier_name text;
alter table public.invoices add column if not exists invoice_date date;
alter table public.invoices add column if not exists subtotal numeric(14,2) default 0;
alter table public.invoices add column if not exists vat_amount numeric(14,2) default 0;
alter table public.invoices add column if not exists total_amount numeric(14,2) default 0;
alter table public.invoices add column if not exists trn text;
alter table public.invoices add column if not exists payment_method text;
alter table public.invoices add column if not exists status text default 'review';
alter table public.invoices add column if not exists return_reason text;
alter table public.invoices add column if not exists attachment_path text;
alter table public.invoices add column if not exists receipt_path text;
alter table public.invoices add column if not exists ocr_payload jsonb not null default '{}'::jsonb;
alter table public.invoices add column if not exists uploaded_by uuid;
alter table public.invoices add column if not exists approved_by uuid;
alter table public.invoices add column if not exists approved_at timestamptz;
alter table public.invoices add column if not exists returned_by uuid;
alter table public.invoices add column if not exists returned_at timestamptz;
alter table public.invoices add column if not exists created_at timestamptz default now();
alter table public.invoices add column if not exists updated_at timestamptz default now();

-- Add foreign keys only if they do not already exist.
do $$
begin
  if not exists (select 1 from pg_constraint where conname='profiles_nursery_id_fkey') then
    alter table public.profiles add constraint profiles_nursery_id_fkey foreign key(nursery_id) references public.nurseries(id);
  end if;
  if not exists (select 1 from pg_constraint where conname='advance_allocations_advance_id_fkey') then
    alter table public.advance_allocations add constraint advance_allocations_advance_id_fkey foreign key(advance_id) references public.advances(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='advance_allocations_nursery_id_fkey') then
    alter table public.advance_allocations add constraint advance_allocations_nursery_id_fkey foreign key(nursery_id) references public.nurseries(id);
  end if;
  if not exists (select 1 from pg_constraint where conname='invoices_advance_allocation_id_fkey') then
    alter table public.invoices add constraint invoices_advance_allocation_id_fkey foreign key(advance_allocation_id) references public.advance_allocations(id);
  end if;
end $$;

-- 6) AUDIT LOGS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  nursery_id uuid references public.nurseries(id),
  screen text not null,
  action text not null,
  action_type text not null,
  entity_type text,
  entity_id text,
  details text,
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz default now()
);

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists advances_updated_at on public.advances;
create trigger advances_updated_at before update on public.advances for each row execute function public.set_updated_at();
drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices for each row execute function public.set_updated_at();
