-- Run after 02 and 03. Safe to rerun. No existing invoices are removed.
begin;

-- Guard every DELETE, including direct API calls and cascades. Audit failure rolls
-- back deletion. Lock the parent advance so closure and deletion serialize.
create or replace function public.guard_saams_invoice_deletion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  actor public.profiles%rowtype;
  allocation_nursery uuid;
  advance_state text;
  administrator boolean;
begin
  select * into actor from public.profiles where id = auth.uid() for share;
  if not found or actor.active is not true then
    raise exception 'INVOICE_DELETE_FORBIDDEN' using errcode = '42501';
  end if;
  administrator := coalesce(actor.role = 'super_admin' or
    (actor.role = 'admin' and coalesce((actor.permissions->>'invoices')::boolean, false)), false);
  if not administrator then
    if actor.role is distinct from 'nursery' or actor.nursery_id is null or
       old.nursery_id is distinct from actor.nursery_id then
      raise exception 'INVOICE_DELETE_FORBIDDEN' using errcode = '42501';
    end if;
    if old.status = 'approved' or old.approved_at is not null then
      raise exception 'INVOICE_DELETE_LOCKED' using errcode = '42501';
    end if;
    if old.advance_allocation_id is not null then
      select aa.nursery_id, a.status into allocation_nursery, advance_state
        from public.advance_allocations aa join public.advances a on a.id = aa.advance_id
        where aa.id = old.advance_allocation_id for update of aa, a;
      if not found or allocation_nursery is distinct from actor.nursery_id or
         advance_state is distinct from 'open' then
        raise exception 'INVOICE_DELETE_LOCKED' using errcode = '42501';
      end if;
    end if;
  end if;
  insert into public.audit_logs
    (user_id, nursery_id, screen, action, action_type, entity_type, entity_id, details, before_data, after_data)
  values
    (actor.id, old.nursery_id, 'الفواتير', 'حذف فاتورة', 'delete', 'invoice', old.id::text,
     old.invoice_number || ' — ' || old.total_amount::text || ' AED',
     to_jsonb(old) || jsonb_build_object('deleted_by_role', actor.role), null);
  return old;
end;
$$;
revoke all on function public.guard_saams_invoice_deletion() from public, anon, authenticated;
drop trigger if exists saams_invoice_deletion_guard on public.invoices;
create trigger saams_invoice_deletion_guard before delete on public.invoices
  for each row execute function public.guard_saams_invoice_deletion();

-- UUID-only RPC; no caller-supplied role, nursery, status or audit details.
create or replace function public.delete_saams_invoice(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'INVOICE_DELETE_FORBIDDEN' using errcode = '42501';
  end if;
  delete from public.invoices where id = p_invoice_id;
  if not found then
    raise exception 'INVOICE_NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.delete_saams_invoice(uuid) from public, anon;
grant execute on function public.delete_saams_invoice(uuid) to authenticated;

-- Existing self-update policy must not let nursery users promote themselves
-- before calling the deletion RPC. Ordinary profile edits remain available.
create or replace function public.guard_saams_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_super_admin() and
     (new.role is distinct from old.role or new.nursery_id is distinct from old.nursery_id
      or new.active is distinct from old.active or new.permissions is distinct from old.permissions) then
    raise exception 'PROFILE_PRIVILEGE_CHANGE_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_saams_profile_privileges() from public, anon, authenticated;
drop trigger if exists saams_profile_privileges_guard on public.profiles;
create trigger saams_profile_privileges_guard before update on public.profiles
  for each row execute function public.guard_saams_profile_privileges();

-- Do not let a nursery bypass deletion checks by detaching a closed allocation
-- or clearing approval fields through the existing invoice UPDATE policy.
create or replace function public.guard_saams_invoice_scope_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor public.profiles%rowtype;
begin
  select * into actor from public.profiles where id = auth.uid();
  if actor.role = 'nursery' and
     (new.nursery_id is distinct from old.nursery_id
      or new.advance_allocation_id is distinct from old.advance_allocation_id
      or new.approved_at is distinct from old.approved_at
      or new.approved_by is distinct from old.approved_by
      or old.status = 'approved' or new.status = 'approved') then
    raise exception 'INVOICE_SCOPE_CHANGE_FORBIDDEN' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_saams_invoice_scope_update() from public, anon, authenticated;
drop trigger if exists saams_invoice_scope_update_guard on public.invoices;
create trigger saams_invoice_scope_update_guard before update on public.invoices
  for each row execute function public.guard_saams_invoice_scope_update();
commit;
