'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ─── Add training record ─────────────────────────────────────────────────────

export async function addTrainingAction(staffId: string, _prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const training_name    = formData.get('training_name') as string
  const category_id      = (formData.get('category_id') as string) || null
  const completed_date   = formData.get('completed_date') as string
  const expiry_date      = (formData.get('expiry_date') as string) || null
  const provider         = (formData.get('provider') as string) || null
  const notes            = (formData.get('notes') as string) || null

  if (!training_name || !completed_date) return { error: 'Training name and completed date are required.' }

  const { error } = await supabase.from('staff_training_records').insert({
    staff_id: staffId,
    training_name,
    category_id,
    completed_date,
    expiry_date,
    provider,
    notes,
    created_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/staff/${staffId}`)
  return { success: true }
}

// ─── Add supervision record ──────────────────────────────────────────────────

export async function addSupervisionAction(staffId: string, _prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const supervision_date   = formData.get('supervision_date') as string
  const type               = (formData.get('type') as string) || 'individual'
  const duration_minutes   = Number(formData.get('duration_minutes')) || null
  const topics             = (formData.get('topics') as string) || null
  const notes              = (formData.get('notes') as string) || null
  const actions            = (formData.get('actions') as string) || null

  if (!supervision_date) return { error: 'Supervision date is required.' }

  const { error } = await supabase.from('staff_supervisions').insert({
    staff_id:        staffId,
    supervisor_id:   user.id,
    supervision_date,
    type,
    duration_minutes,
    topics,
    notes,
    actions,
  })

  if (error) return { error: error.message }
  revalidatePath(`/staff/${staffId}`)
  return { success: true }
}

// ─── Add appraisal ───────────────────────────────────────────────────────────

export async function addAppraisalAction(staffId: string, _prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const appraisal_date     = formData.get('appraisal_date') as string
  const period_start       = (formData.get('period_start') as string) || null
  const period_end         = (formData.get('period_end') as string) || null
  const overall_rating     = (formData.get('overall_rating') as string) || null
  const strengths          = (formData.get('strengths') as string) || null
  const development_areas  = (formData.get('development_areas') as string) || null
  const notes              = (formData.get('notes') as string) || null

  if (!appraisal_date) return { error: 'Appraisal date is required.' }

  const { error } = await supabase.from('staff_appraisals').insert({
    staff_id:         staffId,
    appraiser_id:     user.id,
    appraisal_date,
    period_start,
    period_end,
    overall_rating,
    strengths,
    development_areas,
    notes,
  })

  if (error) return { error: error.message }
  revalidatePath(`/staff/${staffId}`)
  return { success: true }
}

// ─── Update staff profile ────────────────────────────────────────────────────

export async function updateStaffProfileAction(staffId: string, formData: FormData) {
  const supabase = createClient()

  const payload = {
    full_name:                     formData.get('full_name') as string,
    preferred_name:                (formData.get('preferred_name') as string) || null,
    job_title:                     (formData.get('job_title') as string) || null,
    phone:                         (formData.get('phone') as string) || null,
    employment_start_date:         (formData.get('employment_start_date') as string) || null,
    contracted_hours:              Number(formData.get('contracted_hours')) || null,
    dbs_certificate_number:        (formData.get('dbs_certificate_number') as string) || null,
    dbs_issue_date:                (formData.get('dbs_issue_date') as string) || null,
    dbs_expiry_date:               (formData.get('dbs_expiry_date') as string) || null,
    dbs_update_service:            formData.get('dbs_update_service') === 'true',
    emergency_contact_name:        (formData.get('emergency_contact_name') as string) || null,
    emergency_contact_phone:       (formData.get('emergency_contact_phone') as string) || null,
    emergency_contact_relationship:(formData.get('emergency_contact_relationship') as string) || null,
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', staffId)
  if (error) return { error: error.message }
  revalidatePath(`/staff/${staffId}`)
  return { success: true }
}

// ─── Sign off supervision ─────────────────────────────────────────────────────

export async function signOffSupervisionAction(supervisionId: string, staffId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('staff_supervisions')
    .update({ signed_off_by: user.id, signed_off_at: new Date().toISOString() })
    .eq('id', supervisionId)

  if (error) return { error: error.message }
  revalidatePath(`/staff/${staffId}`)
  return { success: true }
}
