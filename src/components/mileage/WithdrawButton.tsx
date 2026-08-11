'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteMileageClaimAction } from '@/app/(portal)/mileage/actions'

export function WithdrawButton({ claimId }: { claimId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleWithdraw() {
    if (!confirm('Are you sure you want to withdraw this claim?')) return
    startTransition(() => deleteMileageClaimAction(claimId))
  }

  return (
    <button
      type="button"
      onClick={handleWithdraw}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? 'Withdrawing…' : 'Withdraw claim'}
    </button>
  )
}
