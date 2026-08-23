-- SAAMS Production Clean — 08 Test Data Cleanup Preview (READ ONLY)
-- آمن 100%: لا يحذف ولا يعدل أي بيانات.
-- الهدف: معاينة بيانات الاختبار التشغيلية قبل التنظيف الرسمي.

-- 1) Summary counts
select 'invoices' as item, count(*)::bigint as total from public.invoices
union all
select 'advance_allocations', count(*)::bigint from public.advance_allocations
union all
select 'advances', count(*)::bigint from public.advances
union all
select 'audit_logs', count(*)::bigint from public.audit_logs
union all
select 'nurseries_all', count(*)::bigint from public.nurseries
union all
select 'nurseries_active', count(*)::bigint from public.nurseries where active=true
union all
select 'profiles', count(*)::bigint from public.profiles
order by item;

-- 2) Invoices by nursery + status
select
  n.name_ar as nursery,
  i.status,
  count(*) as invoice_count,
  coalesce(sum(i.total_amount),0)::numeric(14,2) as total_amount
from public.invoices i
left join public.nurseries n on n.id=i.nursery_id
group by n.name_ar,i.status
order by n.name_ar,i.status;

-- 3) All current invoices (for visual review)
select
  i.id,
  n.name_ar as nursery,
  a.name_ar as advance_name,
  i.invoice_number,
  i.supplier_name,
  i.invoice_date,
  i.total_amount,
  i.status,
  i.created_at
from public.invoices i
left join public.nurseries n on n.id=i.nursery_id
left join public.advance_allocations aa on aa.id=i.advance_allocation_id
left join public.advances a on a.id=aa.advance_id
order by i.created_at,n.name_ar,i.invoice_number;

-- 4) Advances and allocations currently in database
select
  a.id as advance_id,
  a.code,
  a.name_ar as advance_name,
  a.advance_type,
  a.status,
  a.date_from,
  a.date_to,
  count(aa.id) as nursery_allocations,
  coalesce(sum(aa.allocated),0)::numeric(14,2) as allocated_total,
  a.created_at
from public.advances a
left join public.advance_allocations aa on aa.advance_id=a.id
group by a.id,a.code,a.name_ar,a.advance_type,a.status,a.date_from,a.date_to,a.created_at
order by a.created_at,a.name_ar;

-- 5) Allocations by nursery
select
  a.name_ar as advance_name,
  n.name_ar as nursery,
  aa.allocated,
  aa.created_at
from public.advance_allocations aa
join public.advances a on a.id=aa.advance_id
join public.nurseries n on n.id=aa.nursery_id
order by a.created_at,n.name_ar;

-- 6) Audit log count by entity/action (test history only; no deletion here)
select
  coalesce(entity_type,'(none)') as entity_type,
  action_type,
  count(*) as log_count
from public.audit_logs
group by coalesce(entity_type,'(none)'),action_type
order by entity_type,action_type;

-- 7) Safety check: official active nursery count should remain 36
select count(*) as official_active_nurseries
from public.nurseries
where active=true and name_ar in (
  'الرحمانية الجديدة','مركز اللؤلؤية للطفولة المبكرة','مركز السيوح للطفولة المبكرة','واسط 2',
  'مركز الرحمانية للطفولة المبكرة','البديع','اللية','القليعة','مركز البستان للطفولة المبكرة',
  'مركز كلباء للطفولة المبكرة','الغيل','الطيبة','الحرس الأميري','الحمرية','المدينة الباسمة',
  'الشرطي الصغير','الثميد','سهيلة','سهيلة الجديدة','البرير','مليحة','القادسية','دبا الحصن',
  'السياقة','الشارقة النموذجية','مغيدر','الشيماء','المستقبل','غرفتي الصغيرة','جميلة','الباحثة',
  'النحوة','جامعة خورفكان','جامعة كلباء','وادي الحلو','شيص'
);
