-- SAAMS Database V1.0 — 01 Preflight (READ ONLY)
-- هذا الملف لا يعدل ولا يحذف أي بيانات.

select 'nurseries' as table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='nurseries'
union all
select 'profiles', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='profiles'
union all
select 'invoices', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='invoices'
union all
select 'advances', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='advances'
union all
select 'advance_allocations', column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='advance_allocations'
order by table_name, column_name;
