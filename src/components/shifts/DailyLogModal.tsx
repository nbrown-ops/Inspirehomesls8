'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { CheckCircle, Flag, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { MoodPicker } from './MoodPicker'
import { calculateAge } from '@/lib/utils/dates'
import type { addDailyLogAction } from '@/app/(portal)/shifts/actions'

type LogAction = typeof addDailyLogAction

interface Resident {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  date_of_birth: string
  photo_url: string | null
  allergies: string[] | null
}

interface DailyLogModalProps {
  resident: Resident
  shiftId: string
  homeId: string
  action: LogAction
  existingLog?: { id: string; mood_rating: number | null; concerns: string | null; is_flagged: boolean } | null
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      loading={pending}
      className="flex-1 bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
    >
      {pending ? 'Saving…' : 'Save log entry'}
    </Button>
  )
}

export function DailyLogModal({ resident, shiftId, homeId, action, existingLog }: DailyLogModalProps) {
  const [open, setOpen]       = useState(false)
  const [flagged, setFlagged] = useState(false)

  const boundAction = action.bind(null, shiftId, homeId)
  const [state, formAction] = useFormState(boundAction, null)

  const done = state?.success || !!existingLog

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md cursor-pointer group
          ${done
            ? 'border-green-200 bg-green-50 hover:border-green-300'
            : 'border-slate-200 bg-white hover:border-purple-300'
          }`}
      >
        <div className="flex items-center gap-3">
          {resident.photo_url ? (
            <img src={resident.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
              {resident.first_name[0]}{resident.last_name[0]}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 text-sm">
              {resident.preferred_name ?? resident.first_name} {resident.last_name}
            </p>
            <p className="text-xs text-slate-500">Age {calculateAge(resident.date_of_birth)}</p>
          </div>
          {done ? (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          ) : (
            <span className="text-xs text-slate-400 group-hover:text-purple-600 shrink-0">
              Write log →
            </span>
          )}
        </div>
        {existingLog?.is_flagged && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <Flag className="h-3.5 w-3.5" />
            Entry flagged
          </div>
        )}
        {resident.allergies && resident.allergies.length > 0 && (
          <p className="mt-1.5 text-xs text-amber-600">
            ⚠ Allergies: {resident.allergies.join(', ')}
          </p>
        )}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Daily log — ${resident.preferred_name ?? resident.first_name} ${resident.last_name}`}
        size="lg"
      >
        {state?.success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">Log entry saved</p>
            <p className="text-sm text-slate-500 mt-1">Entry is now on record and cannot be edited.</p>
            <Button className="mt-4" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="service_user_id" value={resident.id} />

            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                {state.error}
              </div>
            )}

            {/* Mood */}
            <div className="space-y-2">
              <Label>Mood rating</Label>
              <MoodPicker name="mood_rating" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mood_notes">Mood notes</Label>
              <Textarea id="mood_notes" name="mood_notes" placeholder="Any context about their mood today…" rows={2} />
            </div>

            {/* Wellbeing */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="sleep_quality">Sleep quality</Label>
                <Select id="sleep_quality" name="sleep_quality">
                  <option value="">Unknown</option>
                  <option>Slept well</option>
                  <option>Disturbed</option>
                  <option>Awake most of night</option>
                  <option>Refused bed</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appetite">Appetite</Label>
                <Select id="appetite" name="appetite">
                  <option value="">Unknown</option>
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Poor</option>
                  <option>Refused food</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="physical_health">Physical health</Label>
                <Select id="physical_health" name="physical_health">
                  <option value="">Unknown</option>
                  <option>Good</option>
                  <option>Unwell — monitored</option>
                  <option>Unwell — GP contacted</option>
                  <option>Hospital attendance</option>
                </Select>
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-1.5">
              <Label htmlFor="activities">Activities / engagement</Label>
              <Textarea id="activities" name="activities" placeholder="What did they do during the shift? How engaged were they?" rows={2} />
            </div>

            <div className="flex items-center gap-6">
              <div className="space-y-1.5">
                <Label htmlFor="community_access">Community access</Label>
                <Select id="community_access" name="community_access">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="education_work">Education / work / college</Label>
                <Input id="education_work" name="education_work" placeholder="e.g. Attended college, work placement" />
              </div>
            </div>

            {/* Medication */}
            <div className="rounded-lg border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Medication</p>
              <div className="flex items-center gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="medication_refused">Medication refused?</Label>
                  <Select id="medication_refused" name="medication_refused">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </Select>
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="medication_notes">Medication notes</Label>
                  <Input id="medication_notes" name="medication_notes" placeholder="e.g. All meds taken as prescribed" />
                </div>
              </div>
            </div>

            {/* Concerns */}
            <div className="space-y-1.5">
              <Label htmlFor="concerns">Concerns / observations</Label>
              <Textarea id="concerns" name="concerns" placeholder="Any safeguarding concerns, behaviour changes, or other notes…" rows={3} />
            </div>

            {/* Flag toggle */}
            <div className={`rounded-lg border p-4 transition-colors ${flagged ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start gap-3">
                <input type="hidden" name="is_flagged" value={String(flagged)} />
                <button
                  type="button"
                  onClick={() => setFlagged(f => !f)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                    ${flagged ? 'bg-red-500 border-red-500' : 'border-slate-300 bg-white'}`}
                >
                  {flagged && <span className="text-white text-xs">✓</span>}
                </button>
                <div>
                  <p className={`text-sm font-semibold ${flagged ? 'text-red-700' : 'text-slate-700'}`}>
                    <Flag className="inline h-3.5 w-3.5 mr-1" />
                    Flag this entry for manager attention
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manager will be alerted. Use for concerns that need follow-up.
                  </p>
                </div>
              </div>
              {flagged && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Please describe why this entry is being flagged
                  </div>
                  <Textarea name="flagged_reason" placeholder="Reason for flagging…" rows={2} />
                </div>
              )}
            </div>

            {/* Confidential */}
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_confidential" name="is_confidential" value="true" className="h-4 w-4 rounded border-slate-300" />
              <Label htmlFor="is_confidential" className="font-normal text-slate-600">
                Mark as confidential (hidden from social workers)
              </Label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitBtn />
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
