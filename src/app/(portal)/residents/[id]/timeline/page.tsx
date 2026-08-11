import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TimelineFeed } from '@/components/timeline/TimelineFeed'
import { ExportModal } from '@/components/timeline/ExportModal'
import type { TimelineEntryData } from '@/components/timeline/TimelineEntry'

interface Props { params: { id: string } }

export default async function ResidentTimelinePage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: resident }, { data: profileData }, { data: rawEntries }] = await Promise.all([
    supabase
      .from('service_users')
      .select('id, first_name, last_name, preferred_name')
      .eq('id', params.id)
      .single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase
      .from('interaction_timeline')
      .select(`
        id, interaction_type, occurred_at, notes, outcome,
        is_flagged, flagged_reason, duration_minutes,
        staff:profiles!staff_id(id, full_name, preferred_name, photo_url)
      `)
      .eq('service_user_id', params.id)
      .order('occurred_at', { ascending: false })
      .limit(50),
  ])

  if (!resident) notFound()

  const isManager = profileData?.role === 'super_admin' || profileData?.role === 'manager'
  const entries   = (rawEntries ?? []) as unknown as TimelineEntryData[]
  const name      = resident.preferred_name ?? resident.first_name

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back */}
      <Link
        href={`/residents/${params.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {name} {resident.last_name} — Timeline
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live interaction feed · Updates in real-time
          </p>
        </div>
        {isManager && (
          <ExportModal residentId={params.id} residentName={`${name} ${resident.last_name}`} />
        )}
      </div>

      {/* Live feed */}
      <TimelineFeed
        serviceUserId={params.id}
        initialEntries={entries}
      />
    </div>
  )
}
