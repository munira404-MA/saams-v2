-- =========================================================
-- SAAMS v9.0 - Supabase Core Database
-- Run once in Supabase Dashboard > SQL Editor
-- =========================================================

create extension if not exists pgcrypto;

-- ---------- Core master data ----------
create table if not exists public.nurseries (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  name_en text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  role text not null check (role in ('super_admin','admin','nursery')),
  nursery_id uuid references public.nurseries(id),
  permissions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Advances ----------
create table if not exists public.advances (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_ar text not null,
  name_en text,
  advance_type text not null check (advance_type in ('monthly','event','emergency')),
  date_from date,
  date_to date,
  status text not null default 'draft' check (status in ('draft','open','closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advance_allocations (
  id uuid primary key default gen_random_uuid(),
  advance_id uuid not null references public.advances(id) on delete cascade,
  nursery_id uuid not null references public.nurseries(id),
  allocated numeric(14,2) not null check (allocated >= 0),
  created_at timestamptz not null default now(),
  unique (advance_id, nursery_id)
);

-- ---------- Invoices ----------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  nursery_id uuid not null references public.nurseries(id),
  advance_allocation_id uuid references public.advance_allocations(id),
  supplier_name text not null,
  invoice_date date,
  subtotal numeric(14,2) not null default 0,
  vat numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  trn text,
  payment_method text check (payment_method in ('cash','card')),
  status text not null default 'review' check (status in ('review','approved','returned','rejected')),
  return_reason text,
  attachment_path text,
  receipt_path text,
  ocr_payload jsonb not null default '{}'::jsonb,
  uploaded_by uuid references public.profiles(id),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  returned_by uuid references public.profiles(id),
  returned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (nursery_id, invoice_number)
);

-- ---------- Audit ----------
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
  created_at timestamptz not null default now()
);

-- ---------- Updated-at trigger ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists advances_updated_at on public.advances;
create trigger advances_updated_at before update on public.advances
for each row execute function public.set_updated_at();

drop trigger if exists invoices_updated_at on public.invoices;
create trigger invoices_updated_at before update on public.invoices
for each row execute function public.set_updated_at();

-- ---------- Helper functions ----------
create or replace function public.current_profile()
returns public.profiles
language sql stable security definer
set search_path = public
as $$
  select p from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' and active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.has_page_permission(page_name text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((
    select active and (
      role = 'super_admin'
      or (role = 'admin' and coalesce((permissions ->> page_name)::boolean, false))
    )
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

create or replace function public.current_nursery_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select nursery_id from public.profiles where id = auth.uid() and active;
$$;

-- ---------- RLS ----------
alter table public.nurseries enable row level security;
alter table public.profiles enable row level security;
alter table public.advances enable row level security;
alter table public.advance_allocations enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "nurseries_select" on public.nurseries;
create policy "nurseries_select" on public.nurseries
for select to authenticated using (active or public.is_super_admin());

drop policy if exists "nurseries_manage" on public.nurseries;
create policy "nurseries_manage" on public.nurseries
for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated using (
  id = auth.uid() or public.is_super_admin() or public.has_page_permission('users')
);

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "advances_select" on public.advances;
create policy "advances_select" on public.advances
for select to authenticated using (
  public.has_page_permission('advances')
  or exists (
    select 1
    from public.advance_allocations aa
    where aa.advance_id = advances.id
      and aa.nursery_id = public.current_nursery_id()
  )
);

drop policy if exists "advances_manage" on public.advances;
create policy "advances_manage" on public.advances
for all to authenticated using (public.has_page_permission('advances'))
with check (public.has_page_permission('advances'));

drop policy if exists "allocations_select" on public.advance_allocations;
create policy "allocations_select" on public.advance_allocations
for select to authenticated using (
  public.has_page_permission('advances')
  or nursery_id = public.current_nursery_id()
);

drop policy if exists "allocations_manage" on public.advance_allocations;
create policy "allocations_manage" on public.advance_allocations
for all to authenticated using (public.has_page_permission('advances'))
with check (public.has_page_permission('advances'));

drop policy if exists "invoices_select" on public.invoices;
create policy "invoices_select" on public.invoices
for select to authenticated using (
  public.has_page_permission('invoices')
  or nursery_id = public.current_nursery_id()
);

drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices
for insert to authenticated with check (
  public.has_page_permission('invoices')
  or nursery_id = public.current_nursery_id()
);

drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices
for update to authenticated using (
  public.has_page_permission('invoices')
  or (nursery_id = public.current_nursery_id() and status in ('review','returned'))
) with check (
  public.has_page_permission('invoices')
  or nursery_id = public.current_nursery_id()
);

drop policy if exists "audit_insert" on public.audit_logs;
create policy "audit_insert" on public.audit_logs
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "audit_select" on public.audit_logs;
create policy "audit_select" on public.audit_logs
for select to authenticated using (
  public.is_super_admin()
  or public.has_page_permission('settings')
  or user_id = auth.uid()
  or nursery_id = public.current_nursery_id()
);

-- ---------- Private storage bucket ----------
insert into storage.buckets (id, name, public)
values ('saams-invoices', 'saams-invoices', false)
on conflict (id) do update set public = false;

drop policy if exists "invoice_files_select" on storage.objects;
create policy "invoice_files_select" on storage.objects
for select to authenticated using (
  bucket_id = 'saams-invoices'
  and (
    public.has_page_permission('invoices')
    or (storage.foldername(name))[1] = public.current_nursery_id()::text
  )
);

drop policy if exists "invoice_files_insert" on storage.objects;
create policy "invoice_files_insert" on storage.objects
for insert to authenticated with check (
  bucket_id = 'saams-invoices'
  and (
    public.has_page_permission('invoices')
    or (storage.foldername(name))[1] = public.current_nursery_id()::text
  )
);

drop policy if exists "invoice_files_update" on storage.objects;
create policy "invoice_files_update" on storage.objects
for update to authenticated using (
  bucket_id = 'saams-invoices'
  and (
    public.has_page_permission('invoices')
    or (storage.foldername(name))[1] = public.current_nursery_id()::text
  )
);

-- ---------- Seed nurseries ----------
insert into public.nurseries (name_ar, name_en) values
('الرحمانية الجديدة','New Al Rahmaniya'),
('اللؤلؤية','Al Luluyah'),
('السيوح','Al Suyoh'),
('واسط 2','Wasit 2'),
('الرحمانية','Al Rahmaniya'),
('البديع','Al Badie'),
('اللية','Al Liyah'),
('القليعة','Al Qulaya'),
('البستان','Al Bustan'),
('كلباء','Kalba'),
('الساف','Al Saf'),
('الطيبة','Al Taybah'),
('الحرس الأميري','Amiri Guard'),
('الحمرية','Al Hamriyah'),
('المدينة الباسمة','Al Madina Al Basma'),
('الشرطي الصغير','Little Policeman'),
('الثميد','Al Thameed'),
('سهيلة','Suhaila'),
('سهيلة الجديدة','New Suhaila'),
('البرير','Al Brayer'),
('مليحة','Mleiha'),
('القادسية','Al Qadisiyah'),
('دبا الحصن','Dibba Al Hisn'),
('السياقة','Driving'),
('الشارقة النموذجية','Sharjah Model'),
('مغيدر','Mughaidir'),
('واسط','Wasit'),
('الشيماء','Al Shaimaa'),
('المستقبل','Al Mustaqbal'),
('غرفتي الصغيرة','My Little Room'),
('جمانة','Jumana'),
('أم الفضل','Umm Al Fadl'),
('جميلة','Jameela'),
('الباحثة','Al Bahitha'),
('النحوة','Al Nahwa'),
('جامعة خورفكان','University of Khorfakkan'),
('جامعة كلباء','University of Kalba'),
('وادي الحلو','Wadi Al Helo'),
('شيص','Shis')
on conflict (name_ar) do nothing;

-- ---------- Useful view ----------
create or replace view public.advance_balances as
select
  aa.id as allocation_id,
  aa.advance_id,
  aa.nursery_id,
  aa.allocated,
  coalesce(sum(case when i.status = 'approved' then i.total else 0 end),0)::numeric(14,2) as spent,
  (aa.allocated - coalesce(sum(case when i.status = 'approved' then i.total else 0 end),0))::numeric(14,2) as remaining
from public.advance_allocations aa
left join public.invoices i on i.advance_allocation_id = aa.id
group by aa.id;

grant select on public.advance_balances to authenticated;
