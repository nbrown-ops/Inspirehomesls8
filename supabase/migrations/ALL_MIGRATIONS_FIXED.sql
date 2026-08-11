-- ============================================================
-- INSPIRE HOMES — COMPLETE DATABASE SETUP (FIXED v2)
-- Paste this entire file into Supabase SQL Editor and click Run
--
-- Changes from original:
--  • Helper functions in public schema (not auth) — fixes permission error
--  • medications: dose→dosage, prescribed_by→prescriber, +prescriber_contact,
--    +side_effects, administration_notes (was special_instructions)
--  • care_plans: added strengths/support_needs/goals/long_term_objectives/risks
--    columns; reviewed_by (was last_reviewed_by)
--  • documents: uploaded_by (was created_by), file_size (was file_size_bytes)
--  • mar_entries: outcome default 'given' (was 'administered')
--  • staff_tasks table added
-- ============================================================


-- ============================================================
-- MIGRATION 00001 — Initial Schema
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Enums ────────────────────────────────────────────────────

create type user_role as enum (
  'super_admin', 'manager', 'staff', 'social_worker', 'auditor'
);

create type service_user_status as enum (
  'active', 'discharged', 'on_leave', 'hospital', 'missing'
);

create type placement_type as enum (
  'supported_living', 'semi_independent', 'emergency', 'respite'
);

create type incident_severity as enum (
  'low', 'medium', 'high', 'critical'
);

create type incident_status as enum (
  'open', 'under_review', 'closed', 'referred'
);

create type care_plan_status as enum (
  'draft', 'active', 'under_review', 'archived'
);

create type shift_type as enum (
  'morning', 'afternoon', 'evening', 'night', 'waking_night', 'sleep_in'
);

create type document_type as enum (
  'referral_pack',
  'care_plan',
  'risk_assessment',
  'pathway_plan',
  'court_order',
  'placement_agreement',
  'health_assessment',
  'education_plan',
  'dbs_certificate',
  'training_certificate',
  'id_document',
  'correspondence',
  'photo_id',
  'other'
);

create type alert_type as enum (
  'incident_flagged',
  'medication_overdue',
  'document_expiring',
  'dbs_expiring',
  'care_plan_review_due',
  'missing_person',
  'safeguarding',
  'handover_unacknowledged',
  'other'
);

create type meeting_type as enum (
  'looked_after_child_review',
  'pathway_planning',
  'key_work_session',
  'professionals_meeting',
  'supervision',
  'team_meeting',
  'risk_assessment_review',
  'mental_health_review',
  'other'
);

create type interaction_type as enum (
  'key_work_session',
  'welfare_check',
  'medication_prompt',
  'activity',
  'appointment',
  'phone_call',
  'visit',
  'incident',
  'handover',
  'other'
);

-- ── Homes / Properties ───────────────────────────────────────

create table homes (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  address         text not null,
  city            text not null default 'Leeds',
  postcode        text not null,
  phone           text,
  manager_id      uuid,
  ofsted_urn      text,
  max_occupancy   int not null default 4,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ── Profiles ─────────────────────────────────────────────────

create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text not null,
  preferred_name        text,
  role                  user_role not null default 'staff',
  job_title             text,
  phone                 text,
  photo_url             text,
  employment_start_date date,
  dbs_certificate_number text,
  dbs_issue_date        date,
  dbs_expiry_date       date,
  dbs_update_service    boolean not null default false,
  is_active             boolean not null default true,
  contracted_hours      numeric(4,1),
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  handbook_acknowledged_at       timestamptz,
  confidentiality_acknowledged_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table user_home_assignments (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  home_id     uuid not null references homes(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(user_id, home_id)
);

alter table homes
  add constraint homes_manager_id_fkey
  foreign key (manager_id) references profiles(id) on delete set null;

-- ── Service Users ─────────────────────────────────────────────

create table service_users (
  id                    uuid primary key default uuid_generate_v4(),
  home_id               uuid not null references homes(id),
  first_name            text not null,
  last_name             text not null,
  preferred_name        text,
  date_of_birth         date not null,
  gender                text,
  pronouns              text,
  photo_url             text,
  nationality           text,
  ethnicity             text,
  first_language        text,
  religion              text,
  placement_start_date  date not null,
  placement_end_date    date,
  status                service_user_status not null default 'active',
  placement_type        placement_type not null default 'supported_living',
  room_number           text,
  local_authority       text,
  legal_status          text,
  is_asylum_seeker      boolean not null default false,
  has_mental_capacity   boolean not null default true,
  mca_assessment_date   date,
  nhs_number            text,
  gp_name               text,
  gp_practice           text,
  gp_phone              text,
  gp_address            text,
  blood_type            text,
  allergies             text[],
  medical_conditions    text[],
  key_worker_id         uuid references profiles(id) on delete set null,
  nok_name              text,
  nok_relationship      text,
  nok_phone             text,
  nok_email             text,
  nok_address           text,
  nok_is_emergency_contact boolean not null default true,
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table service_user_professionals (
  id                uuid primary key default uuid_generate_v4(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  professional_id   uuid references profiles(id) on delete set null,
  external_name     text,
  external_email    text,
  external_phone    text,
  external_org      text,
  role              text not null,
  is_primary        boolean not null default false,
  assigned_at       timestamptz not null default now()
);

-- ── Shifts ────────────────────────────────────────────────────

create table shifts (
  id              uuid primary key default uuid_generate_v4(),
  home_id         uuid not null references homes(id),
  staff_id        uuid not null references profiles(id),
  shift_type      shift_type not null,
  start_time      timestamptz not null,
  end_time        timestamptz,
  notes           text,
  concerns        text,
  signed_off_by   uuid references profiles(id),
  signed_off_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table shift_service_users (
  id              uuid primary key default uuid_generate_v4(),
  shift_id        uuid not null references shifts(id) on delete cascade,
  service_user_id uuid not null references service_users(id) on delete cascade,
  unique(shift_id, service_user_id)
);

-- ── Daily Logs ────────────────────────────────────────────────

create table daily_logs (
  id                  uuid primary key default uuid_generate_v4(),
  home_id             uuid not null references homes(id),
  service_user_id     uuid not null references service_users(id) on delete cascade,
  shift_id            uuid references shifts(id) on delete set null,
  written_by          uuid not null references profiles(id),
  log_date            date not null,
  mood_rating         int check (mood_rating between 1 and 5),
  mood_notes          text,
  physical_health     text,
  sleep_quality       text,
  appetite            text,
  activities          text,
  community_access    boolean not null default false,
  education_work      text,
  medication_notes    text,
  medication_refused  boolean not null default false,
  concerns            text,
  is_flagged          boolean not null default false,
  flagged_reason      text,
  is_confidential     boolean not null default false,
  created_at          timestamptz not null default now()
);

-- ── Incident Reports ──────────────────────────────────────────

create table incident_reports (
  id                      uuid primary key default uuid_generate_v4(),
  home_id                 uuid not null references homes(id),
  service_user_id         uuid references service_users(id) on delete set null,
  reported_by             uuid not null references profiles(id),
  incident_date           date not null,
  incident_time           time,
  location                text,
  incident_type           text not null,
  severity                incident_severity not null default 'low',
  status                  incident_status not null default 'open',
  description             text not null,
  immediate_action        text,
  injuries_sustained      boolean not null default false,
  injury_details          text,
  police_notified         boolean not null default false,
  police_reference        text,
  social_worker_notified  boolean not null default false,
  manager_notified        boolean not null default false,
  parent_nok_notified     boolean not null default false,
  ofsted_reportable       boolean not null default false,
  ofsted_notified_at      timestamptz,
  follow_up_required      boolean not null default false,
  follow_up_notes         text,
  manager_sign_off        uuid references profiles(id),
  manager_sign_off_at     timestamptz,
  manager_comments        text,
  closed_at               timestamptz,
  closed_by               uuid references profiles(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table incident_involved_parties (
  id              uuid primary key default uuid_generate_v4(),
  incident_id     uuid not null references incident_reports(id) on delete cascade,
  service_user_id uuid references service_users(id) on delete set null,
  staff_id        uuid references profiles(id) on delete set null,
  external_name   text,
  role_in_incident text not null
);

-- ── Interaction Timeline ──────────────────────────────────────

create table interaction_timeline (
  id              uuid primary key default uuid_generate_v4(),
  service_user_id uuid not null references service_users(id) on delete cascade,
  home_id         uuid not null references homes(id),
  staff_id        uuid not null references profiles(id),
  interaction_type interaction_type not null,
  occurred_at     timestamptz not null default now(),
  duration_minutes int,
  notes           text,
  outcome         text,
  is_flagged      boolean not null default false,
  flagged_reason  text,
  linked_incident_id uuid references incident_reports(id) on delete set null,
  linked_shift_id    uuid references shifts(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ── Documents ─────────────────────────────────────────────────
-- NOTE: uploaded_by (not created_by) to match app code

create table documents (
  id                uuid primary key default uuid_generate_v4(),
  home_id           uuid not null references homes(id),
  service_user_id   uuid references service_users(id) on delete cascade,
  document_type     document_type not null,
  title             text not null,
  description       text,
  file_url          text not null,
  file_name         text not null,
  file_size         int,
  mime_type         text,
  document_date     date,
  expiry_date       date,
  uploaded_by       uuid not null references profiles(id),
  countersigned_by  uuid references profiles(id),
  countersigned_at  timestamptz,
  is_confidential   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Handover Notes ────────────────────────────────────────────

create table handover_notes (
  id                  uuid primary key default uuid_generate_v4(),
  home_id             uuid not null references homes(id),
  outgoing_shift_id   uuid references shifts(id) on delete set null,
  incoming_shift_id   uuid references shifts(id) on delete set null,
  outgoing_staff_id   uuid not null references profiles(id),
  incoming_staff_id   uuid references profiles(id),
  handover_time       timestamptz not null default now(),
  summary             text not null,
  urgent_actions      text,
  medication_notes    text,
  incidents_summary   text,
  is_acknowledged     boolean not null default false,
  acknowledged_at     timestamptz,
  acknowledged_by     uuid references profiles(id),
  created_at          timestamptz not null default now()
);

-- ── Meetings ──────────────────────────────────────────────────

create table meetings (
  id              uuid primary key default uuid_generate_v4(),
  home_id         uuid not null references homes(id),
  service_user_id uuid references service_users(id) on delete set null,
  meeting_type    meeting_type not null,
  title           text not null,
  scheduled_at    timestamptz not null,
  location        text,
  minutes         text,
  action_points   jsonb,
  chaired_by      uuid references profiles(id),
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table meeting_attendees (
  id              uuid primary key default uuid_generate_v4(),
  meeting_id      uuid not null references meetings(id) on delete cascade,
  profile_id      uuid references profiles(id) on delete set null,
  external_name   text,
  external_role   text,
  external_org    text,
  attended        boolean not null default true,
  apologies       boolean not null default false,
  unique(meeting_id, profile_id)
);

-- ── Medications ───────────────────────────────────────────────
-- NOTE: dosage (not dose), prescriber (not prescribed_by),
--       administration_notes (not special_instructions), +side_effects

create table medications (
  id                    uuid primary key default uuid_generate_v4(),
  service_user_id       uuid not null references service_users(id) on delete cascade,
  home_id               uuid not null references homes(id),
  medication_name       text not null,
  generic_name          text,
  dosage                text not null,
  route                 text not null,
  frequency             text not null,
  prescriber            text,
  prescriber_contact    text,
  start_date            date not null,
  end_date              date,
  is_prn                boolean not null default false,
  is_controlled         boolean not null default false,
  is_active             boolean not null default true,
  storage_instructions  text,
  side_effects          text,
  administration_notes  text,
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── MAR Entries ───────────────────────────────────────────────
-- NOTE: outcome default 'given' (not 'administered') to match app

create table mar_entries (
  id                uuid primary key default uuid_generate_v4(),
  medication_id     uuid not null references medications(id) on delete cascade,
  service_user_id   uuid not null references service_users(id),
  administered_by   uuid not null references profiles(id),
  administered_at   timestamptz not null,
  dose_given        text not null,
  outcome           text not null default 'given',  -- given, refused, missed, self_administered
  refusal_reason    text,
  omission_reason   text,
  notes             text,
  witnessed_by      uuid references profiles(id),
  created_at        timestamptz not null default now()
);

-- ── Care Plans ────────────────────────────────────────────────
-- NOTE: individual text columns + reviewed_by (was last_reviewed_by)

create table care_plans (
  id                    uuid primary key default uuid_generate_v4(),
  service_user_id       uuid not null references service_users(id) on delete cascade,
  home_id               uuid not null references homes(id),
  title                 text not null,
  plan_type             text,
  status                care_plan_status not null default 'draft',
  review_date           date,
  strengths             text,
  support_needs         text,
  goals                 text,
  long_term_objectives  text,
  risks                 text,
  reviewed_by           uuid references profiles(id),
  reviewed_at           timestamptz,
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Alerts ────────────────────────────────────────────────────

create table alerts (
  id                uuid primary key default uuid_generate_v4(),
  home_id           uuid not null references homes(id),
  alert_type        alert_type not null,
  title             text not null,
  message           text,
  service_user_id   uuid references service_users(id) on delete cascade,
  incident_id       uuid references incident_reports(id) on delete cascade,
  document_id       uuid references documents(id) on delete cascade,
  medication_id     uuid references medications(id) on delete cascade,
  handover_id       uuid references handover_notes(id) on delete cascade,
  profile_id        uuid references profiles(id) on delete cascade,
  triggered_at      timestamptz not null default now(),
  is_resolved       boolean not null default false,
  resolved_at       timestamptz,
  resolved_by       uuid references profiles(id),
  resolution_notes  text,
  created_at        timestamptz not null default now()
);

-- ── Audit Logs ────────────────────────────────────────────────

create table audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id) on delete set null,
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- ── Staff Tasks ───────────────────────────────────────────────

create table staff_tasks (
  id              uuid primary key default uuid_generate_v4(),
  home_id         uuid not null references homes(id),
  title           text not null,
  description     text,
  priority        text not null default 'normal',   -- low, normal, high, urgent
  status          text not null default 'pending',  -- pending, in_progress, completed, cancelled
  due_date        date,
  assigned_to     uuid not null references profiles(id),
  assigned_by     uuid not null references profiles(id),
  completed_at    timestamptz,
  completed_by    uuid references profiles(id),
  completion_note text,
  cancelled_at    timestamptz,
  cancelled_by    uuid references profiles(id),
  cancel_reason   text,
  created_at      timestamptz not null default now()
);

create index on staff_tasks (assigned_to, status);
create index on staff_tasks (home_id, status);
create index on staff_tasks (due_date) where status not in ('completed', 'cancelled');

-- ── Indexes ───────────────────────────────────────────────────

create index on service_users (home_id);
create index on service_users (status);
create index on service_users (key_worker_id);
create index on shifts (home_id, start_time desc);
create index on shifts (staff_id);
create index on daily_logs (service_user_id, log_date desc);
create index on daily_logs (home_id, log_date desc);
create index on daily_logs (is_flagged) where is_flagged = true;
create index on incident_reports (home_id, incident_date desc);
create index on incident_reports (service_user_id);
create index on incident_reports (status);
create index on incident_reports (ofsted_reportable) where ofsted_reportable = true;
create index on interaction_timeline (service_user_id, occurred_at desc);
create index on interaction_timeline (is_flagged) where is_flagged = true;
create index on documents (service_user_id);
create index on documents (home_id);
create index on documents (expiry_date) where expiry_date is not null;
create index on handover_notes (home_id, handover_time desc);
create index on handover_notes (is_acknowledged) where is_acknowledged = false;
create index on alerts (home_id, is_resolved);
create index on alerts (is_resolved) where is_resolved = false;
create index on medications (service_user_id, is_active);
create index on mar_entries (medication_id, administered_at desc);
create index on audit_logs (table_name, record_id);
create index on audit_logs (user_id);

-- ── updated_at trigger ────────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger set_updated_at before update on service_users
  for each row execute function update_updated_at();
create trigger set_updated_at before update on shifts
  for each row execute function update_updated_at();
create trigger set_updated_at before update on incident_reports
  for each row execute function update_updated_at();
create trigger set_updated_at before update on medications
  for each row execute function update_updated_at();
create trigger set_updated_at before update on care_plans
  for each row execute function update_updated_at();
create trigger set_updated_at before update on documents
  for each row execute function update_updated_at();
create trigger set_updated_at before update on meetings
  for each row execute function update_updated_at();

-- ── Auto-create profile on signup ─────────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- MIGRATION 00002 — RLS Policies
-- NOTE: Helper functions in PUBLIC schema (not auth schema)
-- ============================================================

-- ── Helper functions (PUBLIC schema) ─────────────────────────

create or replace function public.get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

create or replace function public.get_user_home_ids()
returns uuid[] as $$
  select array_agg(home_id)
  from user_home_assignments
  where user_id = auth.uid()
$$ language sql security definer stable;

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

-- ── Enable RLS ────────────────────────────────────────────────

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
alter table staff_tasks               enable row level security;

-- ── Homes ─────────────────────────────────────────────────────

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

-- ── Profiles ─────────────────────────────────────────────────

create policy "profiles_select" on profiles for select using (
  id = auth.uid()
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

create policy "profiles_insert" on profiles for insert with check (
  public.get_user_role() = 'super_admin'
  or id = auth.uid()
);

create policy "profiles_update" on profiles for update using (
  id = auth.uid()
  or public.get_user_role() = 'super_admin'
  or (
    public.get_user_role() = 'manager'
    and role in ('staff')
    and exists (
      select 1 from user_home_assignments u1
      join user_home_assignments u2 on u1.home_id = u2.home_id
      where u1.user_id = auth.uid()
        and u2.user_id = profiles.id
    )
  )
);

create policy "profiles_no_role_escalation" on profiles
  for update using (true)
  with check (
    public.get_user_role() = 'super_admin'
    or id = auth.uid()
  );

-- ── User Home Assignments ─────────────────────────────────────

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

-- ── Service Users ─────────────────────────────────────────────

create policy "service_users_select" on service_users for select using (
  public.can_access_service_user(id)
);
create policy "service_users_insert" on service_users for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
  and (
    public.get_user_role() = 'super_admin'
    or home_id = any(public.get_user_home_ids())
  )
);
create policy "service_users_update" on service_users for update using (
  public.get_user_role() in ('super_admin', 'manager')
  and (
    public.get_user_role() = 'super_admin'
    or home_id = any(public.get_user_home_ids())
  )
);
create policy "service_users_no_delete" on service_users for delete using (
  public.get_user_role() = 'super_admin'
);

-- ── Service User Professionals ────────────────────────────────

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

-- ── Shifts ────────────────────────────────────────────────────

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

-- ── Shift Service Users ───────────────────────────────────────

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

-- ── Daily Logs ────────────────────────────────────────────────

create policy "daily_logs_select" on daily_logs for select using (
  public.can_access_service_user(service_user_id)
  and (
    is_confidential = false
    or public.get_user_role() in ('super_admin', 'manager')
    or written_by = auth.uid()
  )
);
create policy "daily_logs_insert" on daily_logs for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);
create policy "daily_logs_no_update" on daily_logs for update using (false);
create policy "daily_logs_no_delete" on daily_logs for delete using (false);

-- ── Incident Reports ──────────────────────────────────────────

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
  public.get_user_role() in ('super_admin', 'manager')
  or (
    public.get_user_role() = 'staff'
    and reported_by = auth.uid()
    and status = 'open'
  )
);
create policy "incidents_delete" on incident_reports for delete using (
  public.get_user_role() = 'super_admin'
);

-- ── Incident Involved Parties ─────────────────────────────────

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

-- ── Interaction Timeline ──────────────────────────────────────

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
create policy "timeline_no_update" on interaction_timeline for update using (false);
create policy "timeline_no_delete" on interaction_timeline for delete using (false);

-- ── Documents ─────────────────────────────────────────────────

create policy "documents_select" on documents for select using (
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
create policy "documents_insert" on documents for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);
create policy "documents_update" on documents for update using (
  public.get_user_role() in ('super_admin', 'manager')
  and home_id = any(public.get_user_home_ids())
);
create policy "documents_delete" on documents for delete using (
  public.get_user_role() in ('super_admin', 'manager')
);

-- ── Handover Notes ────────────────────────────────────────────

create policy "handover_select" on handover_notes for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
);
create policy "handover_insert" on handover_notes for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);
create policy "handover_update" on handover_notes for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (
    public.get_user_role() = 'staff'
    and incoming_staff_id = auth.uid()
    and is_acknowledged = false
  )
);

-- ── Meetings ──────────────────────────────────────────────────

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

-- ── Meeting Attendees ─────────────────────────────────────────

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

-- ── Medications ───────────────────────────────────────────────

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
create policy "medications_delete" on medications for delete using (
  public.get_user_role() in ('super_admin', 'manager')
);

-- ── MAR Entries ───────────────────────────────────────────────

create policy "mar_entries_select" on mar_entries for select using (
  public.get_user_role() = 'super_admin'
  or public.can_access_service_user(service_user_id)
);
create policy "mar_entries_insert" on mar_entries for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and public.can_access_service_user(service_user_id)
);
create policy "mar_entries_no_update" on mar_entries for update using (false);
create policy "mar_entries_no_delete" on mar_entries for delete using (false);

-- ── Care Plans ────────────────────────────────────────────────

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
  and public.can_access_service_user(service_user_id)
);
create policy "care_plans_delete" on care_plans for delete using (
  public.get_user_role() in ('super_admin', 'manager')
);

-- ── Alerts ────────────────────────────────────────────────────

create policy "alerts_select" on alerts for select using (
  public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
  or (service_user_id is not null and public.can_access_service_user(service_user_id))
);
create policy "alerts_insert" on alerts for insert with check (
  public.get_user_role() in ('super_admin', 'manager', 'staff')
  and home_id = any(public.get_user_home_ids())
);
create policy "alerts_update" on alerts for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (
    public.get_user_role() = 'staff'
    and home_id = any(public.get_user_home_ids())
  )
);

-- ── Audit Logs ────────────────────────────────────────────────

create policy "audit_logs_select" on audit_logs for select using (
  public.get_user_role() in ('super_admin', 'manager', 'auditor')
);
create policy "audit_logs_insert" on audit_logs for insert with check (
  auth.uid() is not null
);
create policy "audit_logs_no_update" on audit_logs for update using (false);
create policy "audit_logs_no_delete" on audit_logs for delete using (false);

-- ── Staff Tasks ───────────────────────────────────────────────

create policy "staff_tasks_select" on staff_tasks for select using (
  assigned_to = auth.uid()
  or assigned_by = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager', 'auditor')
);
create policy "staff_tasks_insert" on staff_tasks for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
  and home_id = any(public.get_user_home_ids())
);
create policy "staff_tasks_update" on staff_tasks for update using (
  assigned_to = auth.uid()  -- staff can complete own tasks
  or public.get_user_role() in ('super_admin', 'manager')
);
create policy "staff_tasks_delete" on staff_tasks for delete using (
  public.get_user_role() in ('super_admin', 'manager')
);


-- ============================================================
-- MIGRATION 00003 — Extend interaction_type enum
-- ============================================================

alter type interaction_type add value if not exists 'safeguarding_concern';
alter type interaction_type add value if not exists 'positive_achievement';
alter type interaction_type add value if not exists 'community_activity';
alter type interaction_type add value if not exists 'medical_appointment';

alter publication supabase_realtime add table interaction_timeline;


-- ============================================================
-- MIGRATION 00004 — External Professional Portal
-- ============================================================

create table professional_notes (
  id                uuid primary key default uuid_generate_v4(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  home_id           uuid not null references homes(id),
  authored_by       uuid not null references profiles(id),
  body              text not null,
  is_read           boolean not null default false,
  read_by           uuid references profiles(id),
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index on professional_notes (service_user_id, created_at desc);
create index on professional_notes (home_id, is_read) where is_read = false;

create type meeting_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table meeting_requests (
  id                uuid primary key default uuid_generate_v4(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  home_id           uuid not null references homes(id),
  requested_by      uuid not null references profiles(id),
  proposed_date     date not null,
  proposed_time     time,
  meeting_type      meeting_type not null default 'professionals_meeting',
  purpose           text not null,
  status            meeting_request_status not null default 'pending',
  response_note     text,
  responded_by      uuid references profiles(id),
  responded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index on meeting_requests (home_id, status);
create index on meeting_requests (requested_by);
create index on meeting_requests (service_user_id);

create trigger set_updated_at before update on meeting_requests
  for each row execute function update_updated_at();

alter table professional_notes  enable row level security;
alter table meeting_requests    enable row level security;

create policy "prof_notes_select" on professional_notes for select using (
  authored_by = auth.uid()
  or public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
);
create policy "prof_notes_insert" on professional_notes for insert with check (
  authored_by = auth.uid()
  and public.get_user_role() = 'social_worker'
  and public.can_access_service_user(service_user_id)
);
create policy "prof_notes_no_update" on professional_notes for update using (false);
create policy "prof_notes_no_delete" on professional_notes for delete using (false);
create policy "prof_notes_mark_read" on professional_notes for update
  using (home_id = any(public.get_user_home_ids()) or public.get_user_role() = 'super_admin')
  with check (true);

create policy "meeting_req_select" on meeting_requests for select using (
  requested_by = auth.uid()
  or public.get_user_role() = 'super_admin'
  or home_id = any(public.get_user_home_ids())
);
create policy "meeting_req_insert" on meeting_requests for insert with check (
  requested_by = auth.uid()
  and public.get_user_role() = 'social_worker'
  and public.can_access_service_user(service_user_id)
);
create policy "meeting_req_update" on meeting_requests for update using (
  (requested_by = auth.uid() and status = 'pending')
  or public.get_user_role() in ('super_admin', 'manager')
);

alter publication supabase_realtime add table professional_notes;
alter publication supabase_realtime add table meeting_requests;


-- ============================================================
-- MIGRATION 00005 — Staff Management Module
-- ============================================================

create table mandatory_training_categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  valid_for_months int not null default 12,
  is_active   boolean not null default true
);

insert into mandatory_training_categories (name, valid_for_months) values
  ('Safeguarding Children L2',           12),
  ('Safeguarding Adults L2',             12),
  ('First Aid at Work',                  36),
  ('Manual Handling',                    12),
  ('Fire Safety',                        12),
  ('Infection Control',                  12),
  ('Mental Capacity Act / DoLS',         12),
  ('Medication Administration',          12),
  ('Lone Working',                       12),
  ('Food Hygiene',                       36),
  ('Health & Safety',                    12),
  ('PREVENT (Counter-Terrorism)',        36);

create table staff_training_records (
  id                  uuid primary key default uuid_generate_v4(),
  staff_id            uuid not null references profiles(id) on delete cascade,
  training_name       text not null,
  category_id         uuid references mandatory_training_categories(id),
  completed_date      date not null,
  expiry_date         date,
  provider            text,
  certificate_url     text,
  notes               text,
  created_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now()
);

create index on staff_training_records (staff_id, expiry_date);
create index on staff_training_records (expiry_date) where expiry_date is not null;

create table staff_supervisions (
  id              uuid primary key default uuid_generate_v4(),
  staff_id        uuid not null references profiles(id) on delete cascade,
  supervisor_id   uuid not null references profiles(id),
  supervision_date date not null,
  duration_minutes int,
  type            text not null default 'individual',
  topics          text,
  notes           text,
  actions         text,
  signed_off_by   uuid references profiles(id),
  signed_off_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index on staff_supervisions (staff_id, supervision_date desc);

create table staff_appraisals (
  id              uuid primary key default uuid_generate_v4(),
  staff_id        uuid not null references profiles(id) on delete cascade,
  appraiser_id    uuid not null references profiles(id),
  appraisal_date  date not null,
  period_start    date,
  period_end      date,
  overall_rating  text,
  strengths       text,
  development_areas text,
  objectives      jsonb,
  notes           text,
  signed_by_staff boolean not null default false,
  signed_at       timestamptz,
  created_at      timestamptz not null default now()
);

create index on staff_appraisals (staff_id, appraisal_date desc);

create table staff_emergency_contacts (
  id              uuid primary key default uuid_generate_v4(),
  staff_id        uuid not null references profiles(id) on delete cascade,
  name            text not null,
  relationship    text not null,
  phone           text not null,
  phone_alt       text,
  created_at      timestamptz not null default now()
);

alter table mandatory_training_categories  enable row level security;
alter table staff_training_records         enable row level security;
alter table staff_supervisions             enable row level security;
alter table staff_appraisals               enable row level security;
alter table staff_emergency_contacts       enable row level security;

create policy "training_cats_select" on mandatory_training_categories
  for select using (auth.uid() is not null);
create policy "training_cats_write" on mandatory_training_categories
  for all using (public.get_user_role() = 'super_admin');

create policy "training_records_select" on staff_training_records for select using (
  staff_id = auth.uid()
  or public.get_user_role() = 'super_admin'
  or public.get_user_role() in ('manager', 'auditor')
);
create policy "training_records_insert" on staff_training_records for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
  or staff_id = auth.uid()
);
create policy "training_records_update" on staff_training_records for update using (
  public.get_user_role() in ('super_admin', 'manager')
);

create policy "supervision_select" on staff_supervisions for select using (
  staff_id = auth.uid()
  or supervisor_id = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager', 'auditor')
);
create policy "supervision_insert" on staff_supervisions for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
);
create policy "supervision_update" on staff_supervisions for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (staff_id = auth.uid() and signed_off_at is null)
);

create policy "appraisal_select" on staff_appraisals for select using (
  staff_id = auth.uid()
  or appraiser_id = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager', 'auditor')
);
create policy "appraisal_insert" on staff_appraisals for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
);
create policy "appraisal_update" on staff_appraisals for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (staff_id = auth.uid() and signed_by_staff = false)
);

create policy "emergency_contacts_select" on staff_emergency_contacts for select using (
  staff_id = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager')
);
create policy "emergency_contacts_write" on staff_emergency_contacts
  for all using (
    staff_id = auth.uid()
    or public.get_user_role() in ('super_admin', 'manager')
  );


-- ============================================================
-- MIGRATION 00006 — Security fixes
-- ============================================================

-- Audit trigger for role changes
create or replace function audit_profile_changes()
returns trigger as $$
begin
  if old.role is distinct from new.role then
    insert into audit_logs (user_id, action, table_name, record_id, new_values)
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

comment on table daily_logs is
  'Immutable shift notes. RLS prevents update/delete.';

comment on table audit_logs is
  'Append-only audit trail.';


-- ============================================================
-- REALTIME — add remaining tables
-- ============================================================

alter publication supabase_realtime add table alerts;


-- ============================================================
-- SUPABASE STORAGE — create bucket for documents
-- (run separately in Supabase Dashboard → Storage if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- ============================================================
