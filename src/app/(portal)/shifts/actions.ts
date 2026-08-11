'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ─── Clock in (direct — from clock-in page) ──────────────────────────────────

export async function clockInAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const home_id    = formData.get('home_id') as string
  const shift_type = formData.get('shift_type') as string

  if (!home_id || !shift_type) return { error: 'Please select a property and shift type.' }

  // Check no active shift already open
  const { data: existing } = await supabase
    .from('shifts')
    .select('id')
    .eq('staff_id', user.id)
    .is('end_time', null)
    .single()

  if (existing) {
    redirect(`/shifts/${existing.id}`)
  }

  const now = new Date().toISOString()
  const { data: shift, error } = await supabase
    .from('shifts')
    .insert({ home_id, staff_id: user.id, shift_type, start_time: now, clocked_in_at: now })
    .select('id')
    .single()

  if (error) return { error: error.message }
  redirect(`/shifts/${shift.id}`)
}

// ─── Add shift to schedule (pre-schedule from Sling) ─────────────────────────

export async function scheduleShiftAction(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const home_id    = formData.get('home_id') as string
  const shift_type = formData.get('shift_type') as string
  const start_time = formData.get('start_time') as string
  const end_time   = formData.get('end_time') as string
  const staff_id   = (formData.get('staff_id') as string) || user.id

  if (!home_id || !shift_type || !start_time) {
    return { error: 'Property, shift type and date are required.' }
  }

  // Staff can only add their own shifts
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = profile && ['super_admin', 'manager'].includes(profile.role)
  if (staff_id !== user.id && !isManager) return { error: 'You can only schedule your own shifts.' }

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      home_id,
      staff_id,
      shift_type,
      start_time,
      end_time:      end_time || null,
      clocked_in_at: null, // will be set when they physically clock in
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath('/shifts/schedule')
  return { shiftId: data.id }
}

// ─── Clock in from schedule (mark pre-scheduled shift as started) ─────────────

export async function clockInScheduledShiftAction(shiftId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!shiftId.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid shift.' }

  // Verify shift belongs to this user (or user is manager)
  const { data: shift } = await supabase
    .from('shifts')
    .select('id, staff_id, clocked_in_at')
    .eq('id', shiftId)
    .single()

  if (!shift) return { error: 'Shift not found.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isManager = profile && ['super_admin', 'manager'].includes(profile.role)

  if (shift.staff_id !== user.id && !isManager) return { error: 'Not your shift.' }
  if (shift.clocked_in_at) return { error: 'Already clocked in.' }

  const { error } = await supabase
    .from('shifts')
    .update({ clocked_in_at: new Date().toISOString() })
    .eq('id', shiftId)

  if (error) return { error: error.message }
  revalidatePath('/shifts/schedule')
  revalidatePath('/shifts')
  return { success: true }
}

// ─── Clock out ────────────────────────────────────────────────────────────────

export async function clockOutAction(shiftId: string) {
  const supabase = createClient()

  // Check handover exists before allowing clock out
  const { data: handover } = await supabase
    .from('handover_notes')
    .select('id')
    .eq('outgoing_shift_id', shiftId)
    .single()

  if (!handover) {
    return { error: 'Please complete a handover note before clocking out.' }
  }

  const { error } = await supabase
    .from('shifts')
    .update({ end_time: new Date().toISOString() })
    .eq('id', shiftId)

  if (error) return { error: error.message }
  revalidatePath('/shifts')
  redirect('/shifts')
}

// ─── Add daily log ────────────────────────────────────────────────────────────

export async function addDailyLogAction(shiftId: string, homeId: string, _prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const service_user_id  = formData.get('service_user_id') as string
  const mood_rating      = Number(formData.get('mood_rating')) || null
  const is_flagged       = formData.get('is_flagged') === 'true'
  const flagged_reason   = (formData.get('flagged_reason') as string) || null

  const payload = {
    home_id:            homeId,
    service_user_id,
    shift_id:           shiftId,
    written_by:         user.id,
    log_date:           new Date().toISOString().split('T')[0],
    mood_rating:        mood_rating as 1 | 2 | 3 | 4 | 5 | null,
    mood_notes:         (formData.get('mood_notes') as string) || null,
    physical_health:    (formData.get('physical_health') as string) || null,
    sleep_quality:      (formData.get('sleep_quality') as string) || null,
    appetite:           (formData.get('appetite') as string) || null,
    activities:         (formData.get('activities') as string) || null,
    community_access:   formData.get('community_access') === 'true',
    education_work:     (formData.get('education_work') as string) || null,
    medication_notes:   (formData.get('medication_notes') as string) || null,
    medication_refused: formData.get('medication_refused') === 'true',
    concerns:           (formData.get('concerns') as string) || null,
    is_flagged,
    flagged_reason,
    is_confidential:    formData.get('is_confidential') === 'true',
  }

  const { error } = await supabase.from('daily_logs').insert(payload)
  if (error) return { error: error.message }

  // Add resident to shift_service_users if not already there
  await supabase
    .from('shift_service_users')
    .upsert({ shift_id: shiftId, service_user_id }, { onConflict: 'shift_id,service_user_id', ignoreDuplicates: true })

  // If flagged, create manager alert
  if (is_flagged && flagged_reason) {
    const { data: su } = await supabase
      .from('service_users')
      .select('first_name, last_name')
      .eq('id', service_user_id)
      .single()

    await supabase.from('alerts').insert({
      home_id:         homeId,
      alert_type:      'incident_flagged',
      title:           `Flagged daily log: ${su?.first_name ?? ''} ${su?.last_name ?? ''}`.trim(),
      message:         flagged_reason,
      service_user_id,
      profile_id:      user.id,
    })
  }

  revalidatePath(`/shifts/${shiftId}`)
  return { success: true }
}

// ─── Submit handover ─────────────────────────────────────────────────────────

export async function submitHandoverAction(shiftId: string, homeId: string, _prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const incoming_staff_id = (formData.get('incoming_staff_id') as string) || null
  const summary           = formData.get('summary') as string
  const urgent_actions    = (formData.get('urgent_actions') as string) || null
  const medication_notes  = (formData.get('medication_notes') as string) || null
  const incidents_summary = (formData.get('incidents_summary') as string) || null

  if (!summary?.trim()) return { error: 'Please write a handover summary.' }

  const { data: handover, error } = await supabase
    .from('handover_notes')
    .insert({
      home_id: homeId,
      outgoing_shift_id: shiftId,
      outgoing_staff_id: user.id,
      incoming_staff_id,
      handover_time: new Date().toISOString(),
      summary,
      urgent_actions,
      medication_notes,
      incidents_summary,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Create alert for incoming staff (or general home alert if no specific incoming staff)
  await supabase.from('alerts').insert({
    home_id: homeId,
    alert_type:  'handover_unacknowledged',
    title:       'Shift handover awaiting acknowledgement',
    message:     summary,
    handover_id: handover.id,
    profile_id:  incoming_staff_id,
  })

  revalidatePath(`/shifts/${shiftId}`)
  redirect(`/shifts/${shiftId}`)
}

// ─── Acknowledge handover ─────────────────────────────────────────────────────

export async function acknowledgeHandoverAction(handoverId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('handover_notes')
    .update({
      is_acknowledged:  true,
      acknowledged_at:  new Date().toISOString(),
      acknowledged_by:  user.id,
    })
    .eq('id', handoverId)

  if (error) return { error: error.message }

  // Resolve the alert
  await supabase
    .from('alerts')
    .update({ is_resolved: true, resolved_at: new Date().toISOString(), resolved_by: user.id })
    .eq('handover_id', handoverId)
    .eq('is_resolved', false)

  revalidatePath('/shifts')
  return { success: true }
}
