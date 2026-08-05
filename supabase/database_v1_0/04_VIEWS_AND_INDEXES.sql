-- SAAMS Database V1.0 — 04 Views and Indexes

drop view if exists public.advance_balances;
create view public.advance_balances as
select aa.id allocation_id, aa.advance_id, aa.nursery_id, aa.allocated,
       coalesce(sum(case when i.status='approved' then i.total_amount else 0 end),0)::numeric(14,2) spent,
       (aa.allocated-coalesce(sum(case when i.status='approved' then i.total_amount else 0 end),0))::numeric(14,2) remaining
from public.advance_allocations aa
left join public.invoices i on i.advance_allocation_id=aa.id
group by aa.id;
grant select on public.advance_balances to authenticated;

create index if not exists idx_profiles_nursery on public.profiles(nursery_id);
create index if not exists idx_invoices_nursery on public.invoices(nursery_id);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_date on public.invoices(invoice_date);
create index if not exists idx_invoices_advance_allocation on public.invoices(advance_allocation_id);
create index if not exists idx_allocations_advance on public.advance_allocations(advance_id);
create index if not exists idx_allocations_nursery on public.advance_allocations(nursery_id);
create index if not exists idx_audit_created_at on public.audit_logs(created_at desc);
create index if not exists idx_audit_entity on public.audit_logs(entity_type,entity_id);
