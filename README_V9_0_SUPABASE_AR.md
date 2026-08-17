# SAAMS v9.0 — خطوات ربط Supabase

## 1) تشغيل قاعدة البيانات

1. افتحي مشروع Supabase.
2. من القائمة اختاري **SQL Editor**.
3. افتحي الملف:
   `supabase/001_saams_core.sql`
4. انسخي محتواه كاملًا واضغطي **Run**.

الملف ينشئ:

- الحضانات.
- المستخدمين وملفاتهم الشخصية.
- السلف وتوزيعها.
- الفواتير.
- سجل العمليات.
- مخزن خاص وآمن لمرفقات الفواتير.
- سياسات RLS التي تمنع الحضانة من رؤية بيانات حضانة أخرى.

## 2) إضافة مفتاح الخادم في Vercel

في Vercel > Settings > Environment Variables أضيفي:

`SUPABASE_SERVICE_ROLE_KEY`

القيمة موجودة في Supabase:

Project Settings > API Keys > Secret keys / service_role

ضعيه في:

- Production
- Preview

مهم جدًا: لا تضيفي هذا المفتاح باسم يبدأ بـ VITE، ولا ترسليه في المحادثة.

## 3) إنشاء أول حساب مدير نظام

من Supabase:

1. Auth > Users > Add user.
2. Email:
   `munira@saams.local`
3. Password: اختاري كلمة مرور قوية.
4. فعلي Auto Confirm User.
5. انسخي UUID الخاص بالمستخدم.

بعدها شغلي هذا الأمر في SQL Editor بعد استبدال UUID:

```sql
insert into public.profiles
(id, username, full_name, role, permissions, active)
values
(
  'ضعي-هنا-UUID-المستخدم',
  'munira',
  'منيرة الأحمد',
  'super_admin',
  '{"dashboard":true,"executive":true,"invoices":true,"assets":true,"advances":true,"reports":true,"attachments":true,"users":true,"settings":true}'::jsonb,
  true
);
```

بعدها تسجيل الدخول في SAAMS يكون:

- اسم المستخدم: `munira`
- كلمة المرور: نفس كلمة المرور التي أنشأتها في Supabase.

## 4) الرفع

ارفعي المشروع كاملًا إلى GitHub ثم انتظري Vercel حتى يصبح Ready.

## ما أصبح مرتبطًا في هذه المرحلة

- تسجيل الدخول الحقيقي عبر Supabase Auth.
- تحميل وحفظ الفواتير.
- اعتماد وإرجاع الفواتير.
- حفظ الفاتورة وإيصال البطاقة في Storage خاص.
- تحميل وإنشاء وإغلاق السلف.
- رصيد السلفة يُحسب من الفواتير المعتمدة.

## ما سيبقى للمرحلة التالية

- الأصول وطلبات النقل والفائض والإسقاط.
- المستخدمون من شاشة النظام عبر API.
- سجل العمليات الكامل في Supabase.
- التقارير والمساعد الذكي من البيانات الحقيقية.
