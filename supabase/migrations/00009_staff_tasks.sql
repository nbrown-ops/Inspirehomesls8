-- =============================================
-- INSPIRE HOMES — Staff Task Management
-- Migration: 00009_staff_tasks
-- Managers assign tasks to staff; staff sign off on completion.
-- =============================================

create type task_priority as enum ('low', 'normal', 'high', 'urgent');
create type task_status   as enum ('pending', 'in_progress', 'completed', 'cancelled');

create table staff_tasks (
  id              uuid primary key default gen_random_uuid(),
  home_id         uuid not null references homes(id) on delete cascade,
  assigned_to     uuid not null references profiles(id) on delete cascade,
  assigned_by     uuid not null references profiles(id) on delete set null,
  title           text not null,
  description     text,
  priority        task_priority not null default 'normal',
  status          task_status   not null default 'pending',
  due_date        date,
  -- Sign-off fields
  completed_at    timestamptz,
  completed_by    uuid references profiles(id) on delete set null,
  completion_note text,
  -- Cancel
  cancelled_at    timestamptz,
  cancelled_by    uuid references profiles(id) on delete set null,
  cancel_reason   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on staff_tasks (home_id);
create index on staff_tasks (assigned_to);
create index on staff_tasks (status);
create index on staff_tasks (due_date);

-- Auto-update updated_at
create trigger trg_staff_tasks_updated_at
  before update on staff_tasks
  for each row execute function update_updated_at();

-- RLS
alter table staff_tasks enable row level security;

-- Staff can see their own tasks + managers see all tasks in their home
create policy "staff_tasks_select" on staff_tasks for select using (
  assigned_to = auth.uid()
  or public.get_user_role() in ('super_admin', 'manager', 'auditor')
);

-- Only managers and above can create tasks
create policy "staff_tasks_insert" on staff_tasks for insert with check (
  public.get_user_role() in ('super_admin', 'manager')
  and home_id = any(public.get_user_home_ids())
);

-- Managers can update any field; staff can only update status/completion fields on their own tasks
create policy "staff_tasks_update" on staff_tasks for update using (
  public.get_user_role() in ('super_admin', 'manager')
  or (
    assigned_to = auth.uid()
    and status != 'cancelled'
  )
);

-- Only managers can delete/cancel
create policy "staff_tasks_delete" on staff_tasks for delete using (
  public.get_user_role() in ('super_admin', 'manager')
);
