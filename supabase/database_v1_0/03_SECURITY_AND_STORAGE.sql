-- SAAMS Database V1.0 — 03 Security and Storage

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select role='super_admin' and active from public.profiles where id=auth.uid()),false);
$$;

create or replace function public.has_page_permission(page_name text)
returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select active and (role='super_admin' or (role='admin' and coalesce((permissions->>page_name)::boolean,false))) from public.profiles where id=auth.uid()),false);
$$;

create or replace function public.current_nursery_id()
returns uuid language sql stable security definer set search_path=public as $$
  select nursery_id from public.profiles where id=auth.uid() and active;
$$;

alter table public.nurseries enable row level security;
alter table public.profiles enable row level security;
alter table public.advances enable row level security;
alter table public.advance_allocations enable row level security;
alter table public.invoices enable row level security;
alter table public.audit_logs enable row level security;

-- Drop only SAAMS-named policies, then recreate them idempotently.
drop policy if exists saams_nurseries_select on public.nurseries;
create policy saams_nurseries_select on public.nurseries for select to authenticated using (active or public.is_super_admin());
drop policy if exists saams_nurseries_manage on public.nurseries;
create policy saams_nurseries_manage on public.nurseries for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists saams_profiles_select on public.profiles;
create policy saams_profiles_select on public.profiles for select to authenticated using (id=auth.uid() or public.is_super_admin() or public.has_page_permission('users'));
drop policy if exists saams_profiles_update_self on public.profiles;
create policy saams_profiles_update_self on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

drop policy if exists saams_advances_select on public.advances;
create policy saams_advances_select on public.advances for select to authenticated using (
  public.has_page_permission('advances') or exists(select 1 from public.advance_allocations aa where aa.advance_id=advances.id and aa.nursery_id=public.current_nursery_id())
);
drop policy if exists saams_advances_manage on public.advances;
create policy saams_advances_manage on public.advances for all to authenticated using (public.has_page_permission('advances')) with check (public.has_page_permission('advances'));

drop policy if exists saams_allocations_select on public.advance_allocations;
create policy saams_allocations_select on public.advance_allocations for select to authenticated using (public.has_page_permission('advances') or nursery_id=public.current_nursery_id());
drop policy if exists saams_allocations_manage on public.advance_allocations;
create policy saams_allocations_manage on public.advance_allocations for all to authenticated using (public.has_page_permission('advances')) with check (public.has_page_permission('advances'));

drop policy if exists saams_invoices_select on public.invoices;
create policy saams_invoices_select on public.invoices for select to authenticated using (public.has_page_permission('invoices') or nursery_id=public.current_nursery_id());
drop policy if exists saams_invoices_insert on public.invoices;
create policy saams_invoices_insert on public.invoices for insert to authenticated with check (public.has_page_permission('invoices') or nursery_id=public.current_nursery_id());
drop policy if exists saams_invoices_update on public.invoices;
create policy saams_invoices_update on public.invoices for update to authenticated using (public.has_page_permission('invoices') or (nursery_id=public.current_nursery_id() and status in ('review','returned'))) with check (public.has_page_permission('invoices') or nursery_id=public.current_nursery_id());

drop policy if exists saams_audit_insert on public.audit_logs;
create policy saams_audit_insert on public.audit_logs for insert to authenticated with check (user_id=auth.uid());
drop policy if exists saams_audit_select on public.audit_logs;
create policy saams_audit_select on public.audit_logs for select to authenticated using (public.is_super_admin() or public.has_page_permission('settings') or user_id=auth.uid() or nursery_id=public.current_nursery_id());

insert into storage.buckets(id,name,public) values('saams-invoices','saams-invoices',false)
on conflict(id) do update set public=false;

drop policy if exists saams_invoice_files_select on storage.objects;
create policy saams_invoice_files_select on storage.objects for select to authenticated using (bucket_id='saams-invoices' and (public.has_page_permission('invoices') or (storage.foldername(name))[1]=public.current_nursery_id()::text));
drop policy if exists saams_invoice_files_insert on storage.objects;
create policy saams_invoice_files_insert on storage.objects for insert to authenticated with check (bucket_id='saams-invoices' and (public.has_page_permission('invoices') or (storage.foldername(name))[1]=public.current_nursery_id()::text));
drop policy if exists saams_invoice_files_update on storage.objects;
create policy saams_invoice_files_update on storage.objects for update to authenticated using (bucket_id='saams-invoices' and (public.has_page_permission('invoices') or (storage.foldername(name))[1]=public.current_nursery_id()::text));
