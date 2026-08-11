import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subDays, subMonths, formatISO, format } from 'date-fns'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorised', { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (!profile || !['super_admin', 'manager', 'auditor'].includes(profile.role as string)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const now       = new Date()
  const ago90     = formatISO(subMonths(now, 3))
  const ago8weeks = formatISO(subDays(now, 56))
  const ago7      = formatISO(subDays(now, 7))

  const [
    { data: homes },
    { data: activeResidents },
    { data: incidents90 },
    { data: openAlerts },
    { data: carePlans },
    { data: staffList },
    { data: supervisions },
    { data: keyworkSessions },
  ] = await Promise.all([
    supabase.from('homes').select('id, name, max_occupancy').eq('is_active', true),
    supabase.from('service_users').select('id, home_id, status').eq('status', 'active'),
    supabase.from('incident_reports').select('id, incident_type, status, created_at, manager_sign_off_at').gte('created_at', ago90),
    supabase.from('alerts').select('id, alert_type, title, triggered_at').eq('is_resolved', false),
    supabase.from('care_plans').select('service_user_id').eq('status', 'active'),
    supabase.from('profiles').select('id, dbs_expiry_date').in('role', ['manager', 'staff']).eq('is_active', true),
    supabase.from('staff_supervisions').select('staff_id').gte('supervision_date', ago8weeks),
    supabase.from('interaction_timeline').select('service_user_id').eq('interaction_type', 'key_work_session' as any).gte('occurred_at', ago7),
  ])

  const totalResidents      = activeResidents?.length ?? 0
  const totalStaff          = staffList?.length ?? 0
  const residentsWithPlans  = new Set(carePlans?.map(c => c.service_user_id)).size
  const carePlanPct         = totalResidents > 0 ? Math.round((residentsWithPlans / totalResidents) * 100) : 100
  const closedInc           = incidents90?.filter(i => i.manager_sign_off_at) ?? []
  const signed24h           = closedInc.filter(i => (new Date(i.manager_sign_off_at!).getTime() - new Date(i.created_at).getTime()) <= 86_400_000)
  const incPct              = closedInc.length > 0 ? Math.round((signed24h.length / closedInc.length) * 100) : 100
  const validDbs            = staffList?.filter(s => s.dbs_expiry_date && new Date(s.dbs_expiry_date) > now).length ?? 0
  const dbsPct              = totalStaff > 0 ? Math.round((validDbs / totalStaff) * 100) : 100
  const supIds              = new Set(supervisions?.map(s => s.staff_id))
  const supPct              = totalStaff > 0 ? Math.round((supIds.size / totalStaff) * 100) : 100
  const keyIds              = new Set(keyworkSessions?.map(k => k.service_user_id))
  const keyPct              = totalResidents > 0 ? Math.round((keyIds.size / totalResidents) * 100) : 0
  const overall             = Math.round(carePlanPct * 0.25 + incPct * 0.20 + dbsPct * 0.20 + supPct * 0.20 + 75 * 0.15)

  const scoreColor = (pct: number) => pct >= 90 ? '#16a34a' : pct >= 75 ? '#d97706' : '#dc2626'
  const bar = (pct: number) => `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-size:11px">
        <span>{label}</span><span style="font-weight:600;color:${scoreColor(pct)}">${pct}%</span>
      </div>
      <div style="height:8px;background:#f1f5f9;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${scoreColor(pct)};border-radius:999px"></div>
      </div>
    </div>
  `

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Inspire Homes LS8 — Compliance Report ${format(now, 'dd/MM/yyyy')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, sans-serif; color: #1e293b; padding: 32px; font-size: 13px; }
    h1 { font-size: 22px; font-weight: 700; color: #581c87; }
    h2 { font-size: 15px; font-weight: 600; margin: 24px 0 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .meta { color: #64748b; font-size: 11px; margin-top: 4px; }
    .score-circle { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; border: 4px solid #e2e8f0; }
    .score-num { font-size: 28px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .card-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    .big-num { font-size: 32px; font-weight: 700; color: #7c3aed; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f8fafc; text-align: left; padding: 8px; font-weight: 600; color: #64748b; }
    td { padding: 8px; border-top: 1px solid #f1f5f9; }
    .footer { margin-top: 40px; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 20px; } button { display: none !important; } }
  </style>
</head>
<body>
  <button onclick="window.print()" style="float:right;padding:8px 16px;background:#7c3aed;color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px">Print / Save PDF</button>
  <h1>Inspire Homes LS8 — Compliance Report</h1>
  <p class="meta">Generated: ${format(now, 'dd MMMM yyyy HH:mm')} · Generated by: ${profile.full_name} (${profile.role})</p>
  <p class="meta" style="margin-top:4px;color:#dc2626;font-size:10px">CONFIDENTIAL — For internal regulatory use only. Not for distribution.</p>

  <h2>Ofsted / CQC Readiness Score</h2>
  <div style="display:flex;align-items:center;gap:24px;margin-bottom:16px">
    <div class="score-circle">
      <span class="score-num" style="color:${scoreColor(overall)}">${overall}</span>
      <span style="font-size:10px;color:#64748b">/100</span>
    </div>
    <div style="flex:1">
      ${[
        { label: 'Care plans current', pct: carePlanPct },
        { label: 'Incidents signed off <24h', pct: incPct },
        { label: 'DBS checks valid', pct: dbsPct },
        { label: 'Supervisions up to date', pct: supPct },
        { label: 'Keywork contact (7 days)', pct: keyPct },
      ].map(s => `
        <div style="margin-bottom:8px">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px">
            <span>${s.label}</span>
            <strong style="color:${scoreColor(s.pct)}">${s.pct}%</strong>
          </div>
          <div style="height:6px;background:#f1f5f9;border-radius:999px">
            <div style="height:100%;width:${s.pct}%;background:${scoreColor(s.pct)};border-radius:999px"></div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <h2>Occupancy</h2>
  <table>
    <thead><tr><th>Home</th><th>Occupied</th><th>Capacity</th><th>%</th></tr></thead>
    <tbody>
      ${(homes ?? []).map(h => {
        const occ = activeResidents?.filter(r => r.home_id === h.id).length ?? 0
        const pct = h.max_occupancy > 0 ? Math.round((occ / h.max_occupancy) * 100) : 0
        return `<tr><td>${h.name}</td><td>${occ}</td><td>${h.max_occupancy}</td><td>${pct}%</td></tr>`
      }).join('')}
      <tr style="font-weight:600"><td>Total</td><td>${totalResidents}</td><td>${(homes ?? []).reduce((s, h) => s + h.max_occupancy, 0)}</td><td>${(homes ?? []).reduce((s, h) => s + h.max_occupancy, 0) > 0 ? Math.round((totalResidents / (homes ?? []).reduce((s, h) => s + h.max_occupancy, 0)) * 100) : 0}%</td></tr>
    </tbody>
  </table>

  <h2>Open Alerts (${openAlerts?.length ?? 0})</h2>
  ${(openAlerts?.length ?? 0) === 0
    ? '<p style="color:#16a34a;font-size:12px">No open alerts.</p>'
    : `<table>
        <thead><tr><th>Title</th><th>Type</th><th>Raised</th></tr></thead>
        <tbody>
          ${(openAlerts ?? []).slice(0, 20).map(a => `
            <tr>
              <td>${a.title}</td>
              <td>${a.alert_type.replace(/_/g, ' ')}</td>
              <td>${format(new Date(a.triggered_at), 'dd/MM/yyyy HH:mm')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>`
  }

  <div class="footer">
    This document was generated by the Inspire Homes LS8 Care Management Platform. It contains confidential information
    relating to residents and staff. Handle in accordance with the Data Protection Act 2018 and UK GDPR.
    Retain for a minimum of 7 years as required by Ofsted and CQC regulations.
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
