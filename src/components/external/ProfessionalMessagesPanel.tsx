'use client'

import { useState } from 'react'
import { MessageSquare, CalendarCheck, CheckCircle2, XCircle, AlertCircle, CheckCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatDateTime, formatTimeAgo, formatDate } from '@/lib/utils/dates'

export interface ProfessionalNote {
  id: string
  body: string
  created_at: string
  is_read: boolean
  read_at: string | null
  author: { full_name: string; job_title: string | null; photo_url: string | null } | null
}

export interface MeetingRequest {
  id: string
  proposed_date: string
  proposed_time: string | null
  meeting_type: string
  purpose: string
  status: string
  response_note: string | null
  responded_at: string | null
  requester: { full_name: string; job_title: string | null } | null
}

interface Props {
  notes: ProfessionalNote[]
  requests: MeetingRequest[]
  serviceUserId: string
}

const MEETING_TYPE_LABELS: Record<string, string> = {
  looked_after_child_review: 'LAC Review',
  pathway_planning: 'Pathway Planning',
  professionals_meeting: 'Professionals Meeting',
  risk_assessment_review: 'Risk Assessment Review',
  mental_health_review: 'Mental Health Review',
  key_work_session: 'Key Work Session',
  other: 'Meeting',
}

const REQUEST_STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  pending:   { label: 'Pending',   variant: 'warning' },
  accepted:  { label: 'Confirmed', variant: 'success' },
  declined:  { label: 'Declined',  variant: 'danger'  },
  cancelled: { label: 'Cancelled', variant: 'default' },
}

export function ProfessionalMessagesPanel({ notes, requests, serviceUserId }: Props) {
  const [markingId, setMarkingId]     = useState<string | null>(null)
  const [noteList, setNoteList]       = useState<ProfessionalNote[]>(notes)
  const [requestList, setRequests]    = useState<MeetingRequest[]>(requests)
  const [respondingId, setResponding] = useState<string | null>(null)
  const [responseText, setResponse]   = useState('')
  const [responseAction, setAction]   = useState<'accepted' | 'declined'>('accepted')

  const unreadNotes    = noteList.filter(n => !n.is_read)
  const pendingReqs    = requestList.filter(r => r.status === 'pending')

  async function markAsRead(noteId: string) {
    setMarkingId(noteId)
    const res = await fetch('/api/professional-notes/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noteId }),
    })
    if (res.ok) {
      setNoteList(prev => prev.map(n =>
        n.id === noteId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      ))
    }
    setMarkingId(null)
  }

  async function respondToRequest(requestId: string) {
    const res = await fetch('/api/meeting-requests/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status: responseAction, response_note: responseText }),
    })
    if (res.ok) {
      setRequests(prev => prev.map(r =>
        r.id === requestId
          ? { ...r, status: responseAction, response_note: responseText, responded_at: new Date().toISOString() }
          : r
      ))
      setResponding(null)
      setResponse('')
    }
  }

  return (
    <div className="space-y-6">
      {/* Messages from professionals */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Messages from professionals</h3>
          {unreadNotes.length > 0 && <Badge variant="warning">{unreadNotes.length} unread</Badge>}
        </div>

        {noteList.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No messages from external professionals yet.</p>
        ) : (
          <div className="space-y-3">
            {noteList.map(note => {
              const authorName = note.author?.full_name ?? 'External professional'
              const initials   = authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

              return (
                <div
                  key={note.id}
                  className={`bg-white rounded-xl border p-4 ${!note.is_read ? 'border-purple-200 bg-purple-50/30' : 'border-slate-200'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                        {note.author?.job_title && (
                          <p className="text-xs text-slate-500">{note.author.job_title}</p>
                        )}
                        {!note.is_read && <Badge variant="warning">Unread</Badge>}
                        <span className="text-xs text-slate-400 ml-auto">{formatTimeAgo(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed">{note.body}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400">{formatDateTime(note.created_at)}</span>
                        {note.is_read ? (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Read {note.read_at ? formatTimeAgo(note.read_at) : ''}
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={markingId === note.id}
                            onClick={() => void markAsRead(note.id)}
                            className="text-xs"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Meeting requests */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarCheck className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Meeting requests</h3>
          {pendingReqs.length > 0 && <Badge variant="warning">{pendingReqs.length} pending</Badge>}
        </div>

        {requestList.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No meeting requests.</p>
        ) : (
          <div className="space-y-3">
            {requestList.map(req => {
              const cfg         = REQUEST_STATUS_CONFIG[req.status] ?? REQUEST_STATUS_CONFIG.pending
              const requesterName = req.requester?.full_name ?? 'External professional'

              return (
                <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {MEETING_TYPE_LABELS[req.meeting_type] ?? req.meeting_type}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Requested by {requesterName}
                        {req.requester?.job_title ? ` (${req.requester.job_title})` : ''}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Proposed: <span className="font-medium">{formatDate(req.proposed_date)}</span>
                        {req.proposed_time && ` at ${req.proposed_time}`}
                      </p>
                      <p className="text-sm text-slate-700 mt-2">{req.purpose}</p>
                    </div>
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                  </div>

                  {req.response_note && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 border border-slate-100">
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Your response:</span>
                      {req.response_note}
                    </div>
                  )}

                  {req.status === 'pending' && (
                    <>
                      {respondingId === req.id ? (
                        <div className="mt-3 space-y-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setAction('accepted')}
                              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${responseAction === 'accepted' ? 'bg-green-50 border-green-400 text-green-700' : 'border-slate-200 text-slate-600'}`}
                            >
                              <CheckCircle2 className="inline h-4 w-4 mr-1" />Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setAction('declined')}
                              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${responseAction === 'declined' ? 'bg-red-50 border-red-400 text-red-700' : 'border-slate-200 text-slate-600'}`}
                            >
                              <XCircle className="inline h-4 w-4 mr-1" />Decline
                            </button>
                          </div>
                          <textarea
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm resize-none"
                            rows={2}
                            placeholder={responseAction === 'accepted'
                              ? 'Confirm details or add any notes…'
                              : 'Reason for declining (e.g. suggest an alternative date)…'
                            }
                            value={responseText}
                            onChange={e => setResponse(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => setResponding(null)}>Cancel</Button>
                            <Button
                              size="sm"
                              className={responseAction === 'accepted'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-red-600 hover:bg-red-700'
                              }
                              onClick={() => void respondToRequest(req.id)}
                            >
                              Send response
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          <span className="text-xs text-amber-700 font-medium">Response needed</span>
                          <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setResponding(req.id)}>
                            Respond
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
