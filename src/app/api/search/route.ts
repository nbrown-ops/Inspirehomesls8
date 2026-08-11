import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ residents: [], staff: [], documents: [] })

  const term = `%${q}%`
  const role = profile.role as string

  const [residentsRes, staffRes, docsRes] = await Promise.all([
    // Residents — RLS ensures social workers only see their assigned residents
    ['super_admin', 'manager', 'staff', 'social_worker', 'auditor'].includes(role)
      ? supabase
          .from('service_users')
          .select('id, first_name, last_name, preferred_name, status, photo_url')
          .or(`first_name.ilike.${term},last_name.ilike.${term},preferred_name.ilike.${term}`)
          .limit(8)
      : Promise.resolve({ data: [] }),

    // Staff — managers and super_admin only
    ['super_admin', 'manager'].includes(role)
      ? supabase
          .from('profiles')
          .select('id, full_name, job_title, role, photo_url')
          .ilike('full_name', term)
          .in('role', ['super_admin', 'manager', 'staff'])
          .limit(6)
      : Promise.resolve({ data: [] }),

    // Documents — all authorised roles
    ['super_admin', 'manager', 'staff', 'auditor'].includes(role)
      ? supabase
          .from('documents')
          .select('id, title, document_type, service_user_id')
          .ilike('title', term)
          .limit(6)
      : Promise.resolve({ data: [] }),
  ])

  return NextResponse.json({
    residents:  residentsRes.data  ?? [],
    staff:      staffRes.data      ?? [],
    documents:  docsRes.data       ?? [],
  })
}
