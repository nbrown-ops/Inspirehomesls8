'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { scheduleShiftAction } from '@/app/(portal)/shifts/actions'

const SHIFT_OPTIONS = [
  { value: 'morning',      label: 'Morning (AM)' },
  { value: 'evening',      label: 'Evening (PM)' },
  { value: 'waking_night', label: 'Waking Night' },
  { value: 'sleep_in',     label: 'Sleep-In' },
]

const SHIFT_DEFAULTS: Record<string, { start: string; end: string }> = {
  morning:      { start: '07:00', end: '15:00' },
  evening:      { start: '15:00', end: '23:00' },
  waking_night: { start: '23:00', end: '07:00' },
  sleep_in:     { start: '22:00', end: '08:00' },
}

interface Props {
  homeId: string
  staffList: { id: string; full_name: string }[]
  defaultDate?: string
  onAdded: () => void
  onClose: () => void
}

export function AddShiftToScheduleModal({ homeId, staffList, defaultDate, onAdded, onClose }: Props) {
  const today = new Date()
  const [date, setDate]           = useState(defaultDate ?? today.toISOString().split('T')[0])
  const [shiftType, setShiftType] = useState('morning')
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime]     = useState('15:00')
  const [staffId, setStaffId]     = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  function handleShiftTypeChange(type: string) {
    setShiftType(type)
    const defaults = SHIFT_DEFAULTS[type]
    if (defaults) { setStartTime(defaults.start); setEndTime(defaults.end) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !shiftType) return
    setSaving(true); setError(null)

    const fd = new FormData()
    fd.append('home_id', homeId)
    fd.append('shift_type', shiftType)
    fd.append('start_time', new Date(`${date}T${startTime}:00`).toISOString())

    if (endTime) {
      // If end time <= start time, shift ends the following day
      const [sh, sm] = startTime.split(':').map(Number)
      const [eh, em] = endTime.split(':').map(Number)
      const sMin = sh * 60 + sm
      const eMin = eh * 60 + em
      let endDate = date
      if (eMin <= sMin) {
        const d = new Date(date); d.setDate(d.getDate() + 1)
        endDate = d.toISOString().split('T')[0]
      }
      fd.append('end_time', new Date(`${endDate}T${endTime}:00`).toISOString())
    }

    if (staffId) fd.append('staff_id', staffId)

    const result = await scheduleShiftAction(fd)
    setSaving(false)

    if (result?.error) { setError(result.error) }
    else { onAdded() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Add shift to schedule</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-500">
            Enter a shift you&apos;ve been accepted for in Sling. It will appear red on the schedule
            and turn green once you clock in.
          </p>

          {/* Manager: staff selector */}
          {staffList.length > 0 && (
            <div>
              <Label htmlFor="staffId">Staff member</Label>
              <select
                id="staffId"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">My shift</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="shiftDate">Date *</Label>
              <Input
                id="shiftDate"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="shiftType">Shift type *</Label>
              <select
                id="shiftType"
                value={shiftType}
                onChange={e => handleShiftTypeChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {SHIFT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startTime">Start time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={saving} className="flex-1 bg-purple-700 hover:bg-purple-800">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add to schedule'}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
