-- Account-specific contact data, managed by system administrators.
-- Does not change Supabase Auth email, username, password or permissions.
begin;
alter table public.profiles add column if not exists contact_email text;
alter table public.profiles add column if not exists job_title_ar text;
alter table public.profiles add column if not exists job_title_en text;

create or replace function public.guard_saams_profile_contact_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and not public.is_super_admin() and
    (new.contact_email is distinct from old.contact_email
     or new.job_title_ar is distinct from old.job_title_ar
     or new.job_title_en is distinct from old.job_title_en) then
    raise exception 'PROFILE_CONTACT_ADMIN_REQUIRED' using errcode='42501';
  end if;
  if length(coalesce(new.contact_email,''))>254
     or length(coalesce(new.job_title_ar,''))>200
     or length(coalesce(new.job_title_en,''))>200 then
    raise exception 'PROFILE_FIELD_TOO_LONG' using errcode='22001';
  end if;
  return new;
end $$;
revoke all on function public.guard_saams_profile_contact_fields() from public,anon,authenticated;
drop trigger if exists saams_profile_contact_guard on public.profiles;
create trigger saams_profile_contact_guard before update on public.profiles
for each row execute function public.guard_saams_profile_contact_fields();
commit;

select username,full_name,contact_email,job_title_ar,job_title_en from public.profiles order by username;
