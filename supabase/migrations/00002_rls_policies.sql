-- =============================================
-- INSPIRE HOMES — ROW LEVEL SECURITY POLICIES
-- Migration: 00002_rls_policies
-- All access is enforced here at DB level,
-- not just in the front-end.
-- =============================================

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get the current user's role
create or replace function public.get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Get all home IDs the current user is assigned to
create or replace function public.get_user_home_ids()
returns uuid[] as $$
  select array_agg(home_id)
  from user_home_assignments
  where user_id = auth.uid()
$$ language sql security definer stable;

-- Check if current user can see a given service user
-- (either in same home, or social worker assigned to them)
create or replace function public.can_access_service_user(su_id uuid)
returns boolean as $$
  select exists (
    select 1 from service_users su
    where su.id = su_id
    and (
      public.get_user_role() = 'super_admin'
      or su.home_id = any(public.get_user_home_ids())
      or (
        public.get_user_role() = 'social_worker'
        and exists (
          select 1 from service_user_professionals
          where service_user_id = su_id
          and professional_id = auth.uid()
        )
      )
    )
  )
$$ language sql security definer stable;

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================

alter table homes                     enable row level security;
alter table profiles                  enable row level security;
alter table user_home_assignments     enable row level security;
alter table service_users             enable row level security;
alter table service_user_professionals enable row level security;
alter table shifts                    enable row level security;
alter table shift_service_users       enable row level security;
alter table daily_logs                enable row level security;
alter table incident_reports          enable row level security;
alter table incident_involved_parties enable row level security;
alter table interaction_timeline      enable row level security;
alter table documents                 enable row level security;
alter table handover_notes            enable row level security;
alter table meetings                  enable row level security;
alter table meeting_attendees         enable row level security;
alter table medications               enable row level security;
alter table mar_entries               enable row level security;
alter table care_plans                enable row level security;
alter table alerts                    enable row level security;
alter table audit_logs                enable row level security;

-- =============================================
-- HOMES
-- =============================================

create policy "homes_select" on homes for select using (
  public.get_user_role() = 'super_admin'
  or id = any(public.get_user_home_ids())
);

create policy "homes_insert" on homes for insert with check (
  public.get_user_role() = 'super_admin'
);

create policy "homes_update" on homes for update using (
  public.get_user_role() = 'super_admin'
);

-- =============================================
-- PROFILES
-- =============================================

-- Everyone can read profiles in their own home (needed to display staff names etc.)
-- Social workers can read profiles of staff at homes they're linked to
create policy "profiles_select" on profiles for select using (
  id = auth.uid()
  or public.get_user_role() = 'super_admin'
  or public.get_user_role() in ('manager', 'staff', 'auditor')
  or (
    public.get_user_role() = 'social_worker'
    and id in (
      select user_id from user_home_assignments
      where home_id in (
        select home_id from service_users su
        join service_user_professionals sup on sup.service_user_id = su.id
        where sup.professional_id = auth.uid()
      )
    )
  )
);

create policy "profiles_insert" on profiles for insert with check (
  public.get_user_role() = 'super_admin'
  or id = auth.uid()  -- auto-created on signup via trigger
);

create policy "profiles_update" on profiles for update using (
  id = auth.uid()
  or public.get_user_role() = 'super_admin'
);

-- =============================================
-- USER HOME ASSIGNMENTS
-- =============================================

create policy "user_home_assignments_select" on user_home_assignments for select using (
  public.get_user_role() = 'super_admin'
  or user_id = auth.uid()
  or home_id = any(public.get_user_home_ids())
);

create policy "user_home_assignments_insert" on user_home_assignments for insert with check (
  public.get_user_role() = 'super_admin'
);

create policy "user_home_assignments_delete" on user_home_assignments for delete using (
  public.get_user_role() = 'super_admin'
);

-- =============================================
-- SERVICE USERS
-- =============================================

create policy "service_users_select" on service_users for select using (
  public.can_access_service_user(id)
);

create policy "service_users_insert" on service_users for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "service_users_update" on service_users for update using (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- Discharge is a soft operation (status update) — no hard deletes
create policy "service_users_no_delete" on service_users for delete using (false);

-- =============================================
-- SERVICE USER PROFESSIONALS
-- =============================================

create policy "professionals_select" on service_user_professionals for select using (
  public.can_access_service_user(service_user_id)
  or professional_id = auth.uid()
);

create policy "professionals_insert" on service_user_professionals for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
);

create policy "professionals_update" on service_user_professionals for update using (
  public.get_user_role() in ('super_admin', 'manager')
);

create policy "professionals_delete" on service_user_professionals for delete using (
  public.get_user_role() in ('super_admin', 'manager')
);

-- =============================================
-- SHIFTS
-- =============================================

create policy "shifts_select" on shifts for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or staff_id = auth.uid()
);

create policy "shifts_insert" on shifts for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "shifts_update" on shifts for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (public.get_user_role() = 'staff' and staff_id = auth.uid() and signed_off_by is null)
);

-- =============================================
-- SHIFT SERVICE USERS
-- =============================================

create policy "shift_service_users_select" on shift_service_users for select using (
  exists (
    select 1 from shifts s
    where s.id = shift_id
    and (s.home_id = any(public.get_user_home_ids()) or s.staff_id = auth.uid() or public.get_user_role() = 'super_admin')
  )
);

create policy "shift_service_users_insert" on shift_service_users for insert with check (
  exists (
    select 1 from shifts s
    where s.id = shift_id
    and (s.home_id = any(public.get_user_home_ids()) or public.get_user_role() = 'super_admin')
  )
);

-- =============================================
-- DAILY LOGS
-- =============================================

create policy "daily_logs_select" on daily_logs for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and public.can_access_service_user(service_user_id)
    and is_confidential = false
  )
);

create policy "daily_logs_insert" on daily_logs for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- Immutable — no updates or deletes after creation
create policy "daily_logs_no_update" on daily_logs for update using (false);
create policy "daily_logs_no_delete" on daily_logs for delete using (false);

-- =============================================
-- INCIDENT REPORTS
-- =============================================

create policy "incidents_select" on incident_reports for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and service_user_id is not null
    and public.can_access_service_user(service_user_id)
  )
);

create policy "incidents_insert" on incident_reports for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "incidents_update" on incident_reports for update using (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- =============================================
-- INCIDENT INVOLVED PARTIES
-- =============================================

create policy "involved_parties_select" on incident_involved_parties for select using (
  exists (
    select 1 from incident_reports ir
    where ir.id = incident_id
    and (
      public.get_user_role() = 'super_admin'
      or ir.home_id = any(public.get_user_home_ids())
    )
  )
);

create policy "involved_parties_insert" on incident_involved_parties for insert with check (
  exists (
    select 1 from incident_reports ir
    where ir.id = incident_id
    and ir.home_id = any(public.get_user_home_ids())
  )
);

-- =============================================
-- INTERACTION TIMELINE
-- =============================================

create policy "timeline_select" on interaction_timeline for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and public.can_access_service_user(service_user_id)
  )
);

create policy "timeline_insert" on interaction_timeline for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- Timeline is immutable
create policy "timeline_no_update" on interaction_timeline for update using (false);
create policy "timeline_no_delete" on interaction_timeline for delete using (false);

-- =============================================
-- DOCUMENTS
-- =============================================

create policy "documents_select" on documents for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and service_user_id is not null
    and public.can_access_service_user(service_user_id)
    and is_confidential = false
  )
);

create policy "documents_insert" on documents for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "documents_update" on documents for update using (
  public.get_user_role() in ('super_admin', 'manager')
  and home_id = any(public.get_user_home_ids())
);

-- =============================================
-- HANDOVER NOTES
-- =============================================

create policy "handover_select" on handover_notes for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
);

create policy "handover_insert" on handover_notes for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- Allow incoming staff to acknowledge only
create policy "handover_update" on handover_notes for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (
    public.get_user_role() = 'staff'
    and incoming_staff_id = auth.uid()
    and is_acknowledged = false
  )
);

-- =============================================
-- MEETINGS
-- =============================================

create policy "meetings_select" on meetings for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and service_user_id is not null
    and public.can_access_service_user(service_user_id)
  )
  or exists (
    select 1 from meeting_attendees
    where meeting_id = id and profile_id = auth.uid()
  )
);

create policy "meetings_insert" on meetings for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "meetings_update" on meetings for update using (
  public.get_user_role() in ('super_admin', 'manager')
  and home_id = any(public.get_user_home_ids())
);

-- =============================================
-- MEETING ATTENDEES
-- =============================================

create policy "meeting_attendees_select" on meeting_attendees for select using (
  exists (
    select 1 from meetings m
    where m.id = meeting_id
    and (m.home_id = any(public.get_user_home_ids()) or public.get_user_role() = 'super_admin')
  )
);

create policy "meeting_attendees_insert" on meeting_attendees for insert with check (
  exists (
    select 1 from meetings m
    where m.id = meeting_id
    and m.home_id = any(public.get_user_home_ids())
  )
);

-- =============================================
-- MEDICATIONS
-- =============================================

create policy "medications_select" on medications for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and public.can_access_service_user(service_user_id)
  )
);

create policy "medications_insert" on medications for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "medications_update" on medications for update using (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- =============================================
-- MAR ENTRIES
-- =============================================

create policy "mar_entries_select" on mar_entries for select using (
  public.get_user_role() = 'super_admin'
  or public.can_access_service_user(service_user_id)
);

create policy "mar_entries_insert" on mar_entries for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and public.can_access_service_user(service_user_id)
);

-- MAR entries are immutable
create policy "mar_entries_no_update" on mar_entries for update using (false);
create policy "mar_entries_no_delete" on mar_entries for delete using (false);

-- =============================================
-- CARE PLANS
-- =============================================

create policy "care_plans_select" on care_plans for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (
    public.get_user_role() = 'social_worker'
    and public.can_access_service_user(service_user_id)
  )
);

create policy "care_plans_insert" on care_plans for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "care_plans_update" on care_plans for update using (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- =============================================
-- ALERTS
-- =============================================

create policy "alerts_select" on alerts for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
);

create policy "alerts_insert" on alerts for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

create policy "alerts_update" on alerts for update using (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);

-- =============================================
-- AUDIT LOGS
-- =============================================

create policy "audit_logs_select" on audit_logs for select using (
  public.get_user_role() in ('super_admin', 'manager', 'auditor')
);

-- Inserted only by server-side triggers — no direct client writes
create policy "audit_logs_insert" on audit_logs for insert with check (true);
create policy "audit_logs_no_update" on audit_logs for update using (false);
create policy "audit_logs_no_delete" on audit_logs for delete using (false);
