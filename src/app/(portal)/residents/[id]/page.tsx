import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Pencil, ArrowLeft, Calendar, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { ResidentStatusBadge, LegalStatusBadge } from '@/components/residents/ResidentStatusBadge'
import { ProfileTabs } from '@/components/residents/ProfileTabs'
import { calculateAge, formatDate } from '@/lib/utils/dates'
import { canWrite } from '@/lib/constants/roles'

interface Props {
  params: { id: string }
}

export default async function ResidentProfilePage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profileData }, { data: resident }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('service_users')
      .select(`
        *,
        key_worker:profiles!key_worker_id(
          id, full_name, preferred_name, phone, email, photo_url, job_title
        ),
        home:homes!home_id(id, name, address, city, postcode, phone),
        service_user_professionals(
          id, role, is_primary,
          external_name, external_email, external_phone, external_org,
          profile:profiles!professional_id(id, full_name, preferred_name, phone, email, photo_url)
        )
      `)
      .eq('id', params.id)
      .single(),
  ])

  // Professional notes and meeting requests from external portal
  const [{ data: rawProfNotes }, { data: rawMeetingReqs }] = await Promise.all([
    supabase
      .from('professional_notes')
      .select('id, body, created_at, is_read, read_at, author:profiles!authored_by(full_name, job_title, photo_url)')
      .eq('service_user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('meeting_requests')
      .select('id, proposed_date, proposed_time, meeting_type, purpose, status, response_note, responded_at, requester:profiles!requested_by(full_name, job_title)')
      .eq('service_user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (!resident) notFound()

  // Recent timeline entries
  const { data: timeline } = await supabase
    .from('interaction_timeline')
    .select(`
      id, interaction_type, occurred_at, notes, outcome, is_flagged,
      staff:profiles!staff_id(full_name)
    `)
    .eq('service_user_id', params.id)
    .order('occurred_at', { ascending: false })
    .limit(30)

  const role    = profileData?.role
  const canEdit = !!(role && canWrite(role) && role !== 'social_worker')

  const keyWorker        = resident.key_worker as never
  const home             = resident.home as never
  const professionals    = (resident.service_user_professionals as never[]) ?? []
  const professionalNotes = (rawProfNotes ?? []) as never[]
  const meetingRequests   = (rawMeetingReqs ?? []) as never[]
  const unreadNotesCount  = professionalNotes.filter((n: { is_read: boolean }) => !n.is_read).length

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back link */}
      <Link
        href="/residents"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All residents
      </Link>

      {/* Profile header card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Purple banner */}
        <div className="h-24 bg-gradient-to-r from-purple-900 to-indigo-800" />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-12 mb-4">
            {/* Avatar */}
            {resident.photo_url ? (
              <img
                src={resident.photo_url}
                alt={resident.full_name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-purple-700 border-4 border-white shadow-md flex items-center justify-center text-white text-3xl font-bold">
                {resident.first_name[0]}{resident.last_name[0]}
              </div>
            )}

            {/* Edit button */}
            {canEdit && (
              <Button asChild variant="secondary" size="sm">
                <Link href={`/residents/${resident.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit profile
                </Link>
              </Button>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-2">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {resident.first_name} {resident.last_name}
                {resident.preferred_name && resident.preferred_name !== resident.first_name && (
                  <span className="ml-2 text-base font-normal text-slate-500">
                    ({resident.preferred_name})
                  </span>
                )}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDate(resident.date_of_birth)} &middot; Age {calculateAge(resident.date_of_birth)}
                </span>
                {resident.gender && (
                  <span className="text-sm text-slate-500">{resident.gender}</span>
                )}
                {resident.pronouns && (
                  <span className="text-sm text-slate-400">({resident.pronouns})</span>
                )}
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Home className="h-4 w-4 text-slate-400" />
                  {(resident.home as unknown as { name: string } | null)?.name ?? '—'}
                  {resident.room_number && ` · Room ${resident.room_number}`}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-0.5">
              <ResidentStatusBadge status={resident.status} />
              <LegalStatusBadge
                legalStatus={resident.legal_status}
                isAsylumSeeker={resident.is_asylum_seeker}
              />
            </div>
          </div>

          {/* Key worker pill */}
          {keyWorker && (
            <div className="mt-4 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
              {(keyWorker as unknown as { photo_url?: string | null }).photo_url ? (
                <img
                  src={(keyWorker as unknown as { photo_url: string }).photo_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {(keyWorker as unknown as { full_name: string }).full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <span className="text-xs text-slate-600">
                Key worker: <span className="font-medium">{(keyWorker as unknown as { full_name: string }).full_name}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ProfileTabs
        resident={resident}
        keyWorker={keyWorker}
        home={home}
        professionals={professionals}
        timeline={(timeline ?? []) as any}
        professionalNotes={professionalNotes}
        meetingRequests={meetingRequests}
        canEdit={canEdit}
        unreadNotesCount={unreadNotesCount}
      />
    </div>
  )
}
