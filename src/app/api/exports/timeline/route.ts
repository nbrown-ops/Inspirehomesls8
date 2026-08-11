import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { INTERACTION_CONFIG } from '@/lib/constants/timeline'
import type { InteractionType } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const resident_id  = searchParams.get('resident_id')
  const start        = searchParams.get('start')
  const end          = searchParams.get('end')

  if (!resident_id || !start || !end) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  // RLS enforces access — fetch resident
  const { data: resident } = await supabase
    .from('service_users')
    .select('id, first_name, last_name, preferred_name, date_of_birth, legal_status, home:homes!home_id(name)')
    .eq('id', resident_id)
    .single()

  if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch requesting user's name for the footer
  const { data: exporter } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  // Fetch timeline entries in range
  const startISO = new Date(start).toISOString()
  const endISO   = new Date(end + 'T23:59:59').toISOString()

  const { data: entries } = await supabase
    .from('interaction_timeline')
    .select(`
      id, interaction_type, occurred_at, notes, outcome,
      is_flagged, flagged_reason, duration_minutes,
      staff:profiles!staff_id(full_name)
    `)
    .eq('service_user_id', resident_id)
    .gte('occurred_at', startISO)
    .lte('occurred_at', endISO)
    .order('occurred_at', { ascending: false })

  const home     = resident.home as unknown as { name: string } | null
  const resName  = `${resident.preferred_name ?? resident.first_name} ${resident.last_name}`
  const exported = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  const fmtDate  = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const rows = (entries ?? []).map(e => {
    const cfg    = INTERACTION_CONFIG[e.interaction_type as InteractionType] ?? INTERACTION_CONFIG.other
    const staff  = (e.staff as unknown as { full_name: string } | null)?.full_name ?? '—'
    const flag   = e.is_flagged ? `<span class="flag">⚑ ESCALATED${e.flagged_reason ? ': ' + escapeHtml(e.flagged_reason) : ''}</span>` : ''
    return `
      <div class="entry${e.is_flagged ? ' flagged' : ''}">
        <div class="entry-header">
          <span class="badge" style="background:${bgColor(e.interaction_type)}; color:${textColor(e.interaction_type)}">${cfg.label}</span>
          <span class="staff">${escapeHtml(staff)}</span>
          <span class="time">${fmtDate(e.occurred_at)}${e.duration_minutes ? ` · ${e.duration_minutes}min` : ''}</span>
        </div>
        ${e.notes ? `<p class="note">${escapeHtml(e.notes)}</p>` : ''}
        ${e.outcome ? `<p class="outcome">Outcome: ${escapeHtml(e.outcome)}</p>` : ''}
        ${flag}
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Timeline Export — ${resName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11pt; color: #1e293b; background: white; padding: 32px; }
  .header { border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
  .org { font-size: 9pt; color: #7c3aed; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
  h1 { font-size: 18pt; font-weight: 700; color: #1e293b; }
  .meta { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 9pt; color: #64748b; }
  .meta span strong { color: #1e293b; }
  .summary { background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; font-size: 9pt; }
  .summary b { color: #7c3aed; }
  .entry { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; }
  .entry.flagged { border-color: #fca5a5; background: #fff5f5; }
  .entry-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
  .badge { font-size: 8pt; font-weight: 600; padding: 2px 8px; border-radius: 100px; }
  .staff { font-size: 9pt; font-weight: 600; color: #1e293b; }
  .time { font-size: 8.5pt; color: #94a3b8; margin-left: auto; }
  .note { font-size: 10pt; color: #334155; line-height: 1.5; }
  .outcome { font-size: 9pt; color: #64748b; font-style: italic; margin-top: 4px; }
  .flag { display: inline-block; margin-top: 6px; font-size: 8.5pt; font-weight: 600; color: #dc2626; background: #fee2e2; padding: 2px 8px; border-radius: 4px; }
  .empty { text-align: center; padding: 40px; color: #94a3b8; font-style: italic; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; }
  .print-btn { position: fixed; bottom: 24px; right: 24px; background: #7c3aed; color: white; border: none; padding: 12px 20px; border-radius: 8px; font-size: 11pt; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(124,58,237,0.4); }
  .print-btn:hover { background: #6d28d9; }
  @media print {
    .print-btn { display: none; }
    body { padding: 16px; }
  }
</style>
</head>
<body>
<div class="header">
  <p class="org">Inspire Homes LS8 — Care Management Platform</p>
  <h1>Interaction Timeline: ${escapeHtml(resName)}</h1>
  <div class="meta">
    <span><strong>Property:</strong> ${escapeHtml(home?.name ?? '—')}</span>
    <span><strong>Legal status:</strong> ${escapeHtml(resident.legal_status ?? '—')}</span>
    <span><strong>Date range:</strong> ${start} to ${end}</span>
    <span><strong>Total entries:</strong> ${entries?.length ?? 0}</span>
  </div>
</div>

<div class="summary">
  <b>CONFIDENTIAL</b> — This document contains personal data protected under UK GDPR and the Data Protection Act 2018.
  Handle in accordance with Inspire Homes LS8 Data Protection Policy. Do not share without authorisation.
</div>

${entries && entries.length > 0 ? rows : '<div class="empty">No timeline entries found for the selected date range.</div>'}

<div class="footer">
  <span>Exported by: ${escapeHtml(exporter?.full_name ?? user.email ?? '—')} (${exporter?.role ?? '—'})</span>
  <span>Generated: ${exported}</span>
</div>

<button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
<script>
  // Auto-print after a short delay for PDF workflow
  // Commented out to allow manual review first:
  // setTimeout(() => window.print(), 800)
</script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Map interaction type to inline CSS colours (can't use Tailwind in API route HTML)
function bgColor(type: string): string {
  const map: Record<string, string> = {
    welfare_check: '#e0f2fe', key_work_session: '#ede9fe', medication_prompt: '#fef3c7',
    activity: '#dcfce7', community_activity: '#ccfbf1', appointment: '#e0e7ff',
    medical_appointment: '#ffe4e6', phone_call: '#cffafe', visit: '#f1f5f9',
    incident: '#fee2e2', safeguarding_concern: '#fecaca', positive_achievement: '#d1fae5', other: '#f1f5f9',
  }
  return map[type] ?? '#f1f5f9'
}

function textColor(type: string): string {
  const map: Record<string, string> = {
    welfare_check: '#0369a1', key_work_session: '#6d28d9', medication_prompt: '#92400e',
    activity: '#15803d', community_activity: '#0f766e', appointment: '#3730a3',
    medical_appointment: '#be123c', phone_call: '#0e7490', visit: '#475569',
    incident: '#dc2626', safeguarding_concern: '#b91c1c', positive_achievement: '#065f46', other: '#475569',
  }
  return map[type] ?? '#475569'
}
