'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import { Plus, CheckCircle, Flag, AlertTriangle, X, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { addTimelineEntryAction } from '@/app/(portal)/timeline/actions'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { INTERACTION_CONFIG } from '@/lib/constants/timeline'
import type { InteractionType } from '@/types'
import { cn } from '@/lib/utils/cn'

const INTERACTION_TYPES = Object.entries(INTERACTION_CONFIG) as [InteractionType, typeof INTERACTION_CONFIG[InteractionType]][]

// Filter to the "quick log" types shown in the FAB (all except handover)
const QUICK_LOG_TYPES = INTERACTION_TYPES.filter(([k]) => k !== 'handover')

interface Resident {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  home: { name: string } | null
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      loading={pending}
      className="flex-1 bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
    >
      {pending ? 'Logging…' : 'Log interaction'}
    </Button>
  )
}

export function QuickLogFAB({ preselectedResidentId }: { preselectedResidentId?: string }) {
  const [open, setOpen]             = useState(false)
  const [residents, setResidents]   = useState<Resident[]>([])
  const [search, setSearch]         = useState('')
  const [selectedResident, setSelected] = useState<Resident | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [noteLen, setNoteLen]       = useState(0)
  const [flagged, setFlagged]       = useState(false)
  const [selectedType, setType]     = useState<InteractionType>('welfare_check')
  const dropdownRef                 = useRef<HTMLDivElement>(null)

  const [state, formAction] = useFormState(addTimelineEntryAction, null)

  // Load residents when modal opens
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('service_users')
      .select('id, first_name, last_name, preferred_name, home:homes!home_id(name)')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => {
        const list = (data ?? []) as unknown as Resident[]
        setResidents(list)
        if (preselectedResidentId) {
          setSelected(list.find(r => r.id === preselectedResidentId) ?? null)
        }
      })
  }, [open, preselectedResidentId])

  // Reset on success
  useEffect(() => {
    if (state?.success) {
      setTimeout(() => {
        setOpen(false)
        setSearch('')
        setSelected(null)
        setFlagged(false)
        setNoteLen(0)
        setType('welfare_check')
      }, 1800)
    }
  }, [state])

  // Close resident dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = residents.filter(r => {
    const name = `${r.first_name} ${r.last_name} ${r.preferred_name ?? ''}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40',
          'w-14 h-14 rounded-full bg-purple-700 text-white shadow-lg',
          'flex items-center justify-center',
          'hover:bg-purple-800 active:scale-95 transition-all',
          'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
        )}
        aria-label="Log interaction"
        title="Log interaction (quick entry)"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Backdrop + Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Log interaction</h2>
                <p className="text-xs text-slate-500">Quick entry — max 500 characters</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              {state?.success ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-900">Interaction logged</p>
                  <p className="text-sm text-slate-500 mt-1">Added to {selectedResident?.first_name}&apos;s timeline.</p>
                </div>
              ) : (
                <form action={formAction} className="space-y-5">
                  {state?.error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                      {state.error}
                    </div>
                  )}

                  {/* Resident picker */}
                  <div className="space-y-1.5" ref={dropdownRef}>
                    <Label>Resident <span className="text-red-500">*</span></Label>
                    <input type="hidden" name="service_user_id" value={selectedResident?.id ?? ''} />
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDropdown(d => !d)}
                        className={cn(
                          'w-full flex items-center justify-between gap-2 h-9 px-3 rounded-md border text-sm text-left',
                          'transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500',
                          selectedResident ? 'text-slate-900 border-slate-300' : 'text-slate-400 border-slate-300'
                        )}
                      >
                        <span className="truncate">
                          {selectedResident
                            ? `${selectedResident.preferred_name ?? selectedResident.first_name} ${selectedResident.last_name} — ${selectedResident.home?.name ?? ''}`
                            : 'Search residents…'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>

                      {showDropdown && (
                        <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <Input
                              autoFocus
                              placeholder="Type to search…"
                              value={search}
                              onChange={e => setSearch(e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="max-h-52 overflow-y-auto">
                            {filtered.length === 0 ? (
                              <p className="p-3 text-sm text-slate-400 text-center">No residents found</p>
                            ) : (
                              filtered.map(r => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => { setSelected(r); setShowDropdown(false); setSearch('') }}
                                  className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors text-sm"
                                >
                                  <span className="font-medium text-slate-900">
                                    {r.preferred_name ?? r.first_name} {r.last_name}
                                  </span>
                                  <span className="ml-2 text-slate-400">{r.home?.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interaction type */}
                  <div className="space-y-1.5">
                    <Label>Interaction type <span className="text-red-500">*</span></Label>
                    <input type="hidden" name="interaction_type" value={selectedType} />
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {QUICK_LOG_TYPES.map(([value, config]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setType(value)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all',
                            selectedType === value
                              ? `${config.bg} border-current ${config.color} font-medium`
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          )}
                        >
                          <span className={cn('w-2 h-2 rounded-full shrink-0', config.dot)} />
                          {config.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="quick-note">Note <span className="text-red-500">*</span></Label>
                      <span className={cn('text-xs', noteLen > 450 ? 'text-red-500 font-medium' : 'text-slate-400')}>
                        {noteLen}/500
                      </span>
                    </div>
                    <Textarea
                      id="quick-note"
                      name="notes"
                      placeholder="What happened? Keep it factual and specific…"
                      rows={4}
                      maxLength={500}
                      onChange={e => setNoteLen(e.target.value.length)}
                    />
                  </div>

                  {/* Duration (optional) */}
                  <div className="flex items-center gap-3">
                    <div className="space-y-1.5 w-28">
                      <Label htmlFor="duration">Duration (min)</Label>
                      <Input id="duration" name="duration_minutes" type="number" min="1" max="480" placeholder="—" className="text-center" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="outcome">Outcome (optional)</Label>
                      <Input id="outcome" name="outcome" placeholder="e.g. Engaged well, Refused, Resolved" />
                    </div>
                  </div>

                  {/* Flag toggle */}
                  <div className={cn(
                    'rounded-xl border p-3 transition-colors cursor-pointer',
                    flagged ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                  )}>
                    <input type="hidden" name="is_flagged" value={String(flagged)} />
                    <button type="button" onClick={() => setFlagged(f => !f)} className="w-full flex items-start gap-3 text-left">
                      <div className={cn(
                        'mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        flagged ? 'bg-red-500 border-red-500' : 'border-slate-400 bg-white'
                      )}>
                        {flagged && <span className="text-white text-xs leading-none">✓</span>}
                      </div>
                      <div>
                        <p className={cn('text-sm font-medium leading-tight', flagged ? 'text-red-700' : 'text-slate-700')}>
                          <Flag className="inline h-3.5 w-3.5 mr-1" />
                          Escalate to manager
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">Use for concerns requiring follow-up</p>
                      </div>
                    </button>
                    {flagged && (
                      <div className="mt-2.5 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3" />
                          Reason for escalation
                        </div>
                        <Input name="flagged_reason" placeholder="Briefly describe the concern…" className="text-sm" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <SubmitBtn />
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
