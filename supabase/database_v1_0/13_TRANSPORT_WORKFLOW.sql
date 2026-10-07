-- SAAMS Production — Transport Workflow
-- Safe migration: adds transport workflow fields/policies without deleting production data.

alter table public.assets add column if not exists location_type text default 'nursery';
alter table public.assets add column if not exists location_name_ar text;
alter table public.assets add column if not exists location_name_en text;

alter table public.asset_requests add column if not exists transport_status text;
alter table public.asset_requests add column if not exists pickup_at timestamptz;
alter table public.asset_requests add column if not exists delivered_at timestamptz;
alter table public.asset_requests add column if not exists picked_up_by uuid references auth.users(id) on delete set null;
alter table public.asset_requests add column if not exists delivered_by uuid references auth.users(id) on delete set null;

alter table public.asset_requests drop constraint if exists asset_requests_transport_status_check;
alter table public.asset_requests add constraint asset_requests_transport_status_check
check (transport_status is null or transport_status in ('awaiting_pickup','in_transit','delivered')) not valid;

-- Expand request status to allow completed transfer tasks.
alter table public.asset_requests drop constraint if exists asset_requests_status_check;
alter table public.asset_requests add constraint asset_requests_status_check
check (status in ('pending','approved','returned','rejected','completed')) not valid;

-- Existing approved transfer requests become available to Transport Tasks.
update public.asset_requests
set transport_status='awaiting_pickup'
where request_type='transfer' and status='approved' and coalesce(transport_status,'')='';

-- Transport permission works through an Administration account with permissions.transport=true.
drop policy if exists asset_requests_select on public.asset_requests;
create policy asset_requests_select on public.asset_requests
for select to authenticated
using (
  created_by = auth.uid()
  or public.is_super_admin()
  or public.has_page_permission('assets')
  or public.has_page_permission('transport')
);

drop policy if exists asset_requests_admin_update on public.asset_requests;
create policy asset_requests_admin_update on public.asset_requests
for update to authenticated
using (
  public.is_super_admin()
  or public.has_page_permission('assets')
  or public.has_page_permission('transport')
)
with check (
  public.is_super_admin()
  or public.has_page_permission('assets')
  or public.has_page_permission('transport')
);

-- Transport users need to read/update the physical location after delivery.
drop policy if exists saams_assets_select on public.assets;
create policy saams_assets_select on public.assets for select to authenticated using (
  public.has_page_permission('assets') or public.has_page_permission('transport') or nursery_id=public.current_nursery_id()
);

drop policy if exists saams_assets_update on public.assets;
create policy saams_assets_update on public.assets for update to authenticated using (
  public.has_page_permission('assets') or public.has_page_permission('transport')
) with check (
  public.has_page_permission('assets') or public.has_page_permission('transport')
);

create index if not exists asset_requests_transport_status_idx on public.asset_requests(transport_status);

select
  'transport_workflow_ready' as status,
  count(*) filter (where request_type='transfer' and status='approved') as approved_waiting_transport,
  count(*) filter (where transport_status='in_transit') as in_transit,
  count(*) filter (where status='completed') as completed
from public.asset_requests;
