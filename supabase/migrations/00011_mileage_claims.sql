-- Mileage reimbursement claims
-- Staff submit claims when transporting service users for activities.
-- Managers approve or reject. Rate default is £0.45/mile (HMRC approved).

create table mileage_claims (
  id                uuid primary key default gen_random_uuid(),
  staff_id          uuid not null references profiles(id) on delete cascade,
  home_id           uuid references homes(id) on delete set null,
  service_user_id   uuid references service_users(id) on delete set null,
  shift_id          uuid references shifts(id) on delete set null,
  claim_date        date not null,
  miles             numeric(5,1) not null check (miles > 0 and miles <= 500),
  purpose           text not null,
  from_location     text,
  to_location       text,
  rate_per_mile     numeric(4,2) not null default 0.45,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected')),
  staff_notes       text,
  reviewer_id       uuid references profiles(id),
  reviewed_at       timestamptz,
  reviewer_notes    text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index mileage_claims_staff_id_idx   on mileage_claims(staff_id);
create index mileage_claims_status_idx     on mileage_claims(status);
create index mileage_claims_claim_date_idx on mileage_claims(claim_date desc);

-- RLS
alter table mileage_claims enable row level security;

create policy "mileage_claims_select" on mileage_claims for select using (
  staff_id = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager')
);

create policy "mileage_claims_insert" on mileage_claims for insert with check (
  staff_id = auth.uid()
  and public.get_user_role() in ('staff', 'manager', 'super_admin')
);

-- Staff can delete their own pending claims; managers can update (approve/reject)
create policy "mileage_claims_update" on mileage_claims for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (staff_id = auth.uid() and status = 'pending')
);

create policy "mileage_claims_delete" on mileage_claims for delete using (
  staff_id = auth.uid() and status = 'pending'
);
