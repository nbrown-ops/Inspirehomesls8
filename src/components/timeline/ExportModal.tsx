'use client'

import { useState } from 'react'
import { FileDown } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

interface ExportModalProps {
  residentId: string
  residentName: string
}

export function ExportModal({ residentId, residentName }: ExportModalProps) {
  const [open, setOpen] = useState(false)
  const today     = new Date().toISOString().split('T')[0]
  const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [startDate, setStart] = useState(threeMonthsAgo)
  const [endDate, setEnd]     = useState(today)

  function handleExport() {
    const params = new URLSearchParams({ resident_id: residentId, start: startDate, end: endDate })
    window.open(`/api/exports/timeline?${params}`, '_blank')
    setOpen(false)
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <FileDown className="h-4 w-4" />
        Export to PDF
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Export timeline"
        description={`Generate a PDF of ${residentName}'s interaction timeline for a selected date range.`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="export-start">From date</Label>
            <Input
              id="export-start"
              type="date"
              value={startDate}
              onChange={e => setStart(e.target.value)}
              max={endDate}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-end">To date</Label>
            <Input
              id="export-end"
              type="date"
              value={endDate}
              onChange={e => setEnd(e.target.value)}
              min={startDate}
              max={today}
            />
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
            <p className="font-medium mb-0.5">Suitable for:</p>
            <ul className="text-xs space-y-0.5 list-disc ml-4">
              <li>LAC reviews and statutory meetings</li>
              <li>Court submissions</li>
              <li>Local authority requests</li>
              <li>Ofsted / CQC inspections</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="flex-1 bg-purple-700 hover:bg-purple-800"
              onClick={handleExport}
              disabled={!startDate || !endDate}
            >
              <FileDown className="h-4 w-4" />
              Generate PDF
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
