'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function addTimelineEntryAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service_user_id    = formData.get('service_user_id') as string
  const interaction_type   = formData.get('interaction_type') as string
  const notes              = (formData.get('notes') as string)?.slice(0, 500) || null
  const outcome            = (formData.get('outcome') as string) || null
  const duration_minutes   = Number(formData.get('duration_minutes')) || null
  const is_flagged         = formData.get('is_flagged') === 'true'
  const flagged_reason     = (formData.get('flagged_reason') as string) || null

  const VALID_TYPES = new Set([
    'key_work_session','welfare_check','medication_prompt','activity','community_activity',
    'appointment','medical_appointment','phone_call','visit','incident','handover',
    'safeguarding_concern','positive_achievement','other',
  ])

  if (!service_user_id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid resident.' }
  if (!interaction_type || !VALID_TYPES.has(interaction_type)) return { error: 'Invalid interaction type.' }
  if (!notes?.trim()) return { error: 'Please add a note (max 500 characters).' }

  // Look up the resident's home_id
  const { data: su } = await supabase
    .from('service_users')
    .select('home_id, first_name, last_name')
    .eq('id', service_user_id)
    .single()

  if (!su) return { error: 'Resident not found or not accessible.' }

  const { error } = await supabase.from('interaction_timeline').insert({
    service_user_id,
    home_id:          su.home_id,
    staff_id:         user.id,
    interaction_type,
    occurred_at:      new Date().toISOString(),
    duration_minutes,
    notes,
    outcome,
    is_flagged,
    flagged_reason:   is_flagged ? flagged_reason : null,
  })

  if (error) return { error: error.message }

  // If flagged, raise a manager alert
  if (is_flagged && flagged_reason) {
    await supabase.from('alerts').insert({
      home_id:         su.home_id,
      alert_type:      'incident_flagged',
      title:           `Flagged timeline entry: ${su.first_name} ${su.last_name}`,
      message:         flagged_reason,
      service_user_id,
      profile_id:      user.id,
    })
  }

  revalidatePath(`/residents/${service_user_id}`)
  return { success: true, service_user_id }
}
