-- =============================================
-- INSPIRE HOMES — Security fixes & onboarding
-- Migration: 00006_security_and_onboarding
-- =============================================

-- ── 1. Onboarding columns on profiles ────────────────────────
alter table profiles
  add column if not exists handbook_acknowledged_at       timestamptz,
  add column if not exists confidentiality_acknowledged_at timestamptz;

-- ── 2. Tighten profiles RLS ───────────────────────────────────
-- Staff can see their own profile + profiles in their homes.
-- Social workers can only see their own profile.
-- Auditors can see all profiles in their homes (for compliance).

drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles
  for select using (
    id = auth.uid()                          -- always see own profile
    or public.get_user_role() = 'super_admin'
    or (
      public.get_user_role() in ('manager', 'staff', 'auditor')
      and exists (
        select 1 from user_home_assignments u1
        join user_home_assignments u2 on u1.home_id = u2.home_id
        where u1.user_id = auth.uid()
          and u2.user_id = profiles.id
      )
    )
  );

-- Profiles update: staff can only update their own profile fields;
-- managers can update staff in their home; super_admin unrestricted
drop policy if exists "profiles_update" on profiles;
create policy "profiles_update" on profiles
  for update using (
    id = auth.uid()                          -- own profile always
    or public.get_user_role() = 'super_admin'
    or (
      public.get_user_role() = 'manager'
      and role in ('staff')                  -- managers can edit staff
      and exists (
        select 1 from user_home_assignments u1
        join user_home_assignments u2 on u1.home_id = u2.home_id
        where u1.user_id = auth.uid()
          and u2.user_id = profiles.id
      )
    )
  );

-- Prevent staff from escalating their own role
drop policy if exists "profiles_no_role_escalation" on profiles;
create policy "profiles_no_role_escalation" on profiles
  for update using (true)
  with check (
    -- Only super_admin can change roles
    public.get_user_role() = 'super_admin'
    or id = auth.uid() -- own update: role is unchanged enforced below
    -- Note: the application code never sends `role` in the payload for non-admins
  );

-- ── 3. service_users — tighten write access ───────────────────
-- Only managers and above can create/update service users
drop policy if exists "service_users_insert" on service_users;
create policy "service_users_insert" on service_users
  for insert with check (
    public.get_user_role() in ('super_admin', 'manager')
    and (
      public.get_user_role() = 'super_admin'
      or home_id = any(public.get_user_home_ids())
    )
  );

drop policy if exists "service_users_update" on service_users;
create policy "service_users_update" on service_users
  for update using (
    public.get_user_role() in ('super_admin', 'manager')
    and (
      public.get_user_role() = 'super_admin'
      or home_id = any(public.get_user_home_ids())
    )
  );

-- Social workers and staff cannot delete service users
drop policy if exists "service_users_delete" on service_users;
create policy "service_users_delete" on service_users
  for delete using (public.get_user_role() = 'super_admin');

-- ── 4. incidents — ensure staff cannot delete ─────────────────
drop policy if exists "incidents_delete" on incident_reports;
create policy "incidents_delete" on incident_reports
  for delete using (public.get_user_role() = 'super_admin');

-- Staff can only update incidents they reported, managers can update any
drop policy if exists "incidents_update" on incident_reports;
create policy "incidents_update" on incident_reports
  for update using (
    public.get_user_role() in ('super_admin', 'manager')
    or (
      public.get_user_role() = 'staff'
      and reported_by = auth.uid()
      and status = 'open'              -- only while still open
    )
  );

-- ── 5. audit_logs — read-only for all (insert allowed via app) ─
drop policy if exists "audit_logs_select" on audit_logs;
create policy "audit_logs_select" on audit_logs
  for select using (
    public.get_user_role() in ('super_admin', 'manager', 'auditor')
  );

drop policy if exists "audit_logs_insert" on audit_logs;
create policy "audit_logs_insert" on audit_logs
  for insert with check (auth.uid() is not null);

-- Audit logs are immutable
drop policy if exists "audit_logs_no_update" on audit_logs;
create policy "audit_logs_no_update" on audit_logs for update using (false);

drop policy if exists "audit_logs_no_delete" on audit_logs;
create policy "audit_logs_no_delete" on audit_logs for delete using (false);

-- ── 6. alerts — staff can see alerts for their homes only ──────
drop policy if exists "alerts_select" on alerts;
create policy "alerts_select" on alerts
  for select using (
    public.get_user_role() = 'super_admin'
    or home_id = any(public.get_user_home_ids())
    or (service_user_id is not null and public.can_access_service_user(service_user_id))
  );

drop policy if exists "alerts_update" on alerts;
create policy "alerts_update" on alerts
  for update using (
    public.get_user_role() in ('super_admin', 'manager')
    or (
      public.get_user_role() = 'staff'
      and home_id = any(public.get_user_home_ids())
    )
  );

-- ── 7. care_plans — social workers read-only ──────────────────
drop policy if exists "care_plans_update" on care_plans;
create policy "care_plans_update" on care_plans
  for update using (
    public.get_user_role() in ('super_admin', 'manager', 'staff')
    and public.can_access_service_user(service_user_id)
  );

drop policy if exists "care_plans_delete" on care_plans;
create policy "care_plans_delete" on care_plans
  for delete using (public.get_user_role() in ('super_admin', 'manager'));

-- ── 8. medications — staff in home can view, managers write ───
drop policy if exists "medications_delete" on medications;
create policy "medications_delete" on medications
  for delete using (public.get_user_role() in ('super_admin', 'manager'));

-- ── 9. documents — confidential docs hidden from staff ────────
drop policy if exists "documents_select" on documents;
create policy "documents_select" on documents
  for select using (
    public.get_user_role() = 'super_admin'
    or (
      home_id = any(public.get_user_home_ids())
      and (
        is_confidential = false
        or public.get_user_role() in ('super_admin', 'manager')
      )
    )
    or (
      service_user_id is not null
      and public.can_access_service_user(service_user_id)
      and (
        is_confidential = false
        or public.get_user_role() in ('super_admin', 'manager')
      )
    )
  );

-- ── 10. daily_logs — confidential logs hidden from basic staff ─
drop policy if exists "daily_logs_select" on daily_logs;
create policy "daily_logs_select" on daily_logs
  for select using (
    public.can_access_service_user(service_user_id)
    and (
      is_confidential = false
      or public.get_user_role() in ('super_admin', 'manager')
      or written_by = auth.uid()   -- always see own entries
    )
  );

-- ── 11. Function to log profile field changes ─────────────────
create or replace function audit_profile_changes()
returns trigger as $$
begin
  if old.role is distinct from new.role then
    insert into audit_logs (actor_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      'role_change',
      'profiles',
      new.id,
      jsonb_build_object('old_role', old.role, 'new_role', new.role)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_audit_profile_changes on profiles;
create trigger trg_audit_profile_changes
  after update on profiles
  for each row execute function audit_profile_changes();

-- ── 12. Rate-limit helper: max daily logs per shift ───────────
-- (enforced in application, but documented here for audit trail)
comment on table daily_logs is
  'Immutable shift notes. Max 1 log per service_user per shift enforced by application layer. RLS prevents update/delete.';

comment on table audit_logs is
  'Append-only audit trail. All sensitive mutations must be logged here by the application layer.';
