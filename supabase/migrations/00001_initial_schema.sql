-- =============================================
-- INSPIRE HOMES — FULL DATABASE SCHEMA
-- Migration: 00001_initial_schema
-- =============================================

create extension if not exists "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================

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

-- =============================================
-- HOMES / PROPERTIES
-- =============================================

create table homes (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  address         text not null,
  city            text not null default 'Leeds',
  postcode        text not null,
  phone           text,
  manager_id      uuid,                         -- FK to profiles, set after
  ofsted_urn      text,
  max_occupancy   int not null default 4,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- =============================================
-- PROFILES (staff + external users)
-- Extends auth.users
-- =============================================

create table profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  email                 text not null,
  full_name             text not null,
  preferred_name        text,
  role                  user_role not null default 'staff',
  job_title             text,
  phone                 text,
  photo_url             text,                   -- Supabase Storage signed URL
  employment_start_date date,
  dbs_certificate_number text,
  dbs_issue_date        date,
  dbs_expiry_date       date,
  dbs_update_service    boolean not null default false,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Assign staff to one or more properties
create table user_home_assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  home_id     uuid not null references homes(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(user_id, home_id)
);

-- Now set the FK on homes
alter table homes
  add constraint homes_manager_id_fkey
  foreign key (manager_id) references profiles(id) on delete set null;

-- =============================================
-- SERVICE USERS (young people / residents)
-- =============================================

create table service_users (
  id                    uuid primary key default gen_random_uuid(),
  home_id               uuid not null references homes(id),
  first_name            text not null,
  last_name             text not null,
  preferred_name        text,
  date_of_birth         date not null,
  gender                text,
  pronouns              text,
  photo_url             text,                   -- Supabase Storage signed URL
  nationality           text,
  ethnicity             text,
  first_language        text,
  religion              text,
  -- Placement
  placement_start_date  date not null,
  placement_end_date    date,
  status                service_user_status not null default 'active',
  placement_type        placement_type not null default 'supported_living',
  room_number           text,
  local_authority       text,
  legal_status          text,                   -- e.g. Section 20, Section 31, Care Leaver
  is_asylum_seeker      boolean not null default false,
  -- Capacity
  has_mental_capacity   boolean not null default true,
  mca_assessment_date   date,
  -- Medical
  nhs_number            text,
  gp_name               text,
  gp_practice           text,
  gp_phone              text,
  gp_address            text,
  blood_type            text,
  allergies             text[],
  medical_conditions    text[],
  -- Key contacts
  key_worker_id         uuid references profiles(id) on delete set null,
  -- Next of kin
  nok_name              text,
  nok_relationship      text,
  nok_phone             text,
  nok_email             text,
  nok_address           text,
  nok_is_emergency_contact boolean not null default true,
  -- Meta
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Links social workers, IROs, and other professionals to a service user
create table service_user_professionals (
  id                uuid primary key default gen_random_uuid(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  professional_id   uuid references profiles(id) on delete set null,   -- internal user
  external_name     text,                                               -- external professional not in system
  external_email    text,
  external_phone    text,
  external_org      text,
  role              text not null,                                      -- 'social_worker', 'IRO', 'CAMHS', 'probation', etc.
  is_primary        boolean not null default false,
  assigned_at       timestamptz not null default now()
);

-- =============================================
-- SHIFTS
-- =============================================

create table shifts (
  id              uuid primary key default gen_random_uuid(),
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

-- Which service users were present during a shift
create table shift_service_users (
  id              uuid primary key default gen_random_uuid(),
  shift_id        uuid not null references shifts(id) on delete cascade,
  service_user_id uuid not null references service_users(id) on delete cascade,
  unique(shift_id, service_user_id)
);

-- =============================================
-- DAILY LOGS (per service user, per shift)
-- =============================================

create table daily_logs (
  id                  uuid primary key default gen_random_uuid(),
  home_id             uuid not null references homes(id),
  service_user_id     uuid not null references service_users(id) on delete cascade,
  shift_id            uuid references shifts(id) on delete set null,
  written_by          uuid not null references profiles(id),
  log_date            date not null,
  -- Wellbeing
  mood_rating         int check (mood_rating between 1 and 5),          -- 1=very low, 5=very positive
  mood_notes          text,
  physical_health     text,
  sleep_quality       text,
  appetite            text,
  -- Activities
  activities          text,
  community_access    boolean not null default false,
  education_work      text,
  -- Medication
  medication_notes    text,
  medication_refused  boolean not null default false,
  -- Concerns & flags
  concerns            text,
  is_flagged          boolean not null default false,
  flagged_reason      text,
  is_confidential     boolean not null default false,
  created_at          timestamptz not null default now()
  -- No updated_at — daily logs are immutable once written
);

-- =============================================
-- INCIDENT REPORTS
-- =============================================

create table incident_reports (
  id                      uuid primary key default gen_random_uuid(),
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
  -- Notifications
  police_notified         boolean not null default false,
  police_reference        text,
  social_worker_notified  boolean not null default false,
  manager_notified        boolean not null default false,
  parent_nok_notified     boolean not null default false,
  ofsted_reportable       boolean not null default false,
  ofsted_notified_at      timestamptz,
  -- Follow-up
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

-- People involved in an incident (can be multiple)
create table incident_involved_parties (
  id              uuid primary key default gen_random_uuid(),
  incident_id     uuid not null references incident_reports(id) on delete cascade,
  service_user_id uuid references service_users(id) on delete set null,
  staff_id        uuid references profiles(id) on delete set null,
  external_name   text,
  role_in_incident text not null  -- 'victim', 'perpetrator', 'witness', 'bystander'
);

-- =============================================
-- INTERACTION TIMELINE
-- =============================================

create table interaction_timeline (
  id              uuid primary key default gen_random_uuid(),
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

-- =============================================
-- DOCUMENTS
-- =============================================

create table documents (
  id                uuid primary key default gen_random_uuid(),
  home_id           uuid not null references homes(id),
  service_user_id   uuid references service_users(id) on delete cascade,  -- null = home-level doc
  document_type     document_type not null,
  title             text not null,
  description       text,
  file_url          text not null,                                          -- Supabase Storage signed URL
  file_name         text not null,
  file_size_bytes   int,
  mime_type         text,
  document_date     date,
  expiry_date       date,
  created_by        uuid not null references profiles(id),
  countersigned_by  uuid references profiles(id),
  countersigned_at  timestamptz,
  is_confidential   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================
-- HANDOVER NOTES
-- =============================================

create table handover_notes (
  id                  uuid primary key default gen_random_uuid(),
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

-- =============================================
-- MEETINGS
-- =============================================

create table meetings (
  id              uuid primary key default gen_random_uuid(),
  home_id         uuid not null references homes(id),
  service_user_id uuid references service_users(id) on delete set null, -- null = staff/team meeting
  meeting_type    meeting_type not null,
  title           text not null,
  scheduled_at    timestamptz not null,
  location        text,
  minutes         text,
  action_points   jsonb,                        -- [{task, assigned_to, due_date, completed}]
  chaired_by      uuid references profiles(id),
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Meeting attendees
create table meeting_attendees (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references meetings(id) on delete cascade,
  profile_id      uuid references profiles(id) on delete set null,
  external_name   text,
  external_role   text,
  external_org    text,
  attended        boolean not null default true,
  apologies       boolean not null default false,
  unique(meeting_id, profile_id)
);

-- =============================================
-- MEDICATIONS (MAR Charts)
-- =============================================

create table medications (
  id                    uuid primary key default gen_random_uuid(),
  service_user_id       uuid not null references service_users(id) on delete cascade,
  home_id               uuid not null references homes(id),
  medication_name       text not null,
  generic_name          text,
  dose                  text not null,
  route                 text not null,
  frequency             text not null,
  prescribed_by         text,
  pharmacy              text,
  start_date            date not null,
  end_date              date,
  is_prn                boolean not null default false,
  is_controlled         boolean not null default false,
  is_active             boolean not null default true,
  storage_instructions  text,
  special_instructions  text,
  created_by            uuid not null references profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- MAR entries (each administration event)
create table mar_entries (
  id                uuid primary key default gen_random_uuid(),
  medication_id     uuid not null references medications(id) on delete cascade,
  service_user_id   uuid not null references service_users(id),
  administered_by   uuid not null references profiles(id),
  administered_at   timestamptz not null,
  dose_given        text not null,
  outcome           text not null default 'administered', -- administered, refused, omitted, not_available
  refusal_reason    text,
  omission_reason   text,
  notes             text,
  witnessed_by      uuid references profiles(id),
  created_at        timestamptz not null default now()
);

-- =============================================
-- CARE PLANS
-- =============================================

create table care_plans (
  id                uuid primary key default gen_random_uuid(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  home_id           uuid not null references homes(id),
  title             text not null,
  plan_type         text not null, -- 'Health & Wellbeing', 'Risk Assessment', 'Pathway Plan', etc.
  content           jsonb,
  status            care_plan_status not null default 'draft',
  review_date       date,
  last_reviewed_by  uuid references profiles(id),
  last_reviewed_at  timestamptz,
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- =============================================
-- ALERTS
-- =============================================

create table alerts (
  id                uuid primary key default gen_random_uuid(),
  home_id           uuid not null references homes(id),
  alert_type        alert_type not null,
  title             text not null,
  message           text,
  -- Linked records (optional — whichever is relevant)
  service_user_id   uuid references service_users(id) on delete cascade,
  incident_id       uuid references incident_reports(id) on delete cascade,
  document_id       uuid references documents(id) on delete cascade,
  medication_id     uuid references medications(id) on delete cascade,
  handover_id       uuid references handover_notes(id) on delete cascade,
  profile_id        uuid references profiles(id) on delete cascade,       -- e.g. DBS expiry alert
  triggered_at      timestamptz not null default now(),
  is_resolved       boolean not null default false,
  resolved_at       timestamptz,
  resolved_by       uuid references profiles(id),
  resolution_notes  text,
  created_at        timestamptz not null default now()
);

-- =============================================
-- AUDIT LOG (immutable — tracks all mutations)
-- =============================================

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  action      text not null,         -- INSERT, UPDATE, DELETE, VIEW, EXPORT, LOGIN
  table_name  text not null,
  record_id   uuid,
  old_values  jsonb,
  new_values  jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- =============================================
-- INDEXES (performance for common queries)
-- =============================================

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

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

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

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

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
