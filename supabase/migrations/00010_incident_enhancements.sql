-- Add occurred_at timestamp (cleaner than separate incident_date + incident_time)
alter table incident_reports
  add column if not exists occurred_at timestamptz,
  add column if not exists cqc_reportable boolean not null default false,
  add column if not exists safeguarding_concern text;

-- Back-fill occurred_at from existing incident_date + incident_time where possible
update incident_reports
set occurred_at = (incident_date::text || 'T' || coalesce(incident_time::text, '00:00:00') || 'Z')::timestamptz
where occurred_at is null and incident_date is not null;

-- Make occurred_at default to now for future inserts
alter table incident_reports alter column occurred_at set default now();
