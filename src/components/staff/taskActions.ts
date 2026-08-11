'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function createTaskAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'manager'].includes(profile.role)) {
    return { error: 'Only managers can assign tasks.' }
  }

  const title       = (formData.get('title') as string)?.trim()
  const description = (formData.get('description') as string)?.trim() || null
  const priority    = (formData.get('priority') as string) || 'normal'
  const due_date    = (formData.get('due_date') as string) || null
  const assigned_to = formData.get('assigned_to') as string
  const home_id     = formData.get('home_id') as string

  if (!title)       return { error: 'Title is required.' }
  if (!assigned_to) return { error: 'Assigned-to is required.' }
  if (!home_id)     return { error: 'Home ID is required.' }

  const VALID_PRIORITIES = new Set(['low', 'normal', 'high', 'urgent'])
  if (!VALID_PRIORITIES.has(priority)) return { error: 'Invalid priority.' }

  const { data, error } = await supabase
    .from('staff_tasks')
    .insert({
      title,
      description,
      priority,
      due_date:    due_date || null,
      assigned_to,
      assigned_by: user.id,
      home_id,
      status:      'pending',
    })
    .select(`
      id, title, description, priority, status, due_date, created_at,
      completed_at, completion_note,
      assigned_by:profiles!assigned_by(full_name),
      completed_by:profiles!completed_by(full_name)
    `)
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/staff/${assigned_to}`)
  revalidatePath('/tasks')
  return { task: data }
}

export async function completeTaskAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const task_id         = formData.get('task_id') as string
  const completion_note = (formData.get('completion_note') as string)?.trim() || null

  if (!task_id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid task.' }

  // Verify the user is assigned to this task or is a manager
  const { data: task } = await supabase
    .from('staff_tasks')
    .select('id, assigned_to, status')
    .eq('id', task_id)
    .single()

  if (!task) return { error: 'Task not found.' }
  if (task.status === 'completed') return { error: 'Task is already completed.' }
  if (task.status === 'cancelled') return { error: 'Task has been cancelled.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = profile && ['super_admin', 'manager'].includes(profile.role)

  if (task.assigned_to !== user.id && !isManager) {
    return { error: 'You can only sign off your own tasks.' }
  }

  const { error } = await supabase
    .from('staff_tasks')
    .update({
      status:          'completed',
      completed_at:    new Date().toISOString(),
      completed_by:    user.id,
      completion_note,
    })
    .eq('id', task_id)

  if (error) return { error: error.message }

  revalidatePath(`/staff/${task.assigned_to}`)
  revalidatePath('/tasks')
  return { success: true }
}

export async function cancelTaskAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'manager'].includes(profile.role)) {
    return { error: 'Only managers can cancel tasks.' }
  }

  const task_id      = formData.get('task_id') as string
  const cancel_reason = (formData.get('cancel_reason') as string)?.trim() || null

  if (!task_id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid task.' }

  const { data: task } = await supabase.from('staff_tasks').select('assigned_to').eq('id', task_id).single()
  if (!task) return { error: 'Task not found.' }

  const { error } = await supabase
    .from('staff_tasks')
    .update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      cancel_reason,
    })
    .eq('id', task_id)

  if (error) return { error: error.message }

  revalidatePath(`/staff/${task.assigned_to}`)
  revalidatePath('/tasks')
  return { success: true }
}
