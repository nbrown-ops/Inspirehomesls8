-- =============================================
-- INSPIRE HOMES — External Professional Portal
-- Migration: 00004_external_portal
-- =============================================

-- ─── Professional notes (messages to the care team) ────────────────────────
-- Social workers, IROs, CAMHS etc. can leave a message on a resident's record.
-- Staff see it as a notification; it creates an auditable record.

create table professional_notes (
  id                uuid primary key default gen_random_uuid(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  home_id           uuid not null references homes(id),
  authored_by       uuid not null references profiles(id),          -- the external professional
  body              text not null,
  is_read           boolean not null default false,
  read_by           uuid references profiles(id),
  read_at           timestamptz,
  created_at        timestamptz not null default now()
  -- Immutable once written
);

create index on professional_notes (service_user_id, created_at desc);
create index on professional_notes (home_id, is_read) where is_read = false;

-- ─── Meeting requests ───────────────────────────────────────────────────────

create type meeting_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table meeting_requests (
  id                uuid primary key default gen_random_uuid(),
  service_user_id   uuid not null references service_users(id) on delete cascade,
  home_id           uuid not null references homes(id),
  requested_by      uuid not null references profiles(id),          -- external professional
  proposed_date     date not null,
  proposed_time     time,
  meeting_type      meeting_type not null default 'professionals_meeting',
  purpose           text not null,
  status            meeting_request_status not null default 'pending',
  response_note     text,                                            -- manager's reply
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

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table professional_notes  enable row level security;
alter table meeting_requests    enable row level security;

-- Professional notes: social worker can insert/read their own; staff/manager can read all for their home
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

-- Immutable — no edits or deletes
create policy "prof_notes_no_update" on professional_notes for update using (false);
create policy "prof_notes_no_delete" on professional_notes for delete using (false);

-- Staff can mark as read
create policy "prof_notes_mark_read" on professional_notes for update
  using (home_id = any(public.get_user_home_ids()) or public.get_user_role() = 'super_admin')
  with check (true);

-- Meeting requests
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

-- Social worker can cancel their own; manager can accept/decline
create policy "meeting_req_update" on meeting_requests for update using (
  (requested_by = auth.uid() and status = 'pending')
  or public.get_user_role() in ('super_admin', 'manager')
);

-- ─── Add professional_notes to Realtime ─────────────────────────────────────
alter publication supabase_realtime add table professional_notes;
alter publication supabase_realtime add table meeting_requests;
