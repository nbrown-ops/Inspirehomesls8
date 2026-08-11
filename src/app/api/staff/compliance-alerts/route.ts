import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDbsStatus, getDbsDaysLeft, isSupervisionDue } from '@/lib/utils/compliance'
import { formatDate } from '@/lib/utils/dates'

/**
 * POST /api/staff/compliance-alerts
 *
 * Scans all active staff and returns a compliance report.
 * Can optionally send alert notifications (when Supabase emails / an email provider is configured).
 *
 * Intended to be called:
 *  - From a scheduled cron job (e.g. daily at 08:00 via Supabase Edge Functions or Vercel Cron)
 *  - From the compliance dashboard "Send alerts" button
 *
 * Only super_admin and manager roles may call this endpoint.
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: caller } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!caller || !['super_admin', 'manager'].includes(caller.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch active staff
  const { data: staffList, error: staffError } = await supabase
    .from('profiles')
    .select('id, full_name, email, dbs_expiry_date, contracted_hours, role')
    .in('role', ['manager', 'staff'])
    .eq('is_active', true)

  if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 })

  const staffIds = staffList?.map(s => s.id) ?? []

  // Latest supervisions
  const { data: supervisions } = await supabase
    .from('staff_supervisions')
    .select('staff_id, supervision_date')
    .in('staff_id', staffIds)
    .order('supervision_date', { ascending: false })

  const supervisionMap = new Map<string, string>()
  for (const s of supervisions ?? []) {
    if (!supervisionMap.has(s.staff_id)) supervisionMap.set(s.staff_id, s.supervision_date)
  }

  // Training gaps
  const { data: categories } = await supabase
    .from('mandatory_training_categories')
    .select('id, name')
    .eq('is_active', true)

  const { data: training } = await supabase
    .from('staff_training_records')
    .select('staff_id, category_id, expiry_date')
    .in('staff_id', staffIds)

  const trainingGapMap = new Map<string, string[]>()
  for (const sid of staffIds) {
    const validIds = new Set(
      (training ?? [])
        .filter(t => t.staff_id === sid && t.category_id && (!t.expiry_date || new Date(t.expiry_date) > new Date()))
        .map(t => t.category_id)
    )
    const gaps = (categories ?? []).filter(c => !validIds.has(c.id)).map(c => c.name)
    if (gaps.length > 0) trainingGapMap.set(sid, gaps)
  }

  // Build alerts
  const alerts: {
    staffId: string
    name: string
    email: string | null
    issues: string[]
  }[] = []

  for (const staff of staffList ?? []) {
    const issues: string[] = []

    const dbsStatus = getDbsStatus(staff.dbs_expiry_date)
    if (dbsStatus === 'expired') {
      issues.push(`DBS expired (expired ${staff.dbs_expiry_date ? formatDate(staff.dbs_expiry_date) : 'unknown'})`)
    } else if (dbsStatus === 'expiring_soon') {
      const days = getDbsDaysLeft(staff.dbs_expiry_date)
      issues.push(`DBS expiring in ${days} days (${staff.dbs_expiry_date ? formatDate(staff.dbs_expiry_date) : ''})`)
    } else if (dbsStatus === 'missing') {
      issues.push('DBS record missing')
    }

    if (isSupervisionDue(supervisionMap.get(staff.id) ?? null)) {
      const last = supervisionMap.get(staff.id)
      issues.push(last ? `Supervision overdue (last: ${formatDate(last)})` : 'No supervision on record')
    }

    const gaps = trainingGapMap.get(staff.id)
    if (gaps && gaps.length > 0) {
      issues.push(`Training gaps: ${gaps.join(', ')}`)
    }

    if (issues.length > 0) {
      alerts.push({ staffId: staff.id, name: staff.full_name, email: staff.email, issues })
    }
  }

  // Insert into audit_logs so compliance runs are recorded
  await supabase.from('audit_logs').insert({
    actor_id:    user.id,
    action:      'compliance_scan',
    target_type: 'staff_compliance',
    target_id:   null,
    metadata: {
      total_staff: staffList?.length ?? 0,
      alerts_found: alerts.length,
      run_by: caller.full_name,
    },
  })

  // TODO: When an email provider is configured (e.g. Resend, SendGrid, Supabase email),
  // iterate over `alerts` here and send each manager/admin a formatted email summary.
  // Example structure is below (commented out until provider is wired up):
  //
  // for (const alert of alerts) {
  //   await sendEmail({
  //     to: managerEmail,
  //     subject: `Compliance alert: ${alert.name}`,
  //     html: buildAlertEmail(alert),
  //   })
  // }

  return NextResponse.json({
    success: true,
    scanned: staffList?.length ?? 0,
    alertsFound: alerts.length,
    alerts,
  })
}

/**
 * GET /api/staff/compliance-alerts
 * Returns the latest compliance snapshot without sending notifications.
 */
export async function GET() {
  // Delegate to POST logic (same data, no notifications)
  return POST()
}
