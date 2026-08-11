-- =============================================
-- INSPIRE HOMES — Shift Schedule
-- Migration: 00007_shift_schedule
-- =============================================

-- Add clocked_in_at to distinguish between:
--   scheduled (pre-entered from Sling): clocked_in_at IS NULL  → shows RED on schedule
--   clocked in (staff started shift):   clocked_in_at IS NOT NULL → shows GREEN on schedule
alter table shifts add column if not exists clocked_in_at timestamptz;

-- Back-fill: existing shifts created via direct clock-in are already "clocked in"
-- (start_time was set at the moment of clock-in)
update shifts set clocked_in_at = start_time where clocked_in_at is null and start_time <= now();
