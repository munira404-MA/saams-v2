-- SAAMS Database V1.0 — 06 Nursery Seed (OPTIONAL)
-- يمكن تشغيله أكثر من مرة، ولن يكرر الأسماء الموجودة.

insert into public.nurseries(name_ar,name_en) values
('الرحمانية الجديدة','New Al Rahmaniya'),('اللؤلؤية','Al Luluyah'),('السيوح','Al Suyoh'),('واسط 2','Wasit 2'),
('الرحمانية','Al Rahmaniya'),('البديع','Al Badie'),('اللية','Al Liyah'),('القليعة','Al Qulaya'),('البستان','Al Bustan'),
('كلباء','Kalba'),('الساف','Al Saf'),('الطيبة','Al Taybah'),('الحرس الأميري','Amiri Guard'),('الحمرية','Al Hamriyah'),
('المدينة الباسمة','Al Madina Al Basma'),('الشرطي الصغير','Little Policeman'),('الثميد','Al Thameed'),('سهيلة','Suhaila'),
('سهيلة الجديدة','New Suhaila'),('البرير','Al Brayer'),('مليحة','Mleiha'),('القادسية','Al Qadisiyah'),('دبا الحصن','Dibba Al Hisn'),
('السياقة','Driving'),('الشارقة النموذجية','Sharjah Model'),('مغيدر','Mughaidir'),('واسط','Wasit'),('الشيماء','Al Shaimaa'),
('المستقبل','Al Mustaqbal'),('غرفتي الصغيرة','My Little Room'),('جمانة','Jumana'),('أم الفضل','Umm Al Fadl'),('جميلة','Jameela'),
('الباحثة','Al Bahitha'),('النحوة','Al Nahwa'),('جامعة خورفكان','University of Khorfakkan'),('جامعة كلباء','University of Kalba'),
('وادي الحلو','Wadi Al Helo'),('شيص','Shis')
on conflict(name_ar) do nothing;
