-- SAAMS V30 — ربط كل الأصول بالحضانات
-- Safe to run more than once. Deletes nothing. Only fills nursery_id where it is EMPTY,
-- and only when the asset's location name matches exactly one nursery.
-- If the location columns do not exist in this database, the linking step is skipped.

do $fn$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='assets' and column_name='location_name_ar') then
    execute $q$
      update public.assets a
      set nursery_id = m.nursery_id
      from (
        select a2.id as asset_id, min(n.id::text)::uuid as nursery_id
        from public.assets a2
        join public.nurseries n
          on lower(btrim(n.name_ar)) in (lower(btrim(a2.location_name_ar)), lower(btrim(a2.location_name_en)))
          or lower(btrim(coalesce(n.name_en,''))) in (lower(btrim(a2.location_name_ar)), lower(btrim(a2.location_name_en)))
        where a2.nursery_id is null
        group by a2.id
        having count(distinct n.id) = 1
      ) m
      where a.id = m.asset_id and a.nursery_id is null
    $q$;
  end if;
end
$fn$;

notify pgrst, 'reload schema';

-- النتيجة: عدد الأصول لكل حضانة + الأصول غير المرتبطة
select coalesce(n.name_ar, '⚠ غير مرتبط بحضانة') as nursery,
       count(a.id) as assets
from public.assets a
left join public.nurseries n on n.id = a.nursery_id
group by n.name_ar
order by (n.name_ar is null) desc, n.name_ar;
