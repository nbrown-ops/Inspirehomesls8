'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Loader2, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { updateIncidentStatusAction, signOffIncidentAction } from '@/app/(portal)/incidents/actions'
import { formatDateTime } from '@/lib/utils/dates'

interface Props {
  incidentId: string
  currentStatus: string
  canManage: boolean
  canEdit: boolean
  signOffBy: string | null
  signOffAt: string | null
  managerComments: string | null
}

const STATUS_FLOW = ['open', 'under_review', 'closed'] as const

const STATUS_LABELS: Record<string, string> = {
  open:         'Open',
  under_review: 'Under Review',
  closed:       'Closed',
  referred:     'Referred',
}


export function IncidentStatusPanel({
  incidentId, currentStatus, canManage, canEdit,
  signOffBy, signOffAt, managerComments,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [showSignOff, setShowSignOff] = useState(false)
  const [showRefer,   setShowRefer]   = useState(false)
  const [comments,    setComments]    = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(currentStatus)

  const isClosed = localStatus === 'closed' || localStatus === 'referred'

  function moveStatus(nextStatus: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateIncidentStatusAction(incidentId, nextStatus)
      if (result?.error) { setError(result.error); return }
      setLocalStatus(nextStatus)
    })
  }

  function handleSignOff() {
    setError(null)
    startTransition(async () => {
      const result = await signOffIncidentAction(incidentId, comments)
      if (result?.error) { setError(result.error); return }
      setLocalStatus('closed')
      setShowSignOff(false)
    })
  }

  function handleRefer() {
    setError(null)
    startTransition(async () => {
      const result = await updateIncidentStatusAction(incidentId, 'referred', comments)
      if (result?.error) { setError(result.error); return }
      setLocalStatus('referred')
      setShowRefer(false)
    })
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Status &amp; Sign-Off</h2>

      {/* Progress tracker */}
      <div className="flex items-center gap-0">
        {STATUS_FLOW.map((s, i) => {
          const done    = STATUS_FLOW.indexOf(localStatus as typeof STATUS_FLOW[number]) > i
                       || (localStatus === 'referred' && i < 2)
          const current = s === localStatus || (localStatus === 'referred' && i === 2)
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done    ? 'bg-green-500 text-white' :
                  current ? 'bg-purple-700 text-white ring-4 ring-purple-100' :
                            'bg-slate-200 text-slate-400'
                }`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${current ? 'text-purple-700' : done ? 'text-green-600' : 'text-slate-400'}`}>
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {localStatus === 'referred' && (
        <div className="text-sm text-blue-700 bg-blue-50 rounded-lg px-4 py-2 font-medium">
          This incident has been referred to an external agency.
        </div>
      )}

      {/* Signed-off summary */}
      {signOffBy && signOffAt && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-green-800">Signed off by {signOffBy}</p>
          <p className="text-green-700 text-xs mt-0.5">{formatDateTime(signOffAt)}</p>
          {managerComments && <p className="text-green-800 mt-2 whitespace-pre-wrap">{managerComments}</p>}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>
      )}

      {/* Actions */}
      {!isClosed && canManage && (
        <div className="flex flex-wrap gap-2 pt-1">
          {localStatus === 'open' && (
            <Button
              variant="secondary"
              onClick={() => moveStatus('under_review')}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              Move to Under Review
            </Button>
          )}

          {(localStatus === 'open' || localStatus === 'under_review') && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => { setShowSignOff(true); setShowRefer(false) }}
                disabled={isPending}
              >
                <CheckCircle2 className="h-4 w-4" /> Sign Off &amp; Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setShowRefer(true); setShowSignOff(false) }}
                disabled={isPending}
              >
                Refer to External Agency
              </Button>
            </>
          )}
        </div>
      )}

      {/* Staff: can move open → under_review but not sign off */}
      {!isClosed && !canManage && canEdit && localStatus === 'open' && (
        <Button
          variant="secondary"
          onClick={() => moveStatus('under_review')}
          disabled={isPending}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
          Submit for Manager Review
        </Button>
      )}

      {/* Sign-off panel */}
      {showSignOff && (
        <div className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-green-800">Manager sign-off</p>
          <p className="text-xs text-green-700">Add any final comments or actions taken before closing this incident.</p>
          <Textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="Manager comments (optional)…"
            rows={3}
          />
          <div className="flex gap-2">
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleSignOff} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm sign-off
            </Button>
            <Button variant="secondary" onClick={() => setShowSignOff(false)} disabled={isPending}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Refer panel */}
      {showRefer && (
        <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-800">Refer to external agency</p>
          <p className="text-xs text-blue-700">Record who you are referring to and the reason.</p>
          <Textarea
            value={comments}
            onChange={e => setComments(e.target.value)}
            placeholder="e.g. Referred to MASH, local safeguarding board, police…"
            rows={3}
          />
          <div className="flex gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleRefer} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm referral
            </Button>
            <Button variant="secondary" onClick={() => setShowRefer(false)} disabled={isPending}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  )
}
