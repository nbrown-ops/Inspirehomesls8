'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Loader2 } from 'lucide-react'

interface Props {
  medicationId: string
  serviceUserId: string
  defaultDose: string
  onLogged: (entry: MAREntry) => void
}

export interface MAREntry {
  id: string
  administered_at: string
  outcome: string
  notes: string | null
  administered_by: { full_name: string } | null
}

const OUTCOMES = [
  { value: 'given',             label: 'Given',              style: 'bg-green-100 text-green-700' },
  { value: 'refused',           label: 'Refused by resident', style: 'bg-red-100 text-red-700' },
  { value: 'missed',            label: 'Missed / not given',  style: 'bg-amber-100 text-amber-700' },
  { value: 'self_administered', label: 'Self-administered',   style: 'bg-blue-100 text-blue-700' },
]

export function LogMARModal({ medicationId, serviceUserId, defaultDose, onLogged }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [outcome, setOutcome]         = useState('given')
  const [doseGiven, setDoseGiven]     = useState(defaultDose)
  const [adminAt, setAdminAt]         = useState(() => new Date().toISOString().slice(0, 16))
  const [notes, setNotes]             = useState('')
  const [refusalReason, setRefusalReason] = useState('')
  const [error, setError]             = useState<string | null>(null)

  function handleOpen() {
    setOutcome('given')
    setDoseGiven(defaultDose)
    setAdminAt(new Date().toISOString().slice(0, 16))
    setNotes('')
    setRefusalReason('')
    setError(null)
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated.'); return }

      if (!doseGiven.trim()) { setError('Dose given is required.'); return }

      const { data, error: insertError } = await supabase
        .from('mar_entries')
        .insert({
          medication_id:   medicationId,
          service_user_id: serviceUserId,
          administered_by: user.id,
          administered_at: new Date(adminAt).toISOString(),
          dose_given:      doseGiven.trim(),
          outcome,
          notes:           notes.trim() || null,
          refusal_reason:  outcome === 'refused' ? (refusalReason.trim() || null) : null,
          omission_reason: outcome === 'missed'  ? (notes.trim() || null) : null,
        })
        .select(`
          id, administered_at, outcome, notes,
          administered_by:profiles!administered_by(full_name)
        `)
        .single()

      if (insertError) { setError(insertError.message); return }

      onLogged(data as unknown as MAREntry)
      setOpen(false)
    })
  }

  return (
    <>
      <Button onClick={handleOpen} className="bg-purple-700 hover:bg-purple-800" size="sm">
        Log administration
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Medication Administration">
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Outcome */}
          <div>
            <Label>Outcome *</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {OUTCOMES.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    outcome === o.value
                      ? `${o.style} border-current ring-2 ring-offset-1 ring-current`
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="doseGiven">Dose given *</Label>
              <Input
                id="doseGiven"
                value={doseGiven}
                onChange={e => setDoseGiven(e.target.value)}
                placeholder="e.g. 50mg"
                required
              />
            </div>
            <div>
              <Label htmlFor="adminAt">Date &amp; time *</Label>
              <Input
                id="adminAt"
                type="datetime-local"
                value={adminAt}
                onChange={e => setAdminAt(e.target.value)}
                required
              />
            </div>
          </div>

          {outcome === 'refused' && (
            <div>
              <Label htmlFor="refusalReason">Reason for refusal</Label>
              <Input
                id="refusalReason"
                value={refusalReason}
                onChange={e => setRefusalReason(e.target.value)}
                placeholder="Resident's stated reason..."
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notes {outcome === 'missed' ? '(reason for omission)' : '(optional)'}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={
                outcome === 'missed'
                  ? 'e.g. Resident was at hospital appointment...'
                  : 'Any additional observations...'
              }
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="bg-purple-700 hover:bg-purple-800">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save entry'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
