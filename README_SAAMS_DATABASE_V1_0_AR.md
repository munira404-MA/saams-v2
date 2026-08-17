# SAAMS Database V1.0

هذه الحزمة مصممة خصيصًا لقاعدة البيانات الحالية عندج، وتحافظ على أسماء الأعمدة الموجودة:

- `nurseries.active`
- `profiles.permissions`
- `invoices.vat_amount`
- `invoices.total_amount`
- `invoices.advance_allocation_id`

## ترتيب التشغيل في Supabase SQL Editor

شغّلي الملفات واحدًا واحدًا بهذا الترتيب:

1. `01_PRECHECK_READ_ONLY.sql` — فحص فقط، لا يغير البيانات.
2. `02_UPGRADE_EXISTING_DATABASE.sql` — يضيف النواقص والعلاقات بأمان.
3. `03_SECURITY_AND_STORAGE.sql` — RLS وسياسات التخزين الخاص.
4. `04_VIEWS_AND_INDEXES.sql` — View أرصدة السلف والفهارس.
5. `05_VERIFY_READ_ONLY.sql` — التحقق النهائي.
6. `06_SEED_NURSERIES_OPTIONAL.sql` — اختياري، لإكمال قائمة الحضانات بدون تكرار.

## النتيجة الصحيحة في ملف التحقق

- `tables` = 6
- `invoice_amount_columns` = 4
- `profiles_permissions` = 1
- `advance_balances_view` = 1
- `storage_bucket` = 1

## مهم

- لا تشغلي الملف الموجود باسم `ARCHIVE_OLD_001_saams_core_DO_NOT_RUN.sql`؛ تم الاحتفاظ به فقط كمرجع.
- لا يوجد في ملفات V1.0 أي أمر يحذف الجداول أو بيانات الفواتير والحضانات.
- سياسات RLS الجديدة تبدأ باسم `saams_` حتى لا تتعارض مع السياسات القديمة.
- تم تعديل كود التطبيق ليستخدم `vat_amount` و`total_amount` المطابقين لقاعدة البيانات الحالية.
