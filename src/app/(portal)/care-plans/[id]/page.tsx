import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Clock, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime, formatTimeAgo } from '@/lib/utils/dates'

const STATUS_STYLES: Record<string, string> = {
  draft:        'bg-slate-100 text-slate-600',
  active:       'bg-green-100 text-green-700',
  under_review: 'bg-amber-100 text-amber-700',
  archived:     'bg-slate-100 text-slate-400',
}

export default async function CarePlanDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const canEdit = profile && ['super_admin', 'manager', 'staff'].includes(profile.role)

  const { data: plan } = await supabase
    .from('care_plans')
    .select(`
      id, title, status, review_date, created_at, updated_at,
      goals, strengths, risks, support_needs, long_term_objectives,
      service_users!service_user_id(id, first_name, last_name, date_of_birth),
      author:profiles!created_by(full_name, job_title),
      reviewer:profiles!reviewed_by(full_name),
      home:homes!home_id(name)
    `)
    .eq('id', params.id)
    .single()

  if (!plan) notFound()

  const su       = plan.service_users as unknown as { id: string; first_name: string; last_name: string } | null
  const author   = plan.author as unknown as { full_name: string; job_title?: string } | null
  const reviewer = plan.reviewer as unknown as { full_name: string } | null
  const home     = plan.home as unknown as { name: string } | null
  const isOverdue = plan.review_date && new Date(plan.review_date) < new Date()

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/care-plans" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to care plans
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[plan.status] ?? ''}`}>
                {plan.status.replace(/_/g, ' ')}
              </span>
              {isOverdue && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">Review overdue</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{plan.title}</h1>
            {su && (
              <Link href={`/residents/${su.id}`} className="text-sm text-purple-700 hover:underline mt-1 block">
                {su.first_name} {su.last_name}
              </Link>
            )}
          </div>
          {canEdit && (
            <Link
              href={`/care-plans/${plan.id}/edit`}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-purple-700 border border-slate-200 hover:border-purple-300 px-3 py-1.5 rounded-lg transition-colors shrink-0 h-fit"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
          {plan.review_date && (
            <div className="flex items-center gap-2 text-slate-500">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Review: {formatDate(plan.review_date)}</span>
            </div>
          )}
          {author && (
            <div className="flex items-center gap-2 text-slate-500">
              <User className="h-4 w-4 shrink-0" />
              <span>{author.full_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Updated {formatTimeAgo(plan.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {plan.strengths && (
        <Section title="Strengths & Abilities" content={plan.strengths} color="green" />
      )}

      {/* Support needs */}
      {plan.support_needs && (
        <Section title="Support Needs" content={plan.support_needs} />
      )}

      {/* Goals */}
      {plan.goals && (
        <Section title="Goals" content={plan.goals} />
      )}

      {/* Long-term objectives */}
      {plan.long_term_objectives && (
        <Section title="Long-Term Objectives" content={plan.long_term_objectives} />
      )}

      {/* Risks */}
      {plan.risks && (
        <Section title="Identified Risks" content={plan.risks} color="red" />
      )}

      {/* Meta */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Record Details</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Author</p>
            <p className="text-slate-900">{author?.full_name ?? '—'}{author?.job_title ? ` · ${author.job_title}` : ''}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Created</p>
            <p className="text-slate-900">{formatDateTime(plan.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Last updated</p>
            <p className="text-slate-900">{formatDateTime(plan.updated_at)}</p>
          </div>
          {reviewer && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Reviewed by</p>
              <p className="text-slate-900">{reviewer.full_name}</p>
            </div>
          )}
          {home && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Property</p>
              <p className="text-slate-900">{home.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, content, color }: { title: string; content: string; color?: 'green' | 'red' }) {
  const bg = color === 'green' ? 'bg-green-50 border-green-200' : color === 'red' ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
  return (
    <div className={`rounded-xl border p-6 ${bg}`}>
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">{title}</h2>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{content}</p>
    </div>
  )
}
