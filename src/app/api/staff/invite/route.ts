import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()

  // Verify the requester is a manager or super_admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!myProfile || !['super_admin', 'manager'].includes(myProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, role, job_title, phone, home_id, employment_start_date, contracted_hours } = body

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email and full name are required.' }, { status: 400 })
  }

  // Create auth user via Supabase Admin API using service role key
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: crypto.randomUUID(), // temporary — user will reset via invite link
      email_confirm: false,
      user_metadata: { full_name },
    }),
  })

  const created = await createRes.json()

  if (!createRes.ok || !created.id) {
    return NextResponse.json({ error: created.msg ?? 'Failed to create auth user.' }, { status: 500 })
  }

  const newUserId = created.id

  // Update the auto-created profile
  const updates: Record<string, unknown> = {
    role,
    full_name,
    is_active:  true,
    updated_at: new Date().toISOString(),
  }
  if (job_title)             updates.job_title             = job_title
  if (phone)                 updates.phone                 = phone
  if (employment_start_date) updates.employment_start_date = employment_start_date
  if (contracted_hours)      updates.contracted_hours      = contracted_hours

  await supabase.from('profiles').update(updates).eq('id', newUserId)

  // Assign to home if specified
  if (home_id) {
    await supabase.from('user_home_assignments').insert({ user_id: newUserId, home_id })
  }

  // Send invite / password reset email
  await fetch(`${supabaseUrl}/auth/v1/admin/users/${newUserId}/send_otp`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'recovery', email }),
  })

  return NextResponse.json({ id: newUserId })
}
