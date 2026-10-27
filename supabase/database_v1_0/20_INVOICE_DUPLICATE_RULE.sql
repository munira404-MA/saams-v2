-- SAAMS V14 — قاعدة تكرار الفواتير
-- الفاتورة مكررة فقط إذا تطابقت الأربعة: اسم المورد + رقم الفاتورة + التاريخ + المبلغ.
-- Safe to run more than once. Deletes no invoices.
--
-- 1) Removes any older UNIQUE rule on invoices that blocks by invoice number and/or supplier alone
--    (e.g. unique(nursery_id, invoice_number)) — this is what rejected valid invoices.
-- 2) Adds the new four-field unique rule, but only if the current data has no such duplicates;
--    otherwise it lists them and leaves the data untouched.

begin;

do $$
declare
  r record;
begin
  -- Unique constraints (not the primary key) that involve invoice_number or supplier_name.
  for r in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.invoices'::regclass
      and c.contype = 'u'
      and a.attname in ('invoice_number', 'supplier_name')
    group by c.conname
  loop
    execute format('alter table public.invoices drop constraint %I', r.conname);
    raise notice 'Dropped old unique constraint: %', r.conname;
  end loop;

  -- Stand-alone unique indexes on invoice_number / supplier_name (except the new V14 index).
  for r in
    select i.relname as index_name
    from pg_index x
    join pg_class i on i.oid = x.indexrelid
    where x.indrelid = 'public.invoices'::regclass
      and x.indisunique and not x.indisprimary
      and i.relname <> 'invoices_duplicate_rule_v14'
      and not exists (select 1 from pg_constraint c where c.conindid = x.indexrelid)
      and (pg_get_indexdef(x.indexrelid) ilike '%invoice_number%' or pg_get_indexdef(x.indexrelid) ilike '%supplier_name%')
  loop
    execute format('drop index public.%I', r.index_name);
    raise notice 'Dropped old unique index: %', r.index_name;
  end loop;
end $$;

-- Same normalisation as the app (spaces/case; Arabic letter variants).
create or replace function public.saams_norm_supplier(v text)
returns text language sql immutable as $$
  select lower(btrim(regexp_replace(
           translate(regexp_replace(coalesce(v, ''), '[ًٌٍَُِّْـ]', '', 'g'), 'أإآىة', 'ااايه'),
         '\s+', ' ', 'g')))
$$;
create or replace function public.saams_norm_invoice_number(v text)
returns text language sql immutable as $$
  select lower(regexp_replace(coalesce(v, ''), '\s+', '', 'g'))
$$;

do $$
declare
  v_dupes int;
begin
  select count(*) into v_dupes from (
    select 1
    from public.invoices
    where coalesce(btrim(invoice_number), '') <> '' and coalesce(btrim(supplier_name), '') <> ''
    group by public.saams_norm_supplier(supplier_name), public.saams_norm_invoice_number(invoice_number),
             invoice_date, round(coalesce(total_amount, 0)::numeric, 2)
    having count(*) > 1
  ) d;
  if v_dupes > 0 then
    raise notice '% group(s) of identical invoices already exist (see the list below). The new database rule was NOT added; the app check still works. Review/delete the copies, then run this file again.', v_dupes;
  else
    execute $i$
      create unique index if not exists invoices_duplicate_rule_v14 on public.invoices (
        public.saams_norm_supplier(supplier_name),
        public.saams_norm_invoice_number(invoice_number),
        coalesce(invoice_date, '1900-01-01'::date),
        round(coalesce(total_amount, 0)::numeric, 2)
      )
      where coalesce(btrim(invoice_number), '') <> '' and coalesce(btrim(supplier_name), '') <> ''
    $i$;
  end if;
end $$;

commit;

notify pgrst, 'reload schema';

-- Result
select
  case when to_regclass('public.invoices_duplicate_rule_v14') is not null
       then 'invoice_duplicate_rule_ready' else 'invoice_duplicate_rule_waiting_for_review' end as status,
  (select count(*) from public.invoices) as total_invoices;

-- Existing identical invoices (empty = none)
select supplier_name, invoice_number, invoice_date, total_amount, count(*) as copies
from public.invoices
where coalesce(btrim(invoice_number), '') <> '' and coalesce(btrim(supplier_name), '') <> ''
group by public.saams_norm_supplier(supplier_name), public.saams_norm_invoice_number(invoice_number),
         invoice_date, round(coalesce(total_amount, 0)::numeric, 2), supplier_name, invoice_number, total_amount
having count(*) > 1;
