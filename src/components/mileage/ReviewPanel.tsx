'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { reviewMileageClaimAction } from '@/app/(portal)/mileage/actions'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'

export function ReviewPanel({ claimId }: { claimId: string }) {
  const [notes, setNotes]     = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleReview(action: 'approved' | 'rejected') {
    if (action === 'rejected' && !notes.trim()) {
      setError('Please add a reason when rejecting a claim.')
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await reviewMileageClaimAction(claimId, action, notes)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Review this claim</h2>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reviewer_notes">
          Notes <span className="text-slate-400 font-normal">(required if rejecting)</span>
        </Label>
        <Textarea
          id="reviewer_notes"
          rows={3}
          placeholder="Add any notes for the staff member…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          disabled={isPending}
        />
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          onClick={() => handleReview('approved')}
          loading={isPending}
          className="flex-1 bg-green-600 hover:bg-green-700 focus-visible:ring-green-600"
        >
          <CheckCircle className="h-4 w-4" />
          Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => handleReview('rejected')}
          disabled={isPending}
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  )
}
