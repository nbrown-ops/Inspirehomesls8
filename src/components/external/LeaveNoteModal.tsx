'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { MessageSquare, CheckCircle, Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { leaveNoteAction } from '@/app/(external)/portal/actions'

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="flex-1 bg-purple-700 hover:bg-purple-800">
      {pending ? 'Sending…' : 'Send message'}
    </Button>
  )
}

export function LeaveNoteModal({ serviceUserId, residentName }: { serviceUserId: string; residentName: string }) {
  const [open, setOpen]   = useState(false)
  const [chars, setChars] = useState(0)
  const [state, formAction] = useFormState(leaveNoteAction, null)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-purple-700 hover:bg-purple-800 w-full sm:w-auto"
      >
        <MessageSquare className="h-4 w-4" />
        Message the team
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Message the care team"
        description={`Leave a note for the staff at ${residentName}'s home. The key worker and manager will be notified.`}
      >
        {state?.success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-slate-900">Message sent</p>
            <p className="text-sm text-slate-500 mt-1">The key worker and manager have been notified.</p>
            <Button className="mt-5 bg-purple-700 hover:bg-purple-800" onClick={() => { setOpen(false) }}>
              Close
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="service_user_id" value={serviceUserId} />

            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

            <div className="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Your message will be visible to staff and managers at the home.
                It creates a permanent, auditable record. Do not include anything
                you would not be comfortable with being seen by a court.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="note-body">Your message <span className="text-red-500">*</span></Label>
                <span className={`text-xs ${chars > 900 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                  {chars}/1000
                </span>
              </div>
              <Textarea
                id="note-body"
                name="body"
                rows={6}
                maxLength={1000}
                placeholder={`Write your message to the team supporting ${residentName}…`}
                onChange={e => setChars(e.target.value.length)}
                autoFocus
              />
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
