import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Calendar, Home, Phone, Mail, Clock,
  CheckCircle2, XCircle, AlertCircle, Building2, MessageSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { Badge } from '@/components/ui/Badge'
import { ResidentStatusBadge, LegalStatusBadge } from '@/components/residents/ResidentStatusBadge'
import { LeaveNoteModal } from '@/components/external/LeaveNoteModal'
import { MeetingRequestModal } from '@/components/external/MeetingRequestModal'
import { INTERACTION_CONFIG } from '@/lib/constants/timeline'
import { calculateAge, formatDate, formatDateTime, formatTimeAgo } from '@/lib/utils/dates'
import type { InteractionType } from '@/types'

interface Props { params: { id: string } }

export default async function ExternalResidentPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: resident },
    { data: rawTimeline },
    { data: documents },
    { data: meetings },
    { data: myNotes },
    { data: myRequests },
  ] = await Promise.all([
    supabase
      .from('service_users')
      .select(`
        id, first_name, last_name, preferred_name, date_of_birth,
        photo_url, status, legal_status, is_asylum_seeker,
        placement_start_date, placement_type, room_number,
        local_authority, has_mental_capacity,
        gp_name, gp_practice, gp_phone,
        nok_name, nok_relationship, nok_phone,
        home:homes!home_id(id, name, address, city, postcode, phone),
        key_worker:profiles!key_worker_id(full_name, job_title, phone, email, photo_url)
      `)
      .eq('id', params.id)
      .single(),

    // Timeline — last 30 days only, no confidential entries (RLS handles this)
    supabase
      .from('interaction_timeline')
      .select(`
        id, interaction_type, occurred_at, notes, is_flagged,
        staff:profiles!staff_id(full_name, preferred_name, photo_url)
      `)
      .eq('service_user_id', params.id)
      .gte('occurred_at', thirtyDaysAgo)
      .order('occurred_at', { ascending: false })
      .limit(50),

    // Documents — non-confidential only (RLS enforces)
    supabase
      .from('documents')
      .select('id, title, document_type, document_date, created_at, created_by')
      .eq('service_user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // Upcoming meetings
    supabase
      .from('meetings')
      .select('id, title, meeting_type, scheduled_at, location')
      .eq('service_user_id', params.id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(10),

    // My previous notes on this resident
    supabase
      .from('professional_notes')
      .select('id, body, created_at, is_read, read_at')
      .eq('service_user_id', params.id)
      .eq('authored_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20),

    // My meeting requests for this resident
    supabase
      .from('meeting_requests')
      .select('id, proposed_date, proposed_time, meeting_type, purpose, status, response_note, responded_at')
      .eq('service_user_id', params.id)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!resident) notFound()

  const home      = resident.home as unknown as { id: string; name: string; address: string; city: string; postcode: string; phone: string | null } | null
  const keyWorker = resident.key_worker as unknown as { full_name: string; job_title: string | null; phone: string | null; email: string | null; photo_url: string | null } | null
  const name      = resident.preferred_name ?? resident.first_name
  const fullName  = `${name} ${resident.last_name}`

  const MEETING_TYPE_LABELS: Record<string, string> = {
    looked_after_child_review: 'LAC Review',
    pathway_planning: 'Pathway Planning',
    key_work_session: 'Key Work Session',
    professionals_meeting: 'Professionals Meeting',
    supervision: 'Supervision',
    team_meeting: 'Team Meeting',
    risk_assessment_review: 'Risk Assessment Review',
    mental_health_review: 'Mental Health Review',
    other: 'Meeting',
  }

  const REQUEST_STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'default' | 'danger'; icon: React.ReactNode }> = {
    pending:   { label: 'Awaiting response', variant: 'warning', icon: <AlertCircle className="h-3.5 w-3.5" /> },
    accepted:  { label: 'Confirmed',         variant: 'success', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    declined:  { label: 'Declined',          variant: 'danger',  icon: <XCircle className="h-3.5 w-3.5" /> },
    cancelled: { label: 'Cancelled',         variant: 'default', icon: <XCircle className="h-3.5 w-3.5" /> },
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/portal" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back to my caseload
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="h-20 bg-gradient-to-r from-purple-900 to-indigo-800" />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-10 mb-4">
            {resident.photo_url ? (
              <img
                src={resident.photo_url}
                alt=""
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-purple-700 border-4 border-white shadow-md flex items-center justify-center text-white text-2xl font-bold">
                {resident.first_name[0]}{resident.last_name[0]}
              </div>
            )}
          </div>

          <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1.5 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              Age {calculateAge(resident.date_of_birth)} &middot; DOB {formatDate(resident.date_of_birth)}
            </span>
            {home && (
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <Home className="h-4 w-4 text-slate-400" />
                {home.name}
                {resident.room_number && ` · Room ${resident.room_number}`}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <ResidentStatusBadge status={resident.status as never} />
            <LegalStatusBadge legalStatus={resident.legal_status} isAsylumSeeker={resident.is_asylum_seeker} />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <LeaveNoteModal serviceUserId={params.id} residentName={fullName} />
        <MeetingRequestModal serviceUserId={params.id} residentName={fullName} />
      </div>

      {/* Tabs */}
      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="timeline">Recent activity</Tab>
          <Tab id="documents">Documents</Tab>
          <Tab id="meetings">Meetings</Tab>
          <Tab id="my-messages">My messages</Tab>
        </TabList>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        <TabPanel id="overview">
          <div className="space-y-4">
            {/* Key worker */}
            {keyWorker && (
              <InfoCard title="Key Worker" icon={<Building2 className="h-4 w-4" />}>
                <div className="flex items-center gap-3">
                  {keyWorker.photo_url ? (
                    <img src={keyWorker.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm">
                      {keyWorker.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-900">{keyWorker.full_name}</p>
                    {keyWorker.job_title && <p className="text-sm text-slate-500">{keyWorker.job_title}</p>}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {keyWorker.phone && (
                    <a href={`tel:${keyWorker.phone}`} className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 font-medium">
                      <Phone className="h-4 w-4" />{keyWorker.phone}
                    </a>
                  )}
                  {keyWorker.email && (
                    <a href={`mailto:${keyWorker.email}`} className="flex items-center gap-2 text-sm text-purple-700 hover:text-purple-900 font-medium">
                      <Mail className="h-4 w-4" />{keyWorker.email}
                    </a>
                  )}
                </div>
              </InfoCard>
            )}

            {/* Home details */}
            {home && (
              <InfoCard title="Home" icon={<Home className="h-4 w-4" />}>
                <Row label="Property" value={home.name} />
                <Row label="Address" value={`${home.address}, ${home.city}, ${home.postcode}`} />
                {home.phone && (
                  <div className="flex gap-3 py-2 text-sm border-b border-slate-100 last:border-0">
                    <span className="text-slate-500 w-24 shrink-0">Phone</span>
                    <a href={`tel:${home.phone}`} className="text-purple-700 hover:text-purple-900 font-medium">
                      {home.phone}
                    </a>
                  </div>
                )}
                <Row label="Placement" value={resident.placement_type.replace(/_/g, ' ')} />
                <Row label="Since" value={formatDate(resident.placement_start_date)} />
                <Row label="Local authority" value={resident.local_authority} />
              </InfoCard>
            )}

            {/* Medical / health */}
            {(resident.gp_name || resident.gp_practice) && (
              <InfoCard title="GP details" icon={<Phone className="h-4 w-4" />}>
                <Row label="GP" value={resident.gp_name} />
                <Row label="Practice" value={resident.gp_practice} />
                {resident.gp_phone && (
                  <div className="flex gap-3 py-2 text-sm">
                    <span className="text-slate-500 w-24 shrink-0">Phone</span>
                    <a href={`tel:${resident.gp_phone}`} className="text-purple-700 font-medium">{resident.gp_phone}</a>
                  </div>
                )}
              </InfoCard>
            )}
          </div>
        </TabPanel>

        {/* ── TIMELINE (last 30 days) ───────────────────── */}
        <TabPanel id="timeline">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5">
            <Clock className="h-4 w-4 text-slate-400 shrink-0" />
            Showing interactions logged in the last 30 days.
            Confidential entries are not shown.
          </div>

          {rawTimeline && rawTimeline.length > 0 ? (
            <div className="space-y-3">
              {rawTimeline.map(entry => {
                const cfg    = INTERACTION_CONFIG[entry.interaction_type as InteractionType] ?? INTERACTION_CONFIG.other
                const staff  = entry.staff as unknown as { full_name: string; preferred_name: string | null; photo_url: string | null } | null
                const sName  = staff?.preferred_name ?? staff?.full_name ?? 'Staff member'
                const initials = (staff?.full_name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                return (
                  <div
                    key={entry.id}
                    className={`bg-white rounded-xl border p-4 ${entry.is_flagged ? 'border-red-200' : 'border-slate-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      {staff?.photo_url ? (
                        <img src={staff.photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold shrink-0 mt-0.5">
                          {initials}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm font-medium text-slate-900">{sName}</span>
                          <span className="text-xs text-slate-400 ml-auto">{formatTimeAgo(entry.occurred_at)}</span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-slate-700 leading-relaxed">{entry.notes}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-1">{formatDateTime(entry.occurred_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-10">
              No interactions logged in the last 30 days.
            </p>
          )}
        </TabPanel>

        {/* ── DOCUMENTS ────────────────────────────────── */}
        <TabPanel id="documents">
          <div className="mb-4 text-sm text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5">
            Only non-confidential documents are visible here.
          </div>
          {documents && documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-xs font-bold">
                      {doc.document_type.slice(0, 3).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{doc.title}</p>
                    <p className="text-xs text-slate-400">
                      {doc.document_type.replace(/_/g, ' ')} &middot;{' '}
                      {doc.document_date ? formatDate(doc.document_date) : formatDate(doc.created_at)}
                    </p>
                  </div>
                  <Badge variant="default">{doc.document_type.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic text-center py-10">No documents available.</p>
          )}
        </TabPanel>

        {/* ── MEETINGS ─────────────────────────────────── */}
        <TabPanel id="meetings">
          {meetings && meetings.length > 0 ? (
            <div className="space-y-3">
              {meetings.map(m => (
                <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{m.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {MEETING_TYPE_LABELS[m.meeting_type] ?? m.meeting_type} &middot;{' '}
                        {formatDateTime(m.scheduled_at)}
                      </p>
                      {m.location && (
                        <p className="text-xs text-slate-400 mt-0.5">{m.location}</p>
                      )}
                    </div>
                    <Badge variant="primary">Upcoming</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400 italic mb-4">No upcoming meetings scheduled.</p>
              <MeetingRequestModal serviceUserId={params.id} residentName={fullName} />
            </div>
          )}
        </TabPanel>

        {/* ── MY MESSAGES ──────────────────────────────── */}
        <TabPanel id="my-messages">
          <div className="space-y-6">
            {/* Previous notes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Messages I have sent</h3>
              {myNotes && myNotes.length > 0 ? (
                <div className="space-y-3">
                  {myNotes.map(note => (
                    <div key={note.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-sm text-slate-800 leading-relaxed">{note.body}</p>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-xs text-slate-400">{formatDateTime(note.created_at)}</span>
                        {note.is_read ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Read by team {note.read_at ? formatTimeAgo(note.read_at) : ''}
                          </span>
                        ) : (
                          <Badge variant="warning">Unread</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">You have not sent any messages yet.</p>
              )}
            </div>

            {/* Meeting requests */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">My meeting requests</h3>
              {myRequests && myRequests.length > 0 ? (
                <div className="space-y-3">
                  {myRequests.map(req => {
                    const statusConfig = REQUEST_STATUS[req.status] ?? REQUEST_STATUS.pending
                    return (
                      <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {MEETING_TYPE_LABELS[req.meeting_type] ?? req.meeting_type}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Proposed: {formatDate(req.proposed_date)}
                              {req.proposed_time && ` at ${req.proposed_time}`}
                            </p>
                            <p className="text-sm text-slate-700 mt-1">{req.purpose}</p>
                          </div>
                          <Badge variant={statusConfig.variant}>
                            <span className="flex items-center gap-1">
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </Badge>
                        </div>
                        {req.response_note && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
                            <span className="text-xs font-semibold text-slate-500 block mb-1">Response from the home:</span>
                            {req.response_note}
                            {req.responded_at && (
                              <span className="text-xs text-slate-400 block mt-1">{formatTimeAgo(req.responded_at)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No meeting requests yet.</p>
              )}
            </div>

            {/* Send new */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-200">
              <LeaveNoteModal serviceUserId={params.id} residentName={fullName} />
              <MeetingRequestModal serviceUserId={params.id} residentName={fullName} />
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  )
}

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-5 py-2">{children}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 text-sm border-b border-slate-100 last:border-0">
      <span className="text-slate-500 w-24 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  )
}
