'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Sun, Moon, Eye, BedDouble } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { clockInAction } from '../actions'
import { cn } from '@/lib/utils/cn'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const SHIFT_TYPES = [
  { value: 'morning',      label: 'Morning Start',  time: '10am – 7pm',  icon: Sun,       color: 'text-amber-500'  },
  { value: 'evening',      label: 'Evening Start',  time: '7pm – 10am',  icon: Moon,      color: 'text-indigo-500' },
  { value: 'waking_night', label: 'Waking Night',   time: '7pm – 10am',  icon: Eye,       color: 'text-purple-600' },
  { value: 'sleep_in',     label: 'Sleep-In',       time: '7pm – 10am',  icon: BedDouble, color: 'text-blue-600'   },
]

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      loading={pending}
      size="lg"
      className="w-full bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
    >
      {pending ? 'Clocking in…' : 'Clock in and start shift'}
    </Button>
  )
}

export default function ClockInPage() {
  const [state, formAction]   = useFormState(clockInAction, null)
  const [shiftType, setShift] = useState<string>('')
  const [homes, setHomes]     = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('homes').select('id, name').eq('is_active', true).order('name')
      .then(({ data }) => setHomes(data ?? []))
  }, [])

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <Link href="/shifts" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Shift dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Clock in</h1>
        <p className="mt-1 text-sm text-slate-500">Select your property and shift type to begin.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        {state?.error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-6">
          {/* Property */}
          <div className="space-y-1.5">
            <Label htmlFor="home_id">Property <span className="text-red-500">*</span></Label>
            <Select id="home_id" name="home_id" required>
              <option value="">Select property…</option>
              {homes.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </Select>
          </div>

          {/* Shift type selector */}
          <div className="space-y-2">
            <Label>Shift type <span className="text-red-500">*</span></Label>
            <input type="hidden" name="shift_type" value={shiftType} />
            <div className="grid grid-cols-2 gap-3">
              {SHIFT_TYPES.map(({ value, label, time, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setShift(value)}
                  className={cn(
                    'flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all',
                    shiftType === value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  )}
                >
                  <Icon className={cn('h-5 w-5', shiftType === value ? 'text-purple-600' : color)} />
                  <span className={cn('text-sm font-medium', shiftType === value ? 'text-purple-700' : 'text-slate-900')}>
                    {label}
                  </span>
                  <span className="text-xs text-slate-400">{time}</span>
                </button>
              ))}
            </div>
          </div>

          <SubmitBtn />
        </form>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Your clock-in time is recorded and cannot be changed. All activity during the shift is logged.
      </p>
    </div>
  )
}
