-- SAAMS V33 — الحضانات تحذف فواتيرها (المعادة، المرفوضة، والمرفوعة بالغلط)
-- Safe to run more than once. Deletes nothing by itself. Requires 14_INVOICE_DELETION.sql (already applied).
-- Nursery rule (own nursery only):
--   approved            → locked (only the administration can delete)
--   returned / rejected → can delete, even if it was approved earlier or the advance is closed
--   under review        → can delete while the advance is open
-- Every deletion is still written to the audit log.

create or replace function public.guard_saams_invoice_deletion()
returns trigger language plpgsql security definer set search_path = public as $fn$
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
    if old.status = 'approved' then
      raise exception 'INVOICE_DELETE_LOCKED' using errcode = '42501';
    end if;
    if old.status not in ('returned', 'rejected') and old.advance_allocation_id is not null then
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
$fn$;
revoke all on function public.guard_saams_invoice_deletion() from public, anon, authenticated;
drop trigger if exists saams_invoice_deletion_guard on public.invoices;
create trigger saams_invoice_deletion_guard before delete on public.invoices
  for each row execute function public.guard_saams_invoice_deletion();

notify pgrst, 'reload schema';

select 'nursery_invoice_delete_ready' as status,
       count(*) filter (where status in ('returned','rejected')) as returned_or_rejected,
       count(*) filter (where status = 'review') as under_review
from public.invoices;
