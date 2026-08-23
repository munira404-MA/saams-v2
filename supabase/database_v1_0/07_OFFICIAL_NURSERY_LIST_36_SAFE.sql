-- SAAMS — Official nursery master list (36)
-- SAFE: preserves nursery IDs and therefore preserves linked invoices, advances, assets and users.
-- Run once in Supabase SQL Editor after taking a backup.

begin;
-- Rename: اللؤلؤية -> مركز اللؤلؤية للطفولة المبكرة
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'اللؤلؤية')
     AND EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'مركز اللؤلؤية للطفولة المبكرة') THEN
    RAISE EXCEPTION 'Both old and new nursery rows exist: اللؤلؤية / مركز اللؤلؤية للطفولة المبكرة. Stop and review before merging.';
  END IF;
END $$;
UPDATE public.nurseries SET name_ar='مركز اللؤلؤية للطفولة المبكرة', name_en='Al Luluyah Early Childhood Center', active=true WHERE name_ar='اللؤلؤية';
-- Rename: السيوح -> مركز السيوح للطفولة المبكرة
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'السيوح')
     AND EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'مركز السيوح للطفولة المبكرة') THEN
    RAISE EXCEPTION 'Both old and new nursery rows exist: السيوح / مركز السيوح للطفولة المبكرة. Stop and review before merging.';
  END IF;
END $$;
UPDATE public.nurseries SET name_ar='مركز السيوح للطفولة المبكرة', name_en='Al Suyoh Early Childhood Center', active=true WHERE name_ar='السيوح';
-- Rename: الرحمانية -> مركز الرحمانية للطفولة المبكرة
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'الرحمانية')
     AND EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'مركز الرحمانية للطفولة المبكرة') THEN
    RAISE EXCEPTION 'Both old and new nursery rows exist: الرحمانية / مركز الرحمانية للطفولة المبكرة. Stop and review before merging.';
  END IF;
END $$;
UPDATE public.nurseries SET name_ar='مركز الرحمانية للطفولة المبكرة', name_en='Al Rahmaniya Early Childhood Center', active=true WHERE name_ar='الرحمانية';
-- Rename: البستان -> مركز البستان للطفولة المبكرة
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'البستان')
     AND EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'مركز البستان للطفولة المبكرة') THEN
    RAISE EXCEPTION 'Both old and new nursery rows exist: البستان / مركز البستان للطفولة المبكرة. Stop and review before merging.';
  END IF;
END $$;
UPDATE public.nurseries SET name_ar='مركز البستان للطفولة المبكرة', name_en='Al Bustan Early Childhood Center', active=true WHERE name_ar='البستان';
-- Rename: كلباء -> مركز كلباء للطفولة المبكرة
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'كلباء')
     AND EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'مركز كلباء للطفولة المبكرة') THEN
    RAISE EXCEPTION 'Both old and new nursery rows exist: كلباء / مركز كلباء للطفولة المبكرة. Stop and review before merging.';
  END IF;
END $$;
UPDATE public.nurseries SET name_ar='مركز كلباء للطفولة المبكرة', name_en='Kalba Early Childhood Center', active=true WHERE name_ar='كلباء';
-- Rename: الساف -> الغيل
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'الساف')
     AND EXISTS (SELECT 1 FROM public.nurseries WHERE name_ar = 'الغيل') THEN
    RAISE EXCEPTION 'Both old and new nursery rows exist: الساف / الغيل. Stop and review before merging.';
  END IF;
END $$;
UPDATE public.nurseries SET name_ar='الغيل', name_en='Al Ghail', active=true WHERE name_ar='الساف';
-- Ensure all official active nurseries exist.
insert into public.nurseries (name_ar,name_en,active) values
('الرحمانية الجديدة','New Al Rahmaniya',true),
('مركز اللؤلؤية للطفولة المبكرة','Al Luluyah Early Childhood Center',true),
('مركز السيوح للطفولة المبكرة','Al Suyoh Early Childhood Center',true),
('واسط 2','Wasit 2',true),
('مركز الرحمانية للطفولة المبكرة','Al Rahmaniya Early Childhood Center',true),
('البديع','Al Badie',true),
('اللية','Al Liyah',true),
('القليعة','Al Qulaya',true),
('مركز البستان للطفولة المبكرة','Al Bustan Early Childhood Center',true),
('مركز كلباء للطفولة المبكرة','Kalba Early Childhood Center',true),
('الغيل','Al Ghail',true),
('الطيبة','Al Taybah',true),
('الحرس الأميري','Amiri Guard',true),
('الحمرية','Al Hamriyah',true),
('المدينة الباسمة','Al Madina Al Basima',true),
('الشرطي الصغير','Little Policeman',true),
('الثميد','Al Thameed',true),
('سهيلة','Suhaila',true),
('سهيلة الجديدة','New Suhaila',true),
('البرير','Al Barir',true),
('مليحة','Mleiha',true),
('القادسية','Al Qadisiyah',true),
('دبا الحصن','Dibba Al Hisn',true),
('السياقة','Driving',true),
('الشارقة النموذجية','Sharjah Model',true),
('مغيدر','Mughaidir',true),
('الشيماء','Al Shaimaa',true),
('المستقبل','Al Mustaqbal',true),
('غرفتي الصغيرة','My Little Room',true),
('جميلة','Jameela',true),
('الباحثة','Al Bahitha',true),
('النحوة','Al Nahwa',true),
('جامعة خورفكان','University of Khorfakkan',true),
('جامعة كلباء','University of Kalba',true),
('وادي الحلو','Wadi Al Helo',true),
('شيص','Shees',true)
on conflict (name_ar) do update set name_en=excluded.name_en, active=true;
-- Closed nurseries remain for history but become inactive.
update public.nurseries set active=false where name_ar in ('واسط','جمانة','أم الفضل');

commit;

-- Verification
select name_ar,name_en,active from public.nurseries order by active desc,name_ar;
select count(*) as active_official_nurseries from public.nurseries where active=true and name_ar in (
  'الرحمانية الجديدة',
  'مركز اللؤلؤية للطفولة المبكرة',
  'مركز السيوح للطفولة المبكرة',
  'واسط 2',
  'مركز الرحمانية للطفولة المبكرة',
  'البديع',
  'اللية',
  'القليعة',
  'مركز البستان للطفولة المبكرة',
  'مركز كلباء للطفولة المبكرة',
  'الغيل',
  'الطيبة',
  'الحرس الأميري',
  'الحمرية',
  'المدينة الباسمة',
  'الشرطي الصغير',
  'الثميد',
  'سهيلة',
  'سهيلة الجديدة',
  'البرير',
  'مليحة',
  'القادسية',
  'دبا الحصن',
  'السياقة',
  'الشارقة النموذجية',
  'مغيدر',
  'الشيماء',
  'المستقبل',
  'غرفتي الصغيرة',
  'جميلة',
  'الباحثة',
  'النحوة',
  'جامعة خورفكان',
  'جامعة كلباء',
  'وادي الحلو',
  'شيص'
);
