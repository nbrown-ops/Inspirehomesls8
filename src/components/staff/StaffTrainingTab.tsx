'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { useState } from 'react'
import { Plus, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { addTrainingAction } from '@/app/(portal)/staff/actions'
import { getTrainingStatus } from '@/lib/utils/compliance'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

interface TrainingRecord {
  id: string
  training_name: string
  category_id: string | null
  completed_date: string
  expiry_date: string | null
  provider: string | null
  notes: string | null
}

interface Category {
  id: string
  name: string
  valid_for_months: number
}

interface Props {
  staffId: string
  training: TrainingRecord[]
  categories: Category[]
  trainingGaps: Category[]
  canEdit: boolean
}

const STATUS_CONFIG = {
  valid:          { label: 'Valid',          classes: 'bg-green-100 text-green-700 border-green-200' },
  expiring_soon:  { label: 'Expiring Soon',  classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  expired:        { label: 'Expired',        classes: 'bg-red-100 text-red-700 border-red-200'       },
  missing:        { label: 'No expiry set',  classes: 'bg-slate-100 text-slate-500 border-slate-200' },
}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="flex-1 bg-purple-700 hover:bg-purple-800">
      {pending ? 'Saving…' : 'Save training record'}
    </Button>
  )
}

export function StaffTrainingTab({ staffId, training, categories, trainingGaps, canEdit }: Props) {
  const [open, setOpen] = useState(false)
  const boundAction = addTrainingAction.bind(null, staffId)
  const [state, formAction] = useFormState(boundAction, null)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Training records</h3>
          <p className="text-xs text-slate-500 mt-0.5">{training.length} record{training.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <Button size="sm" className="bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add training
          </Button>
        )}
      </div>

      {/* Gaps */}
      {trainingGaps.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <p className="text-sm font-semibold text-red-800">Mandatory training not completed or expired</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {trainingGaps.map(g => (
              <span key={g.id} className="px-2.5 py-1 bg-red-100 border border-red-200 rounded-full text-xs text-red-700 font-medium">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Training records list */}
      {training.length === 0 ? (
        <p className="text-sm text-slate-400 italic">No training records yet.</p>
      ) : (
        <div className="space-y-2">
          {training.map(t => {
            const status = getTrainingStatus(t.expiry_date)
            const cfg    = STATUS_CONFIG[status]
            return (
              <div
                key={t.id}
                className={cn(
                  'bg-white rounded-xl border p-4 flex items-start justify-between gap-4',
                  status === 'expired' ? 'border-red-200 bg-red-50/30' :
                  status === 'expiring_soon' ? 'border-amber-200' : 'border-slate-200'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-medium text-slate-900 text-sm">{t.training_name}</p>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', cfg.classes)}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed: {formatDate(t.completed_date)}
                    </span>
                    {t.expiry_date && (
                      <span className={cn('flex items-center gap-1', status === 'expired' && 'text-red-600 font-medium')}>
                        <Clock className="h-3 w-3" />
                        Expires: {formatDate(t.expiry_date)}
                      </span>
                    )}
                    {t.provider && <span>Provider: {t.provider}</span>}
                  </div>
                  {t.notes && <p className="text-xs text-slate-500 mt-1 italic">{t.notes}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add training modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Add training record">
        {state?.success ? (
          <div className="text-center py-6">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-900">Training record saved</p>
            <Button className="mt-4 bg-purple-700 hover:bg-purple-800" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="category_id">Mandatory training category</Label>
              <Select id="category_id" name="category_id">
                <option value="">— Other / not in list —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="training_name">Training name <span className="text-red-500">*</span></Label>
              <Input id="training_name" name="training_name" placeholder="e.g. Safeguarding Children Level 2" required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="completed_date">Completed date <span className="text-red-500">*</span></Label>
                <Input id="completed_date" name="completed_date" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiry_date">Expiry date</Label>
                <Input id="expiry_date" name="expiry_date" type="date" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider">Training provider</Label>
              <Input id="provider" name="provider" placeholder="e.g. SCIE, e-learning, in-house" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
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
