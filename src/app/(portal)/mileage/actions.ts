'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function submitMileageClaimAction(_prev: unknown, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, user_home_assignments(home_id)')
    .eq('id', user.id)
    .single()

  if (!profile || !['staff', 'manager', 'super_admin'].includes(profile.role as string)) {
    return { error: 'Not authorised' }
  }

  const claim_date      = formData.get('claim_date') as string
  const miles_str       = formData.get('miles') as string
  const purpose         = (formData.get('purpose') as string)?.trim()
  const from_location   = (formData.get('from_location') as string)?.trim() || null
  const to_location     = (formData.get('to_location') as string)?.trim() || null
  const service_user_id = (formData.get('service_user_id') as string) || null
  const staff_notes     = (formData.get('staff_notes') as string)?.trim() || null
  const home_id         = (formData.get('home_id') as string) || null

  if (!claim_date) return { error: 'Please select a date.' }
  if (!purpose)    return { error: 'Please describe the purpose of the journey.' }

  const miles = parseFloat(miles_str)
  if (isNaN(miles) || miles <= 0) return { error: 'Please enter a valid mileage (must be greater than 0).' }
  if (miles > 500)                return { error: 'Mileage cannot exceed 500 miles per claim.' }

  const { data: claim, error } = await supabase
    .from('mileage_claims')
    .insert({
      staff_id: user.id,
      home_id,
      service_user_id: service_user_id || null,
      claim_date,
      miles,
      purpose,
      from_location,
      to_location,
      staff_notes,
      rate_per_mile: 0.45,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  revalidatePath('/mileage')
  redirect(`/mileage/${claim.id}`)
}

export async function reviewMileageClaimAction(
  claimId: string,
  action: 'approved' | 'rejected',
  reviewerNotes: string,
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['super_admin', 'manager'].includes(profile.role as string)) {
    return { error: 'Not authorised to review claims' }
  }

  const { error } = await supabase
    .from('mileage_claims')
    .update({
      status:         action,
      reviewer_id:    user.id,
      reviewed_at:    new Date().toISOString(),
      reviewer_notes: reviewerNotes.trim() || null,
      updated_at:     new Date().toISOString(),
    })
    .eq('id', claimId)

  if (error) return { error: error.message }

  revalidatePath('/mileage')
  revalidatePath(`/mileage/${claimId}`)
  return { success: true }
}

export async function deleteMileageClaimAction(claimId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('mileage_claims')
    .delete()
    .eq('id', claimId)
    .eq('staff_id', user.id)
    .eq('status', 'pending')

  if (error) return { error: error.message }

  revalidatePath('/mileage')
  redirect('/mileage')
}
