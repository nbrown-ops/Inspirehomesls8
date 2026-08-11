import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  // Only managers and above can respond
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { requestId: string; status: string; response_note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { requestId, status, response_note } = body
  if (!requestId?.match(/^[0-9a-f-]{36}$/i)) return NextResponse.json({ error: 'Invalid requestId' }, { status: 400 })
  if (!status || !['accepted', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  // Sanitise response_note length
  const safeNote = typeof response_note === 'string' ? response_note.slice(0, 1000) : undefined

  const { data: req, error } = await supabase
    .from('meeting_requests')
    .update({
      status,
      response_note: safeNote || null,
      responded_by:  user.id,
      responded_at:  new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('service_user_id, home_id, requested_by')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the requesting professional
  const { data: responder } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  await supabase.from('alerts').insert({
    home_id:         req.home_id,
    alert_type:      'other',
    title:           `Meeting request ${status}`,
    message:         response_note
      ? `${responder?.full_name ?? 'The home manager'} has ${status} your meeting request. Note: ${response_note}`
      : `${responder?.full_name ?? 'The home manager'} has ${status} your meeting request.`,
    service_user_id: req.service_user_id,
    profile_id:      req.requested_by,
  })

  return NextResponse.json({ success: true })
}
