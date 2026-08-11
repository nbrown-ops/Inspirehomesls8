import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { formatDate, formatTimeAgo } from '@/lib/utils/dates'
import { canWrite } from '@/lib/constants/roles'

const STATUS_STYLES: Record<string, string> = {
  draft:        'bg-slate-100 text-slate-600',
  active:       'bg-green-100 text-green-700',
  under_review: 'bg-amber-100 text-amber-700',
  archived:     'bg-slate-100 text-slate-400',
}

export default async function CarePlansPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: plans } = await supabase
    .from('care_plans')
    .select(`
      id, title, status, review_date, created_at, updated_at,
      service_users!service_user_id(id, first_name, last_name),
      author:profiles!created_by(full_name),
      home:homes!home_id(name)
    `)
    .order('updated_at', { ascending: false })
    .limit(100)

  const active   = plans?.filter(p => p.status === 'active') ?? []
  const drafts   = plans?.filter(p => p.status === 'draft') ?? []
  const review   = plans?.filter(p => p.status === 'under_review') ?? []
  const archived = plans?.filter(p => p.status === 'archived') ?? []
  const canAdd   = canWrite(profile.role) && profile.role !== 'social_worker'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Care Plans</h1>
          <p className="mt-1 text-sm text-slate-500">
            {plans?.length ?? 0} total &middot; {active.length} active &middot; {review.length} under review
          </p>
        </div>
        {canAdd && (
          <Button asChild className="bg-purple-700 hover:bg-purple-800">
            <Link href="/care-plans/new"><Plus className="h-4 w-4" />New care plan</Link>
          </Button>
        )}
      </div>

      {review.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 font-medium">
          {review.length} care plan{review.length > 1 ? 's' : ''} currently under review.
        </div>
      )}

      {active.length > 0 && (
        <CarePlanSection title="Active" plans={active as any} />
      )}
      {review.length > 0 && (
        <CarePlanSection title="Under Review" plans={review as any} />
      )}
      {drafts.length > 0 && (
        <CarePlanSection title="Drafts" plans={drafts as any} />
      )}
      {archived.length > 0 && (
        <CarePlanSection title="Archived" plans={archived as any} muted />
      )}

      {!plans?.length && (
        <div className="text-center py-20 text-slate-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No care plans yet</p>
          {canAdd && <p className="text-sm mt-1">Create the first care plan above.</p>}
        </div>
      )}
    </div>
  )
}

type PlanRow = {
  id: string
  title: string
  status: string
  review_date: string | null
  updated_at: string
  service_users: { id: string; first_name: string; last_name: string } | null
  author: { full_name: string } | null
  home: { name: string } | null
}

function CarePlanSection({ title, plans, muted = false }: { title: string; plans: PlanRow[]; muted?: boolean }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">{title} ({plans.length})</h2>
      <div className={`space-y-2 ${muted ? 'opacity-60' : ''}`}>
        {plans.map(plan => {
          const su = plan.service_users as { id: string; first_name: string; last_name: string } | null
          const isOverdue = plan.review_date && new Date(plan.review_date) < new Date()
          return (
            <Link
              key={plan.id}
              href={`/care-plans/${plan.id}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{plan.title}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[plan.status] ?? ''}`}>
                      {plan.status.replace(/_/g, ' ')}
                    </span>
                    {isOverdue && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Review overdue</span>
                    )}
                  </div>
                  {su && (
                    <p className="text-xs text-purple-700 font-medium mt-1">{su.first_name} {su.last_name}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(plan.home as { name: string } | null)?.name ?? ''}
                    {plan.author ? ` · ${(plan.author as { full_name: string }).full_name}` : ''}
                    {plan.review_date ? ` · Review due ${formatDate(plan.review_date)}` : ''}
                  </p>
                </div>
                <p className="text-xs text-slate-400 shrink-0">{formatTimeAgo(plan.updated_at)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
