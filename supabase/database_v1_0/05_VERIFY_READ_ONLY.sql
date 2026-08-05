-- SAAMS Database V1.0 — 05 Verification (READ ONLY)

select 'tables' test, count(*)::text result
from information_schema.tables
where table_schema='public' and table_name in ('nurseries','profiles','advances','advance_allocations','invoices','audit_logs')
union all
select 'invoice_amount_columns', count(*)::text
from information_schema.columns
where table_schema='public' and table_name='invoices' and column_name in ('subtotal','vat_amount','total_amount','advance_allocation_id')
union all
select 'profiles_permissions', count(*)::text
from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name='permissions'
union all
select 'advance_balances_view', count(*)::text
from information_schema.views
where table_schema='public' and table_name='advance_balances'
union all
select 'storage_bucket', count(*)::text
from storage.buckets where id='saams-invoices';

select schemaname, tablename, policyname
from pg_policies
where schemaname in ('public','storage') and policyname like 'saams_%'
order by schemaname,tablename,policyname;
