'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, CalendarDays, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { AddShiftToScheduleModal } from '@/components/shifts/AddShiftToScheduleModal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftEntry {
  id: string
  staff_id: string
  shift_type: string
  start_time: string
  end_time: string | null
  clocked_in_at: string | null
  staff: { full_name: string } | null
}

interface StaffMember {
  id: string
  full_name: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_ABBR = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const SHIFT_ABBR: Record<string, string> = {
  morning:      'AM',
  evening:      'PM',
  waking_night: 'WN',
  sleep_in:     'SI',
  afternoon:    'AFT',
  night:        'N',
}

const SHIFT_LABEL: Record<string, string> = {
  morning:      'Morning',
  evening:      'Evening',
  waking_night: 'Waking Night',
  sleep_in:     'Sleep-In',
  afternoon:    'Afternoon',
  night:        'Night',
}

// ─── Pay period helpers ───────────────────────────────────────────────────────

function getPayPeriod(today = new Date()) {
  const d = today.getDate()
  const m = today.getMonth()
  const y = today.getFullYear()
  let periodStart: Date, periodEnd: Date, payDay: Date
  if (d >= 20) {
    periodStart = new Date(y, m, 20)
    periodEnd   = new Date(y, m + 1, 19, 23, 59, 59)
    payDay      = new Date(y, m + 1, 27)
  } else {
    periodStart = new Date(y, m - 1, 20)
    periodEnd   = new Date(y, m, 19, 23, 59, 59)
    payDay      = new Date(y, m, 27)
  }
  return { periodStart, periodEnd, payDay }
}

function fmtDate(d: Date) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftSchedulePage() {
  const supabase = createClient()
  const today    = new Date()

  const [viewYear, setViewYear]   = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [loading, setLoading]     = useState(true)
  const [shifts, setShifts]       = useState<ShiftEntry[]>([])
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [userId, setUserId]       = useState('')
  const [homeId, setHomeId]       = useState('')
  const [isManager, setIsManager] = useState(false)
  const [showAdd, setShowAdd]     = useState(false)

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysArray   = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const loadShifts = useCallback(async () => {
    const monthStart = new Date(viewYear, viewMonth, 1).toISOString()
    const monthEnd   = new Date(viewYear, viewMonth + 1, 1).toISOString()
    const { data } = await supabase
      .from('shifts')
      .select('id, staff_id, shift_type, start_time, end_time, clocked_in_at, staff:profiles!staff_id(full_name)')
      .gte('start_time', monthStart)
      .lt('start_time', monthEnd)
      .order('start_time')
    setShifts((data as unknown as ShiftEntry[]) ?? [])
  }, [supabase, viewYear, viewMonth])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [{ data: profile }, { data: assignment }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('user_home_assignments').select('home_id').eq('user_id', user.id).limit(1).single(),
      ])

      const manager = profile && ['super_admin', 'manager'].includes(profile.role)
      setIsManager(!!manager)
      if (assignment) setHomeId(assignment.home_id)

      if (manager) {
        const { data: staff } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('role', ['staff', 'manager', 'super_admin'])
          .order('full_name')
        setStaffList((staff as StaffMember[]) ?? [])
      } else {
        const { data: me } = await supabase
          .from('profiles').select('id, full_name').eq('id', user.id).single()
        if (me) setStaffList([{ id: me.id, full_name: me.full_name }])
      }

      await loadShifts()
      setLoading(false)
    }
    init()
  }, [supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (userId) loadShifts()
  }, [viewYear, viewMonth, userId, loadShifts])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Build lookup: staffId → dayNum → ShiftEntry[]
  const shiftMap = new Map<string, Map<number, ShiftEntry[]>>()
  for (const s of shifts) {
    const day = new Date(s.start_time).getDate()
    if (!shiftMap.has(s.staff_id)) shiftMap.set(s.staff_id, new Map())
    const dm = shiftMap.get(s.staff_id)!
    if (!dm.has(day)) dm.set(day, [])
    dm.get(day)!.push(s)
  }

  // Pay period
  const { periodStart, periodEnd, payDay } = getPayPeriod()

  function isInPeriod(day: number) {
    const d = new Date(viewYear, viewMonth, day)
    return d >= periodStart && d <= periodEnd
  }
  function isToday(day: number) {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
  }

  // My pay period stats
  const myPeriodShifts = shifts.filter(s => {
    if (s.staff_id !== userId) return false
    const st = new Date(s.start_time)
    return st >= periodStart && st <= periodEnd
  })
  const totalHours = myPeriodShifts.reduce((sum, s) => {
    if (!s.clocked_in_at || !s.end_time) return sum
    return sum + (new Date(s.end_time).getTime() - new Date(s.clocked_in_at).getTime()) / 3_600_000
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link href="/shifts" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Shifts
        </Link>
      </div>

      {/* Pay period banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <CalendarDays className="h-5 w-5 text-purple-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-purple-900">
              Current pay period: {fmtDate(periodStart)} → {fmtDate(periodEnd)}
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              Salary paid: {fmtDate(payDay)}
              {myPeriodShifts.length > 0 && (
                <>
                  {' · '}
                  <span className="text-red-500 font-medium">{myPeriodShifts.filter(s => !s.clocked_in_at && !s.end_time).length} scheduled</span>
                  {' · '}
                  <span className="text-green-600 font-medium">{myPeriodShifts.filter(s => !!s.clocked_in_at && !s.end_time).length} active</span>
                  {' · '}
                  <span className="text-slate-500 font-medium">{myPeriodShifts.filter(s => !!s.end_time).length} completed</span>
                  {totalHours > 0 && ` · ${totalHours.toFixed(1)}h logged`}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Month navigator + controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="text-lg font-bold text-slate-900 w-44 text-center">
            {MONTHS[viewMonth]} {viewYear}
          </h1>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()) }}
            className="text-xs text-slate-500 hover:text-purple-700 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:border-purple-300 transition-colors ml-1"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" />Scheduled
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Clocked in
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" />Completed
            </span>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-purple-700 hover:bg-purple-800 text-sm">
            + Add shift
          </Button>
        </div>
      </div>

      {/* Schedule grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm" style={{ minWidth: `${160 + daysInMonth * 44}px` }}>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {/* Name col header */}
                <th className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200 px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-40">
                  {isManager ? 'Staff' : 'Schedule'}
                </th>
                {daysArray.map(day => {
                  const dow     = new Date(viewYear, viewMonth, day).getDay()
                  const inPay   = isInPeriod(day)
                  const todayCl = isToday(day)
                  return (
                    <th
                      key={day}
                      className={[
                        'px-1 py-2 text-center w-11 border-r border-slate-100 last:border-r-0',
                        inPay   ? 'bg-purple-50'   : '',
                        [0,6].includes(dow) ? 'bg-slate-100/60' : '',
                      ].join(' ')}
                    >
                      <div className="text-[9px] text-slate-400 leading-none mb-1">{DAY_ABBR[dow]}</div>
                      {todayCl ? (
                        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center mx-auto">
                          <span className="text-xs font-bold text-white leading-none">{day}</span>
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-slate-700 leading-none">{day}</div>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="text-center py-12 text-slate-400 text-sm italic">
                    No staff found
                  </td>
                </tr>
              ) : staffList.map(member => {
                const dayMap = shiftMap.get(member.id) ?? new Map<number, ShiftEntry[]>()
                return (
                  <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Sticky name cell */}
                    <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-3 py-2 whitespace-nowrap w-40">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-[10px] font-bold shrink-0">
                          {member.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-slate-800 truncate max-w-[96px]">
                          {member.full_name}
                        </span>
                      </div>
                    </td>
                    {daysArray.map(day => {
                      const dayShifts = dayMap.get(day) ?? []
                      const inPay     = isInPeriod(day)
                      const isWknd    = [0,6].includes(new Date(viewYear, viewMonth, day).getDay())
                      return (
                        <td
                          key={day}
                          className={[
                            'px-0.5 py-1 align-top border-r border-slate-100 last:border-r-0 w-11',
                            inPay  ? 'bg-purple-50/40' : '',
                            isWknd ? 'bg-slate-50/60'  : '',
                          ].join(' ')}
                        >
                          <div className="flex flex-col gap-0.5">
                            {dayShifts.map(shift => {
                              const abbr        = SHIFT_ABBR[shift.shift_type] ?? shift.shift_type.slice(0,2).toUpperCase()
                              const label       = SHIFT_LABEL[shift.shift_type] ?? shift.shift_type
                              const isCompleted = !!shift.end_time
                              const isClockedIn = !!shift.clocked_in_at && !shift.end_time
                              const blockCls    = isCompleted ? 'bg-slate-200 text-slate-500'
                                : isClockedIn ? 'bg-green-500 text-white'
                                : 'bg-red-400 text-white'

                              const inner = (
                                <span
                                  className={`block rounded px-1 py-0.5 text-[10px] font-bold leading-tight text-center ${blockCls} hover:opacity-80 transition-opacity cursor-pointer`}
                                  title={`${label} · ${isCompleted ? 'Completed' : isClockedIn ? 'Active' : 'Scheduled'}`}
                                >
                                  {abbr}
                                </span>
                              )

                              return shift.clocked_in_at ? (
                                <Link key={shift.id} href={`/shifts/${shift.id}`}>
                                  {inner}
                                </Link>
                              ) : (
                                <span key={shift.id}>{inner}</span>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* My pay period summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">My pay period summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatBox
            label="Scheduled"
            value={myPeriodShifts.filter(s => !s.clocked_in_at && !s.end_time).length}
            sub="not yet started"
            color="text-red-500"
          />
          <StatBox
            label="Active"
            value={myPeriodShifts.filter(s => !!s.clocked_in_at && !s.end_time).length}
            sub="clocked in now"
            color="text-green-600"
          />
          <StatBox
            label="Completed"
            value={myPeriodShifts.filter(s => !!s.end_time).length}
            sub="this period"
            color="text-slate-500"
          />
          <StatBox
            label={totalHours > 0 ? `${totalHours.toFixed(1)}h` : `${myPeriodShifts.length}`}
            value=""
            sub={totalHours > 0 ? 'hours logged' : 'total shifts'}
            color="text-purple-700"
          />
        </div>
      </div>

      {/* Add shift modal */}
      {showAdd && homeId && (
        <AddShiftToScheduleModal
          homeId={homeId}
          staffList={isManager ? staffList : []}
          defaultDate={`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(
            today.getFullYear() === viewYear && today.getMonth() === viewMonth
              ? today.getDate()
              : 1
          ).padStart(2, '0')}`}
          onAdded={async () => { await loadShifts(); setShowAdd(false) }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}

function StatBox({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="text-center p-3 bg-slate-50 rounded-xl">
      <p className={`text-2xl font-bold ${color}`}>{value !== '' ? value : label}</p>
      <p className="text-xs text-slate-400 mt-1">{value !== '' ? label : sub}</p>
      {value !== '' && <p className="text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}
