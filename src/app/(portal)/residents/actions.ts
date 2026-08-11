'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ─── Create resident ────────────────────────────────────────────────────────

export async function createResidentAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const payload = extractResidentPayload(formData)
  const { error, data } = await supabase
    .from('service_users')
    .insert({ ...payload, created_by: user.id })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await saveProfessionals(supabase, data.id, formData)

  redirect(`/residents/${data.id}`)
}

// ─── Update resident ────────────────────────────────────────────────────────

export async function updateResidentAction(id: string, _prev: unknown, formData: FormData) {
  // Validate UUID to prevent path traversal
  if (!id?.match(/^[0-9a-f-]{36}$/i)) return { error: 'Invalid ID' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Role check — RLS also enforces this, but fail fast
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'manager'].includes(profile.role as string)) {
    return { error: 'You do not have permission to edit residents' }
  }

  const payload = extractResidentPayload(formData)

  const { error } = await supabase
    .from('service_users')
    .update(payload)
    .eq('id', id)

  if (error) return { error: error.message }

  await saveProfessionals(supabase, id, formData)

  revalidatePath(`/residents/${id}`)
  redirect(`/residents/${id}`)
}

// ─── Flag for safeguarding ──────────────────────────────────────────────────

export async function flagSafeguardingAction(
  serviceUserId: string,
  homeId: string,
  reason: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Get resident's name for the alert title
  const { data: su } = await supabase
    .from('service_users')
    .select('first_name, last_name')
    .eq('id', serviceUserId)
    .single()

  const name = su ? `${su.first_name} ${su.last_name}` : 'Unknown'

  const { error } = await supabase
    .from('alerts')
    .insert({
      home_id:         homeId,
      alert_type:      'safeguarding',
      title:           `Safeguarding concern raised for ${name}`,
      message:         reason,
      service_user_id: serviceUserId,
      profile_id:      user.id,
    })

  if (error) return { error: error.message }

  // Audit trail
  await supabase.from('audit_logs').insert({
    user_id:    user.id,
    action:     'SAFEGUARDING_FLAG',
    table_name: 'service_users',
    record_id:  serviceUserId,
    new_values: { reason },
  })

  revalidatePath(`/residents/${serviceUserId}`)
  return { success: true }
}

// ─── Professionals ──────────────────────────────────────────────────────────

async function saveProfessionals(supabase: ReturnType<typeof createClient>, residentId: string, formData: FormData) {
  const str = (key: string) => (formData.get(key) as string)?.trim() || null

  // Delete existing professionals for this resident (full replace)
  await supabase.from('service_user_professionals').delete().eq('service_user_id', residentId)

  const rows: object[] = []

  const swName = str('sw_name')
  if (swName) {
    rows.push({
      service_user_id: residentId,
      role:            'Social Worker',
      external_name:   swName,
      external_email:  str('sw_email'),
      external_phone:  str('sw_phone'),
      external_org:    str('sw_org'),
      is_primary:      true,
    })
  }

  const paName = str('pa_name')
  if (paName) {
    rows.push({
      service_user_id: residentId,
      role:            'Personal Advisor',
      external_name:   paName,
      external_email:  str('pa_email'),
      external_phone:  str('pa_phone'),
      external_org:    str('pa_org'),
      is_primary:      false,
    })
  }

  try {
    const others = JSON.parse(formData.get('other_professionals') as string ?? '[]') as {
      role: string; name: string; org: string; phone: string; email: string
    }[]
    for (const p of others) {
      if (!p.name && !p.role) continue
      rows.push({
        service_user_id: residentId,
        role:            p.role || 'Other',
        external_name:   p.name || null,
        external_email:  p.email || null,
        external_phone:  p.phone || null,
        external_org:    p.org  || null,
        is_primary:      false,
      })
    }
  } catch { /* malformed JSON — skip */ }

  if (rows.length > 0) {
    await supabase.from('service_user_professionals').insert(rows)
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractResidentPayload(formData: FormData) {
  const str   = (key: string) => (formData.get(key) as string) || null
  const bool  = (key: string) => formData.get(key) === 'true'

  return {
    home_id:               str('home_id')!,
    first_name:            str('first_name')!,
    last_name:             str('last_name')!,
    preferred_name:        str('preferred_name'),
    date_of_birth:         str('date_of_birth')!,
    gender:                str('gender'),
    pronouns:              str('pronouns'),
    nationality:           str('nationality'),
    ethnicity:             str('ethnicity'),
    first_language:        str('first_language'),
    religion:              str('religion'),
    placement_start_date:  str('placement_start_date')!,
    placement_end_date:    str('placement_end_date'),
    status:                (str('status') as string) || 'active',
    placement_type:        (str('placement_type') as string) || 'supported_living',
    room_number:           str('room_number'),
    local_authority:       str('local_authority'),
    legal_status:          str('legal_status'),
    is_asylum_seeker:      bool('is_asylum_seeker'),
    has_mental_capacity:   formData.get('has_mental_capacity') !== 'false',
    mca_assessment_date:   str('mca_assessment_date'),
    nhs_number:            str('nhs_number'),
    gp_name:               str('gp_name'),
    gp_practice:           str('gp_practice'),
    gp_phone:              str('gp_phone'),
    gp_address:            str('gp_address'),
    blood_type:            str('blood_type'),
    allergies:             str('allergies') ? str('allergies')!.split(',').map(s => s.trim()).filter(Boolean) : null,
    medical_conditions:    str('medical_conditions') ? str('medical_conditions')!.split('\n').map(s => s.trim()).filter(Boolean) : null,
    key_worker_id:         str('key_worker_id'),
    nok_name:              str('nok_name'),
    nok_relationship:      str('nok_relationship'),
    nok_phone:             str('nok_phone'),
    nok_email:             str('nok_email'),
    nok_address:           str('nok_address'),
    nok_is_emergency_contact: formData.get('nok_is_emergency_contact') !== 'false',
  }
}
