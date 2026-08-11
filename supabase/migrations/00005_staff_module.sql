-- =============================================
-- INSPIRE HOMES — Staff Management Module
-- Migration: 00005_staff_module
-- =============================================

-- ─── Mandatory training categories ──────────────────────────────────────────
-- These are the categories that generate gaps/alerts when expired.

create table mandatory_training_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  valid_for_months int not null default 12,   -- how long the training is valid
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

-- ─── Staff training records ──────────────────────────────────────────────────

create table staff_training_records (
  id                  uuid primary key default gen_random_uuid(),
  staff_id            uuid not null references profiles(id) on delete cascade,
  training_name       text not null,
  category_id         uuid references mandatory_training_categories(id),
  completed_date      date not null,
  expiry_date         date,
  provider            text,
  certificate_url     text,   -- Supabase Storage
  notes               text,
  created_by          uuid not null references profiles(id),
  created_at          timestamptz not null default now()
);

create index on staff_training_records (staff_id, expiry_date);
create index on staff_training_records (expiry_date) where expiry_date is not null;

-- ─── Supervision records ──────────────────────────────────────────────────────

create table staff_supervisions (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references profiles(id) on delete cascade,
  supervisor_id   uuid not null references profiles(id),
  supervision_date date not null,
  duration_minutes int,
  type            text not null default 'individual',   -- individual, group, informal
  topics          text,
  notes           text,
  actions         text,       -- agreed action points
  signed_off_by   uuid references profiles(id),
  signed_off_at   timestamptz,
  created_at      timestamptz not null default now()
);

create index on staff_supervisions (staff_id, supervision_date desc);

-- ─── Appraisal records ───────────────────────────────────────────────────────

create table staff_appraisals (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references profiles(id) on delete cascade,
  appraiser_id    uuid not null references profiles(id),
  appraisal_date  date not null,
  period_start    date,
  period_end      date,
  overall_rating  text,       -- 'excellent', 'good', 'satisfactory', 'requires_improvement'
  strengths       text,
  development_areas text,
  objectives      jsonb,      -- [{title, target_date, completed}]
  notes           text,
  signed_by_staff boolean not null default false,
  signed_at       timestamptz,
  created_at      timestamptz not null default now()
);

create index on staff_appraisals (staff_id, appraisal_date desc);

-- ─── Staff emergency contacts ─────────────────────────────────────────────────

create table staff_emergency_contacts (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references profiles(id) on delete cascade,
  name            text not null,
  relationship    text not null,
  phone           text not null,
  phone_alt       text,
  created_at      timestamptz not null default now()
);

-- ─── Add contracted_hours to profiles (if not already set) ───────────────────

alter table profiles add column if not exists contracted_hours numeric(4,1);
alter table profiles add column if not exists emergency_contact_name text;
alter table profiles add column if not exists emergency_contact_phone text;
alter table profiles add column if not exists emergency_contact_relationship text;

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table mandatory_training_categories  enable row level security;
alter table staff_training_records         enable row level security;
alter table staff_supervisions             enable row level security;
alter table staff_appraisals               enable row level security;
alter table staff_emergency_contacts       enable row level security;

-- Training categories: readable by all authenticated, writable by super_admin
create policy "training_cats_select" on mandatory_training_categories for select using (auth.uid() is not null);
create policy "training_cats_write"  on mandatory_training_categories for all   using (public.get_user_role() = 'super_admin');

-- Training records: staff see own, managers see their home's staff
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

-- Supervision: staff see own, managers see all
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

-- Appraisals: staff see own, managers see all
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

-- Emergency contacts: staff see own, managers see all
create policy "emergency_contacts_select" on staff_emergency_contacts for select using (
  staff_id = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager')
);
create policy "emergency_contacts_write" on staff_emergency_contacts for all using (
  staff_id = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager')
);
