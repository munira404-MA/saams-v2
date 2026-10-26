-- SAAMS V13 — تنظيف شاشة طلبات الأصول قبل التشغيل الفعلي
-- Runs ONCE only. If it is run again later it does nothing, so real requests are never deleted by mistake.
-- Before deleting, every request (and its activity rows) is copied to the private schema saams_private.
-- Assets themselves are NOT touched.

begin;

create schema if not exists saams_private;
revoke all on schema saams_private from public, anon, authenticated;

create table if not exists saams_private.reset_runs (
  reset_key text primary key,
  completed_at timestamptz not null default now()
);
create table if not exists saams_private.asset_requests_backup_v13 (like public.asset_requests including defaults);
alter table saams_private.asset_requests_backup_v13 add column if not exists backed_up_at timestamptz not null default now();
create table if not exists saams_private.asset_request_audit_backup_v13 (like public.audit_logs including defaults);
alter table saams_private.asset_request_audit_backup_v13 add column if not exists backed_up_at timestamptz not null default now();
revoke all on all tables in schema saams_private from public, anon, authenticated;

lock table saams_private.reset_runs in exclusive mode;

do $$
declare
  v_requests int;
  v_logs int;
begin
  if exists (select 1 from saams_private.reset_runs where reset_key = 'clear_test_asset_requests_v13') then
    raise notice 'Already done before — nothing deleted. Real requests are preserved.';
    return;
  end if;

  insert into saams_private.asset_requests_backup_v13 select r.*, now() from public.asset_requests r;
  get diagnostics v_requests = row_count;

  insert into saams_private.asset_request_audit_backup_v13
  select l.*, now() from public.audit_logs l
  where l.entity_type in ('asset_request', 'asset_request_incoming');
  get diagnostics v_logs = row_count;

  delete from public.audit_logs where entity_type in ('asset_request', 'asset_request_incoming');
  delete from public.asset_requests;

  insert into saams_private.reset_runs(reset_key) values ('clear_test_asset_requests_v13');
  raise notice 'Cleared % request(s) and % related activity row(s). Backup kept in saams_private.', v_requests, v_logs;
end $$;

commit;

select
  (select count(*) from public.asset_requests) as requests_now,
  (select count(*) from saams_private.asset_requests_backup_v13) as requests_backed_up,
  (select count(*) from saams_private.asset_request_audit_backup_v13) as activity_rows_backed_up;
