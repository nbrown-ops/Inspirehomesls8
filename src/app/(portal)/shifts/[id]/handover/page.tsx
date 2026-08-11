'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { submitHandoverAction } from '../../actions'
import { createClient } from '@/lib/supabase/client'

interface Props { params: { id: string } }

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      loading={pending}
      className="bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
    >
      {pending ? 'Submitting…' : 'Submit handover'}
    </Button>
  )
}

export default function HandoverPage({ params }: Props) {
  const [homeId, setHomeId]   = useState<string>('')
  const [staff, setStaff]     = useState<{ id: string; full_name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    // Get shift home
    supabase.from('shifts').select('home_id').eq('id', params.id).single()
      .then(({ data }) => {
        if (!data) return
        setHomeId(data.home_id)
        // Get staff assigned to same home for incoming staff select
        supabase.from('profiles')
          .select('id, full_name')
          .eq('is_active', true)
          .in('role', ['manager', 'staff'])
          .order('full_name')
          .then(({ data: staffData }) => setStaff(staffData ?? []))
      })
  }, [params.id])

  const boundAction = submitHandoverAction.bind(null, params.id, homeId)
  const [state, formAction] = useFormState(boundAction, null)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href={`/shifts/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to shift
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shift handover</h1>
            <p className="text-sm text-slate-500">Complete before clocking out. Incoming staff must acknowledge.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {state?.error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-6">
          {/* Incoming staff */}
          <div className="space-y-1.5">
            <Label htmlFor="incoming_staff_id">Incoming staff member</Label>
            <Select id="incoming_staff_id" name="incoming_staff_id">
              <option value="">Not known / TBC</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </Select>
            <p className="text-xs text-slate-400">If selected, they will receive a notification to acknowledge this handover.</p>
          </div>

          {/* Summary — required */}
          <div className="space-y-1.5">
            <Label htmlFor="summary">
              Handover summary <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="summary"
              name="summary"
              placeholder="Overall shift summary — how were residents, any notable events, what the incoming shift needs to know…"
              rows={5}
              required
            />
          </div>

          {/* Urgent actions */}
          <div className="space-y-1.5">
            <Label htmlFor="urgent_actions">Urgent actions for incoming shift</Label>
            <Textarea
              id="urgent_actions"
              name="urgent_actions"
              placeholder="Anything that must happen immediately on the next shift…"
              rows={3}
            />
          </div>

          {/* Medication notes */}
          <div className="space-y-1.5">
            <Label htmlFor="medication_notes">Medication notes</Label>
            <Textarea
              id="medication_notes"
              name="medication_notes"
              placeholder="Medication administered, refused, or any changes…"
              rows={2}
            />
          </div>

          {/* Incidents */}
          <div className="space-y-1.5">
            <Label htmlFor="incidents_summary">Incidents summary</Label>
            <Textarea
              id="incidents_summary"
              name="incidents_summary"
              placeholder="Any incidents that occurred this shift (reference incident report numbers if raised)…"
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => history.back()}
            >
              Cancel
            </Button>
            <div className="flex-1">
              <SubmitBtn />
            </div>
          </div>
        </form>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Handover policy</p>
        <p>Handover notes are permanent records and cannot be edited once submitted. Incoming staff must acknowledge before writing log entries on the next shift.</p>
      </div>
    </div>
  )
}
