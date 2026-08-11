import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  let body: { noteId: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { noteId } = body
  if (!noteId?.match(/^[0-9a-f-]{36}$/i)) {
    return NextResponse.json({ error: 'Invalid noteId' }, { status: 400 })
  }

  // RLS on professional_notes ensures only staff in the relevant home can mark as read
  const { error } = await supabase
    .from('professional_notes')
    .update({ is_read: true, read_by: user.id, read_at: new Date().toISOString() })
    .eq('id', noteId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
