'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { Plus, CheckCircle, Star, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { addAppraisalAction } from '@/app/(portal)/staff/actions'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

interface AppraisalRecord {
  id: string
  appraisal_date: string
  period_start: string | null
  period_end: string | null
  overall_rating: string | null
  strengths: string | null
  development_areas: string | null
  notes: string | null
  signed_by_staff: boolean
  signed_at: string | null
  appraiser: { full_name: string } | null
}

interface RatingConfig {
  label: string
  variant: 'success' | 'primary' | 'warning' | 'danger' | 'default'
}

interface Props {
  staffId: string
  appraisals: AppraisalRecord[]
  ratingConfig: Record<string, RatingConfig>
  canEdit: boolean
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="flex-1 bg-purple-700 hover:bg-purple-800">
      {pending ? 'Saving…' : 'Save appraisal'}
    </Button>
  )
}

export function StaffAppraisalTab({ staffId, appraisals, ratingConfig, canEdit }: Props) {
  const [open, setOpen] = useState(false)
  const boundAction = addAppraisalAction.bind(null, staffId)
  const [state, formAction] = useFormState(boundAction, null)

  const lastAppraisalDate = appraisals[0]?.appraisal_date ?? null
  const monthsSinceLast = lastAppraisalDate
    ? Math.floor((Date.now() - new Date(lastAppraisalDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Appraisal records</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {appraisals.length} record{appraisals.length !== 1 ? 's' : ''}
            {lastAppraisalDate && (
              <span className={cn('ml-2', monthsSinceLast !== null && monthsSinceLast >= 12 ? 'text-amber-600 font-medium' : '')}>
                · Last: {formatDate(lastAppraisalDate)}
                {monthsSinceLast !== null && monthsSinceLast >= 12 && ' — annual appraisal due'}
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add appraisal
          </Button>
        )}
      </div>

      {appraisals.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No appraisal records yet.</p>
      ) : (
        <div className="space-y-4">
          {appraisals.map(a => {
            const ratingCfg = a.overall_rating ? ratingConfig[a.overall_rating] : null
            return (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900">{formatDate(a.appraisal_date)}</p>
                      {ratingCfg && (
                        <Badge variant={ratingCfg.variant}>
                          <Star className="h-3 w-3 mr-1" />
                          {ratingCfg.label}
                        </Badge>
                      )}
                    </div>
                    {(a.period_start || a.period_end) && (
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Period: {a.period_start ? formatDate(a.period_start) : '?'} – {a.period_end ? formatDate(a.period_end) : '?'}
                      </p>
                    )}
                    {a.appraiser && (
                      <p className="text-xs text-slate-500 mt-0.5">Appraiser: {a.appraiser.full_name}</p>
                    )}
                  </div>
                  <div>
                    {a.signed_by_staff && a.signed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Signed by staff {formatDate(a.signed_at)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Awaiting staff signature</span>
                    )}
                  </div>
                </div>

                {/* Content */}
                {(a.strengths || a.development_areas || a.notes) && (
                  <div className="border-t border-slate-100 pt-4 grid gap-4 sm:grid-cols-2">
                    {a.strengths && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Strengths</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{a.strengths}</p>
                      </div>
                    )}
                    {a.development_areas && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Development areas</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{a.development_areas}</p>
                      </div>
                    )}
                    {a.notes && (
                      <div className="sm:col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-slate-700 whitespace-pre-line">{a.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add appraisal modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add appraisal record" size="lg">
        {state?.success ? (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-900">Appraisal record saved</p>
            <Button className="mt-4 bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{state.error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="appraisal_date">Appraisal date <span className="text-red-500">*</span></Label>
                <Input id="appraisal_date" name="appraisal_date" type="date" required />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="overall_rating">Overall rating</Label>
                <Select id="overall_rating" name="overall_rating">
                  <option value="">— Select rating —</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="satisfactory">Satisfactory</option>
                  <option value="requires_improvement">Requires Improvement</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="period_start">Period start</Label>
                <Input id="period_start" name="period_start" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="period_end">Period end</Label>
                <Input id="period_end" name="period_end" type="date" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="strengths">Strengths / achievements</Label>
              <Textarea id="strengths" name="strengths" rows={3} placeholder="Key strengths identified during the appraisal period…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="development_areas">Development areas / objectives</Label>
              <Textarea id="development_areas" name="development_areas" rows={3} placeholder="Areas identified for professional development…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Additional notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
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
