-- SAAMS Production Clean — 09 Clean Test Transaction Data
-- ⚠️ DESTRUCTIVE: Run ONLY after reviewing file 08 preview and confirming all current transactional data is test data.
-- Keeps: nurseries, profiles/users, permissions, assets (if any), database schema/configuration.
-- Deletes: invoice transactions, advance allocations, advances, and audit history created during testing.

begin;

-- Delete child transaction rows first.
delete from public.invoices;
delete from public.advance_allocations;
delete from public.advances;
delete from public.audit_logs;

commit;

-- Verification: all test transaction tables should now be empty.
select 'invoices' as item, count(*)::bigint as remaining from public.invoices
union all
select 'advance_allocations', count(*)::bigint from public.advance_allocations
union all
select 'advances', count(*)::bigint from public.advances
union all
select 'audit_logs', count(*)::bigint from public.audit_logs
order by item;

-- These MUST remain intact.
select 'nurseries_all' as item, count(*)::bigint as remaining from public.nurseries
union all
select 'nurseries_active', count(*)::bigint from public.nurseries where active=true
union all
select 'profiles', count(*)::bigint from public.profiles
order by item;
