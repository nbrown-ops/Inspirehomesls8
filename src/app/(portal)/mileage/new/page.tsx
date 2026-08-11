'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Car } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { submitMileageClaimAction } from '../actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'

const RATE_PER_MILE = 0.45

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      loading={pending}
      size="lg"
      className="w-full bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
    >
      {pending ? 'Submitting…' : 'Submit claim'}
    </Button>
  )
}

export default function NewMileageClaimPage() {
  const [state, formAction] = useFormState(submitMileageClaimAction, null)
  const [miles, setMiles]   = useState<string>('')
  const [homes, setHomes]   = useState<{ id: string; name: string }[]>([])
  const [residents, setResidents] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [selectedHome, setSelectedHome] = useState<string>('')

  const estimated = miles && !isNaN(parseFloat(miles))
    ? (parseFloat(miles) * RATE_PER_MILE).toFixed(2)
    : null

  useEffect(() => {
    const supabase = createClient()
    supabase.from('homes').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setHomes(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedHome) { setResidents([]); return }
    const supabase = createClient()
    supabase
      .from('service_users')
      .select('id, first_name, last_name')
      .eq('home_id', selectedHome)
      .eq('status', 'active')
      .order('first_name')
      .then(({ data }) => setResidents(data ?? []))
  }, [selectedHome])

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link href="/mileage" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Mileage claims
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New mileage claim</h1>
        <p className="mt-1 text-sm text-slate-500">
          Record miles driven when transporting a service user for an activity.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="claim_date">Journey date <span className="text-red-500">*</span></Label>
            <Input
              id="claim_date"
              name="claim_date"
              type="date"
              max={today}
              defaultValue={today}
              required
            />
          </div>

          {/* Property */}
          <div className="space-y-1.5">
            <Label htmlFor="home_id">Property</Label>
            <Select
              id="home_id"
              name="home_id"
              value={selectedHome}
              onChange={e => setSelectedHome(e.target.value)}
            >
              <option value="">Select property…</option>
              {homes.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </Select>
          </div>

          {/* Service user */}
          <div className="space-y-1.5">
            <Label htmlFor="service_user_id">Service user (if applicable)</Label>
            <Select id="service_user_id" name="service_user_id" disabled={residents.length === 0}>
              <option value="">{residents.length === 0 ? 'Select a property first…' : 'Select service user…'}</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>
              ))}
            </Select>
          </div>

          {/* Purpose */}
          <div className="space-y-1.5">
            <Label htmlFor="purpose">Purpose of journey <span className="text-red-500">*</span></Label>
            <Input
              id="purpose"
              name="purpose"
              type="text"
              placeholder="e.g. Shopping trip, hospital appointment, leisure activity…"
              required
            />
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from_location">From</Label>
              <Input id="from_location" name="from_location" type="text" placeholder="e.g. Harehills LS8" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to_location">To</Label>
              <Input id="to_location" name="to_location" type="text" placeholder="e.g. Leeds City Centre" />
            </div>
          </div>

          {/* Miles */}
          <div className="space-y-1.5">
            <Label htmlFor="miles">Total miles <span className="text-red-500">*</span></Label>
            <Input
              id="miles"
              name="miles"
              type="number"
              min="0.1"
              max="500"
              step="0.1"
              placeholder="0.0"
              value={miles}
              onChange={e => setMiles(e.target.value)}
              required
            />
            {estimated && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-purple-50 border border-purple-100 rounded-lg">
                <Car className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="text-sm text-purple-800">
                  Estimated reimbursement: <strong>£{estimated}</strong>
                  <span className="text-purple-500"> ({miles} miles × 45p)</span>
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="staff_notes">Additional notes</Label>
            <Textarea
              id="staff_notes"
              name="staff_notes"
              rows={3}
              placeholder="Any additional context for your manager…"
            />
          </div>

          <SubmitBtn />
        </form>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Reimbursed at the HMRC approved rate of <strong>45p per mile</strong>.
        Claims are reviewed and approved by your manager.
      </p>
    </div>
  )
}
