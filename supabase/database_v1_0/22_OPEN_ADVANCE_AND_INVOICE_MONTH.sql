-- SAAMS V28 — السلفة المفتوحة + شهر الفاتورة واسم الفعالية
-- Safe to run more than once. Deletes and changes nothing existing.

-- سلفة مفتوحة: بدون مبلغ محدد لكل حضانة
alter table public.advances add column if not exists is_open_amount boolean not null default false;

-- الفاتورة لأي شهر (YYYY-MM) ولأي فعالية
alter table public.invoices add column if not exists invoice_month text;
alter table public.invoices add column if not exists activity_name text;
create index if not exists invoices_invoice_month_idx on public.invoices (invoice_month);

notify pgrst, 'reload schema';

select 'open_advance_and_invoice_month_ready' as status,
       (select count(*) from public.advances) as advances,
       (select count(*) from public.invoices) as invoices;
