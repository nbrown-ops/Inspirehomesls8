'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { acknowledgeHandoverAction } from '@/app/(portal)/shifts/actions'

export function HandoverAcknowledgeButton({ handoverId }: { handoverId: string }) {
  const [done, setDone]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const [err, setErr]     = useState<string | null>(null)

  async function handleAck() {
    setBusy(true)
    setErr(null)
    const result = await acknowledgeHandoverAction(handoverId)
    setBusy(false)
    if (result?.error) {
      setErr(result.error)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
        <CheckCircle className="h-4 w-4" />
        Acknowledged
      </span>
    )
  }

  return (
    <div>
      {err && <p className="text-xs text-red-600 mb-1">{err}</p>}
      <Button
        loading={busy}
        className="bg-purple-700 hover:bg-purple-800 shrink-0"
        onClick={() => void handleAck()}
      >
        <CheckCircle className="h-4 w-4" />
        Acknowledge handover
      </Button>
    </div>
  )
}
