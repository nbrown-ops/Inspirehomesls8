'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { Plus, CheckCircle, AlertTriangle, Clock, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { addSupervisionAction, signOffSupervisionAction } from '@/app/(portal)/staff/actions'
import { formatDate } from '@/lib/utils/dates'
import { supervisionWeeksAgo, isSupervisionDue } from '@/lib/utils/compliance'
import { cn } from '@/lib/utils/cn'

interface SupervisionRecord {
  id: string
  supervision_date: string
  type: string
  duration_minutes: number | null
  topics: string | null
  notes: string | null
  actions: string | null
  signed_off_at: string | null
  signed_off_by: string | null
  supervisor: { full_name: string } | null
}

interface Props {
  staffId: string
  supervisions: SupervisionRecord[]
  lastSupervisionDate: string | null
  canEdit: boolean
}

const TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  group:      'Group',
  informal:   'Informal',
  probation:  'Probation review',
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="flex-1 bg-purple-700 hover:bg-purple-800">
      {pending ? 'Saving…' : 'Save supervision record'}
    </Button>
  )
}

function SignOffButton({ supervisionId, staffId }: { supervisionId: string; staffId: string }) {
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSignOff() {
    setLoading(true)
    const result = await signOffSupervisionAction(supervisionId, staffId)
    if (result?.success) setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
        <CheckCircle className="h-3.5 w-3.5" /> Signed off
      </span>
    )
  }

  return (
    <Button size="sm" variant="secondary" loading={loading} onClick={handleSignOff}>
      <UserCheck className="h-3.5 w-3.5" />
      Sign off
    </Button>
  )
}

export function StaffSupervisionTab({ staffId, supervisions, lastSupervisionDate, canEdit }: Props) {
  const [open, setOpen] = useState(false)
  const boundAction = addSupervisionAction.bind(null, staffId)
  const [state, formAction] = useFormState(boundAction, null)

  const weeksAgo = supervisionWeeksAgo(lastSupervisionDate)
  const due      = isSupervisionDue(lastSupervisionDate)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Supervision records</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {supervisions.length} record{supervisions.length !== 1 ? 's' : ''}
            {lastSupervisionDate && (
              <span className={cn('ml-2', due ? 'text-amber-600 font-medium' : '')}>
                · Last: {formatDate(lastSupervisionDate)}
                {weeksAgo !== null && ` (${weeksAgo}w ago)`}
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add supervision
          </Button>
        )}
      </div>

      {/* Due alert */}
      {due && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Supervision overdue.</span>{' '}
            {lastSupervisionDate
              ? `Last supervision was ${weeksAgo} weeks ago. Monthly supervision is required.`
              : 'No supervision on record. Monthly supervision is required.'}
          </p>
        </div>
      )}

      {/* Records */}
      {supervisions.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No supervision records yet.</p>
      ) : (
        <div className="space-y-3">
          {supervisions.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900 text-sm">{formatDate(s.supervision_date)}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                      {TYPE_LABELS[s.type] ?? s.type}
                    </span>
                    {s.duration_minutes && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {s.duration_minutes} min
                      </span>
                    )}
                  </div>
                  {s.supervisor && (
                    <p className="text-xs text-slate-500 mt-0.5">Conducted by: {s.supervisor.full_name}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {s.signed_off_at ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" /> Signed off
                    </span>
                  ) : canEdit ? (
                    <SignOffButton supervisionId={s.id} staffId={staffId} />
                  ) : null}
                </div>
              </div>

              {(s.topics || s.notes || s.actions) && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  {s.topics && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Topics covered</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{s.topics}</p>
                    </div>
                  )}
                  {s.notes && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Notes</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{s.notes}</p>
                    </div>
                  )}
                  {s.actions && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Actions / follow-up</p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{s.actions}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add supervision modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add supervision record">
        {state?.success ? (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-900">Supervision record saved</p>
            <Button className="mt-4 bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{state.error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="supervision_date">Date <span className="text-red-500">*</span></Label>
                <Input id="supervision_date" name="supervision_date" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Select id="type" name="type" defaultValue="individual">
                  <option value="individual">Individual</option>
                  <option value="group">Group</option>
                  <option value="informal">Informal</option>
                  <option value="probation">Probation review</option>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input id="duration_minutes" name="duration_minutes" type="number" min="5" max="480" placeholder="e.g. 60" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="topics">Topics covered</Label>
              <Textarea id="topics" name="topics" rows={3} placeholder="Key topics discussed during supervision…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes / summary</Label>
              <Textarea id="notes" name="notes" rows={3} placeholder="Summary of discussion…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="actions">Actions / follow-up</Label>
              <Textarea id="actions" name="actions" rows={2} placeholder="Any agreed actions or follow-up items…" />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <SubmitBtn />
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
