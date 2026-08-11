'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'

type FormAction = (prev: unknown, formData: FormData) => Promise<{ error: string } | undefined>

export interface IncidentDefaultValues {
  id?: string
  service_user_id?: string | null
  incident_type?: string
  severity?: string
  occurred_at?: string | null
  location?: string | null
  description?: string
  immediate_action?: string | null
  injuries_sustained?: boolean
  injury_details?: string | null
  safeguarding_concern?: string | null
  police_notified?: boolean
  police_reference?: string | null
  social_worker_notified?: boolean
  manager_notified?: boolean
  parent_nok_notified?: boolean
  ofsted_reportable?: boolean
  cqc_reportable?: boolean
  follow_up_required?: boolean
  follow_up_notes?: string | null
}

interface Props {
  action: FormAction
  residents: { id: string; first_name: string; last_name: string }[]
  defaultValues?: IncidentDefaultValues
}

const INCIDENT_TYPES = [
  { value: 'physical_altercation',  label: 'Physical Altercation' },
  { value: 'verbal_aggression',     label: 'Verbal Aggression' },
  { value: 'self_harm',             label: 'Self Harm' },
  { value: 'suicide_attempt',       label: 'Suicide Attempt / Threat' },
  { value: 'safeguarding',          label: 'Safeguarding Concern' },
  { value: 'property_damage',       label: 'Property Damage' },
  { value: 'absconding',            label: 'Absconding / Missing Person' },
  { value: 'substance_misuse',      label: 'Substance Misuse' },
  { value: 'medication_error',      label: 'Medication Error' },
  { value: 'accident',              label: 'Accident / Injury' },
  { value: 'fire',                  label: 'Fire / Emergency Evacuation' },
  { value: 'police_involvement',    label: 'Police Involvement' },
  { value: 'exploitation',          label: 'Exploitation (CSE/CCE)' },
  { value: 'domestic_abuse',        label: 'Domestic Abuse' },
  { value: 'mental_health_crisis',  label: 'Mental Health Crisis' },
  { value: 'other',                 label: 'Other' },
]

function toLocalDatetime(iso: string | null | undefined): string {
  if (!iso) return new Date().toISOString().slice(0, 16)
  try { return new Date(iso).toISOString().slice(0, 16) } catch { return '' }
}

export function IncidentForm({ action, residents, defaultValues: d = {} }: Props) {
  const router = useRouter()
  const isEdit = !!d.id

  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  const [residentId,    setResidentId]    = useState(d.service_user_id ?? '')
  const [incidentType,  setIncidentType]  = useState(d.incident_type   ?? 'physical_altercation')
  const [severity,      setSeverity]      = useState(d.severity         ?? 'medium')
  const [occurredAt,    setOccurredAt]    = useState(toLocalDatetime(d.occurred_at))
  const [location,      setLocation]      = useState(d.location         ?? '')
  const [description,   setDescription]   = useState(d.description      ?? '')
  const [immediateAction, setImmediateAction] = useState(d.immediate_action ?? '')

  const [injuries,      setInjuries]      = useState(d.injuries_sustained ?? false)
  const [injuryDetails, setInjuryDetails] = useState(d.injury_details     ?? '')

  const [safeguardingConcern, setSafeguardingConcern] = useState(d.safeguarding_concern ?? '')

  const [policeNotified,  setPoliceNotified]  = useState(d.police_notified          ?? false)
  const [policeRef,       setPoliceRef]        = useState(d.police_reference         ?? '')
  const [swNotified,      setSwNotified]       = useState(d.social_worker_notified   ?? false)
  const [managerNotified, setManagerNotified]  = useState(d.manager_notified         ?? false)
  const [nokNotified,     setNokNotified]      = useState(d.parent_nok_notified      ?? false)

  const [ofsted,    setOfsted]    = useState(d.ofsted_reportable ?? false)
  const [cqc,       setCqc]       = useState(d.cqc_reportable    ?? false)
  const [followUp,  setFollowUp]  = useState(d.follow_up_required ?? false)
  const [followUpNotes, setFollowUpNotes] = useState(d.follow_up_notes ?? '')

  // Show safeguarding field when type is safeguarding/exploitation or user manually fills it
  const showSafeguarding = incidentType === 'safeguarding' || incidentType === 'exploitation' || incidentType === 'domestic_abuse' || !!safeguardingConcern

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim()) { setError('A description is required.'); return }
    setSaving(true); setError(null)

    const fd = new FormData()
    const set = (k: string, v: string) => fd.set(k, v)
    set('service_user_id',      residentId)
    set('incident_type',        incidentType)
    set('severity',             severity)
    set('occurred_at',          new Date(occurredAt).toISOString())
    set('location',             location.trim())
    set('description',          description.trim())
    set('immediate_action',     immediateAction.trim())
    set('injuries_sustained',   String(injuries))
    set('injury_details',       injuries ? injuryDetails.trim() : '')
    set('safeguarding_concern', safeguardingConcern.trim())
    set('police_notified',      String(policeNotified))
    set('police_reference',     policeRef.trim())
    set('social_worker_notified', String(swNotified))
    set('manager_notified',     String(managerNotified))
    set('parent_nok_notified',  String(nokNotified))
    set('ofsted_reportable',    String(ofsted))
    set('cqc_reportable',       String(cqc))
    set('follow_up_required',   String(followUp))
    set('follow_up_notes',      followUp ? followUpNotes.trim() : '')

    const result = await action(null, fd)
    setSaving(false)
    if (result?.error) setError(result.error)
    // On success the action redirects
  }

  const sel = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500'
  const chk = 'w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500'

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ── Section 1: Core details ───────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Incident Details</h2>

        <div>
          <Label htmlFor="resident">Resident involved</Label>
          <select id="resident" value={residentId} onChange={e => setResidentId(e.target.value)} className={`mt-1 ${sel}`}>
            <option value="">No specific resident / property-wide incident</option>
            {residents.map(r => (
              <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="type">Incident type *</Label>
            <select id="type" value={incidentType} onChange={e => setIncidentType(e.target.value)} className={`mt-1 ${sel}`} required>
              {INCIDENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label htmlFor="severity">Severity *</Label>
            <select id="severity" value={severity} onChange={e => setSeverity(e.target.value)} className={`mt-1 ${sel}`} required>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="occurredAt">Date &amp; time of incident *</Label>
            <Input id="occurredAt" type="datetime-local" value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Communal lounge, Bedroom 2, Outside" className="mt-1" />
          </div>
        </div>
      </div>

      {/* ── Section 2: What happened ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">What Happened</h2>

        <div>
          <Label htmlFor="description">Description *</Label>
          <p className="text-xs text-slate-400 mt-0.5 mb-1">Record factual information only — what you saw, heard, or were told. Avoid opinions.</p>
          <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe exactly what happened, in chronological order..." rows={5} required className="mt-1" />
        </div>

        <div>
          <Label htmlFor="immediateAction">Immediate action taken</Label>
          <Textarea id="immediateAction" value={immediateAction} onChange={e => setImmediateAction(e.target.value)}
            placeholder="What steps were taken immediately after the incident? e.g. First aid, de-escalation, called 999..." rows={3} className="mt-1" />
        </div>

        {/* Injuries */}
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={injuries} onChange={e => setInjuries(e.target.checked)} className={chk} />
            <span className="text-sm font-medium text-slate-700">Injuries sustained</span>
          </label>
          {injuries && (
            <div>
              <Label htmlFor="injuryDetails">Injury details</Label>
              <Textarea id="injuryDetails" value={injuryDetails} onChange={e => setInjuryDetails(e.target.value)}
                placeholder="Describe the nature and location of any injuries. Include whether medical attention was sought." rows={3} className="mt-1" />
            </div>
          )}
        </div>

        {/* Safeguarding */}
        {showSafeguarding && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <Label htmlFor="safeguardingConcern" className="text-red-700 font-semibold">Safeguarding concern details</Label>
            </div>
            <p className="text-xs text-slate-400 mb-1">
              Document the specific safeguarding concern. This will be flagged for manager review and may be shared with the local authority.
            </p>
            <Textarea id="safeguardingConcern" value={safeguardingConcern} onChange={e => setSafeguardingConcern(e.target.value)}
              placeholder="Describe the safeguarding concern in detail. Include any disclosures made, observed indicators, and your assessment of risk..." rows={4} className="mt-1" />
          </div>
        )}
        {!showSafeguarding && (
          <div className="border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!safeguardingConcern} onChange={e => { if (!e.target.checked) setSafeguardingConcern('') }} className={chk} />
              <span className="text-sm text-slate-600">This incident raises a safeguarding concern</span>
            </label>
          </div>
        )}
      </div>

      {/* ── Section 3: Notifications ─────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Notifications</h2>
        <p className="text-xs text-slate-400">Record who has been informed. This creates an audit trail.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={nokNotified} onChange={e => setNokNotified(e.target.checked)} className={chk} />
            <span className="text-sm text-slate-700">Family / next of kin notified</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={swNotified} onChange={e => setSwNotified(e.target.checked)} className={chk} />
            <span className="text-sm text-slate-700">Social worker notified</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={managerNotified} onChange={e => setManagerNotified(e.target.checked)} className={chk} />
            <span className="text-sm text-slate-700">Manager notified</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={policeNotified} onChange={e => setPoliceNotified(e.target.checked)} className={chk} />
            <span className="text-sm text-slate-700">Police involved</span>
          </label>
        </div>

        {policeNotified && (
          <div>
            <Label htmlFor="policeRef">Police reference / crime number</Label>
            <Input id="policeRef" value={policeRef} onChange={e => setPoliceRef(e.target.value)}
              placeholder="e.g. 01/12345/24" className="mt-1 max-w-xs" />
          </div>
        )}
      </div>

      {/* ── Section 4: Regulatory & Follow-up ───────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Regulatory Reporting &amp; Follow-Up</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={ofsted} onChange={e => setOfsted(e.target.checked)} className={`${chk} mt-0.5`} />
            <div>
              <span className="text-sm font-medium text-slate-700">Ofsted notifiable</span>
              <p className="text-xs text-slate-400">Serious injuries, missing persons, significant safeguarding events</p>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={cqc} onChange={e => setCqc(e.target.checked)} className={`${chk} mt-0.5`} />
            <div>
              <span className="text-sm font-medium text-slate-700">CQC notifiable</span>
              <p className="text-xs text-slate-400">Incidents reportable under CQC Regulation 18</p>
            </div>
          </label>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={followUp} onChange={e => setFollowUp(e.target.checked)} className={chk} />
            <span className="text-sm font-medium text-slate-700">Follow-up action required</span>
          </label>
          {followUp && (
            <div>
              <Label htmlFor="followUpNotes">Follow-up details</Label>
              <Textarea id="followUpNotes" value={followUpNotes} onChange={e => setFollowUpNotes(e.target.value)}
                placeholder="What follow-up actions are needed, by whom, and by when?" rows={3} className="mt-1" />
            </div>
          )}
        </div>
      </div>

      {/* ── Severity warning ─────────────────────────────────────── */}
      {(severity === 'critical' || severity === 'high') && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="text-sm text-red-700">
            <p className="font-semibold">High severity incident</p>
            <p>This will create an urgent alert visible to all managers. Ensure your manager is aware immediately.</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> {isEdit ? 'Saving…' : 'Submitting…'}</>
            : isEdit ? 'Save changes' : 'Submit incident report'
          }
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  )
}
