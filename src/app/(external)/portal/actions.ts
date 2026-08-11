'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Leave a note (message to the care team) ────────────────────────────────

export async function leaveNoteAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service_user_id = formData.get('service_user_id') as string
  const body            = (formData.get('body') as string)?.trim()

  if (!body || body.length < 5)  return { error: 'Please write a message (at least 5 characters).' }
  if (body.length > 1000)        return { error: 'Message must be 1000 characters or fewer.' }

  // Look up home_id — RLS will reject if not assigned to this service user
  const { data: su } = await supabase
    .from('service_users')
    .select('home_id, first_name, last_name, key_worker_id')
    .eq('id', service_user_id)
    .single()

  if (!su) return { error: 'Resident not found or not accessible.' }

  // Get the note author's name for the alert
  const { data: author } = await supabase
    .from('profiles')
    .select('full_name, role, job_title')
    .eq('id', user.id)
    .single()

  const { error } = await supabase.from('professional_notes').insert({
    service_user_id,
    home_id:    su.home_id,
    authored_by: user.id,
    body,
  })

  if (error) return { error: error.message }

  // Alert the key worker and manager
  await supabase.from('alerts').insert({
    home_id:         su.home_id,
    alert_type:      'other',
    title:           `New message from ${author?.full_name ?? 'external professional'}`,
    message:         body.slice(0, 200),
    service_user_id,
    profile_id:      su.key_worker_id,
  })

  revalidatePath(`/portal/residents/${service_user_id}`)
  return { success: true }
}

// ─── Request a meeting ────────────────────────────────────────────────────────

export async function requestMeetingAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service_user_id = formData.get('service_user_id') as string
  const proposed_date   = formData.get('proposed_date') as string
  const proposed_time   = (formData.get('proposed_time') as string) || null
  const meeting_type    = (formData.get('meeting_type') as string) || 'professionals_meeting'
  const purpose         = (formData.get('purpose') as string)?.trim()

  if (!proposed_date) return { error: 'Please select a proposed date.' }
  if (!purpose)        return { error: 'Please describe the purpose of the meeting.' }

  const { data: su } = await supabase
    .from('service_users')
    .select('home_id, first_name, last_name')
    .eq('id', service_user_id)
    .single()

  if (!su) return { error: 'Resident not found.' }

  const { data: author } = await supabase
    .from('profiles')
    .select('full_name, job_title')
    .eq('id', user.id)
    .single()

  const { data: req, error } = await supabase
    .from('meeting_requests')
    .insert({
      service_user_id,
      home_id:      su.home_id,
      requested_by: user.id,
      proposed_date,
      proposed_time,
      meeting_type,
      purpose,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Notify the manager/home
  await supabase.from('alerts').insert({
    home_id:         su.home_id,
    alert_type:      'other',
    title:           `Meeting request: ${su.first_name} ${su.last_name}`,
    message:         `${author?.full_name ?? 'An external professional'} has requested a meeting on ${proposed_date}. Purpose: ${purpose}`,
    service_user_id,
    profile_id:      user.id,
  })

  revalidatePath(`/portal/residents/${service_user_id}`)
  return { success: true, requestId: req.id }
}
