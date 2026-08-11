'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { CalendarPlus, CheckCircle, Info, Clock } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { requestMeetingAction } from '@/app/(external)/portal/actions'

const MEETING_TYPES = [
  { value: 'looked_after_child_review', label: 'LAC Review' },
  { value: 'pathway_planning',          label: 'Pathway Planning Meeting' },
  { value: 'key_work_session',          label: 'Key Work Session' },
  { value: 'professionals_meeting',     label: 'Professionals Meeting' },
  { value: 'risk_assessment_review',    label: 'Risk Assessment Review' },
  { value: 'mental_health_review',      label: 'Mental Health Review' },
  { value: 'other',                     label: 'Other' },
]

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="flex-1 bg-purple-700 hover:bg-purple-800">
      {pending ? 'Requesting…' : 'Send request'}
    </Button>
  )
}

export function MeetingRequestModal({
  serviceUserId,
  residentName,
}: {
  serviceUserId: string
  residentName: string
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction] = useFormState(requestMeetingAction, null)

  // Min date is tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        <CalendarPlus className="h-4 w-4" />
        Request a meeting
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request a meeting"
        description={`Propose a meeting date to the team at ${residentName}'s home. They will confirm or suggest an alternative.`}
      >
        {state?.success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">Meeting request sent</p>
            <p className="text-sm text-slate-500 mt-1">
              The manager has been notified and will respond to your request.
            </p>
            <Button className="mt-5 bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="service_user_id" value={serviceUserId} />

            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>This is a request only — the home manager will confirm, decline, or suggest an alternative date.</p>
            </div>

            {/* Meeting type */}
            <div className="space-y-1.5">
              <Label htmlFor="meeting_type">Meeting type</Label>
              <Select id="meeting_type" name="meeting_type">
                {MEETING_TYPES.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </Select>
            </div>

            {/* Proposed date + time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="proposed_date">Proposed date <span className="text-red-500">*</span></Label>
                <Input
                  id="proposed_date"
                  name="proposed_date"
                  type="date"
                  min={minDate}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proposed_time">Preferred time</Label>
                <Input
                  id="proposed_time"
                  name="proposed_time"
                  type="time"
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="space-y-1.5">
              <Label htmlFor="purpose">
                Purpose / agenda <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="purpose"
                name="purpose"
                rows={4}
                placeholder="What is the meeting for? What topics need to be discussed? Any specific concerns to address?"
                required
              />
            </div>

            {/* Response time note */}
            <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
              <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
              <p>The manager will typically respond within 2 working days. You will see the response on this page.</p>
            </div>

            <div className="flex gap-3 pt-1">
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
