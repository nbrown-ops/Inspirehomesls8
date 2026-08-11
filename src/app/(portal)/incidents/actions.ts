'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractPayload(fd: FormData) {
  const str  = (k: string) => (fd.get(k) as string)?.trim() || null
  const bool = (k: string) => fd.get(k) === 'true'

  return {
    service_user_id:        str('service_user_id') || null,
    incident_type:          str('incident_type')!,
    severity:               str('severity')!,
    occurred_at:            str('occurred_at'),
    location:               str('location'),
    description:            str('description')!,
    immediate_action:       str('immediate_action'),
    injuries_sustained:     bool('injuries_sustained'),
    injury_details:         bool('injuries_sustained') ? str('injury_details') : null,
    safeguarding_concern:   str('safeguarding_concern'),
    police_notified:        bool('police_notified'),
    police_reference:       bool('police_notified') ? str('police_reference') : null,
    social_worker_notified: bool('social_worker_notified'),
    manager_notified:       bool('manager_notified'),
    parent_nok_notified:    bool('parent_nok_notified'),
    ofsted_reportable:      bool('ofsted_reportable'),
    cqc_reportable:         bool('cqc_reportable'),
    follow_up_required:     bool('follow_up_required'),
    follow_up_notes:        bool('follow_up_required') ? str('follow_up_notes') : null,
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createIncidentAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const payload = extractPayload(formData)

  // Resolve home_id from resident if provided
  let homeId: string | null = null
  if (payload.service_user_id) {
    const { data: su } = await supabase
      .from('service_users')
      .select('home_id')
      .eq('id', payload.service_user_id)
      .single()
    homeId = su?.home_id ?? null
  }
  if (!homeId) {
    // Fall back to the user's first home assignment
    const { data: ha } = await supabase
      .from('user_home_assignments')
      .select('home_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    homeId = ha?.home_id ?? null
  }
  if (!homeId) return { error: 'Could not determine the home for this incident.' }

  const { data, error } = await supabase
    .from('incident_reports')
    .insert({
      ...payload,
      home_id:     homeId,
      reported_by: user.id,
      status:      'open',
      incident_date: payload.occurred_at ? new Date(payload.occurred_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Alert for high/critical
  if (['critical', 'high'].includes(payload.severity)) {
    await supabase.from('alerts').insert({
      home_id:         homeId,
      alert_type:      'incident_flagged',
      title:           `${payload.severity.toUpperCase()} incident — ${payload.incident_type.replace(/_/g, ' ')}`,
      message:         payload.description?.slice(0, 200) ?? '',
      service_user_id: payload.service_user_id,
      profile_id:      user.id,
    })
  }

  // Alert for safeguarding concerns
  if (payload.safeguarding_concern) {
    await supabase.from('alerts').insert({
      home_id:         homeId,
      alert_type:      'safeguarding',
      title:           'Safeguarding concern raised',
      message:         payload.safeguarding_concern.slice(0, 200),
      service_user_id: payload.service_user_id,
      profile_id:      user.id,
    })
  }

  redirect(`/incidents/${data.id}`)
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateIncidentAction(id: string, _prev: unknown, formData: FormData) {
  if (!id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid ID.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const payload = extractPayload(formData)

  const { error } = await supabase
    .from('incident_reports')
    .update({
      ...payload,
      incident_date: payload.occurred_at ? new Date(payload.occurred_at).toISOString().slice(0, 10) : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/incidents/${id}`)
  redirect(`/incidents/${id}`)
}

// ─── Update status ────────────────────────────────────────────────────────────

export async function updateIncidentStatusAction(id: string, status: string, comments?: string) {
  if (!id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid ID.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'closed') {
    updates.closed_at = new Date().toISOString()
    updates.closed_by = user.id
  }

  if (status === 'under_review') {
    updates.reviewed_by_id = user.id
  }

  if (comments) {
    updates.manager_comments = comments
  }

  const { error } = await supabase
    .from('incident_reports')
    .update(updates)
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
  return { success: true }
}

// ─── Manager sign-off ─────────────────────────────────────────────────────────

export async function signOffIncidentAction(id: string, comments: string) {
  if (!id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid ID.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'manager'].includes(profile.role as string)) {
    return { error: 'Only managers can sign off incidents.' }
  }

  const { error } = await supabase
    .from('incident_reports')
    .update({
      manager_sign_off:    user.id,
      manager_sign_off_at: new Date().toISOString(),
      manager_comments:    comments.trim() || null,
      status:              'closed',
      closed_at:           new Date().toISOString(),
      closed_by:           user.id,
      updated_at:          new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { error: error.message }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id:    user.id,
    action:     'INCIDENT_SIGNOFF',
    table_name: 'incident_reports',
    record_id:  id,
    new_values: { manager_comments: comments },
  })

  revalidatePath(`/incidents/${id}`)
  revalidatePath('/incidents')
  return { success: true }
}
