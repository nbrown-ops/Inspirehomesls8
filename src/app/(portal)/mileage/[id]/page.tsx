import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Car, MapPin, Calendar, User, Clock, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatDateTime } from '@/lib/utils/dates'
import { ReviewPanel } from '@/components/mileage/ReviewPanel'
import { WithdrawButton } from '@/components/mileage/WithdrawButton'

const STATUS_CONFIG = {
  pending:  { label: 'Pending review', variant: 'warning' as const, icon: Clock        },
  approved: { label: 'Approved',       variant: 'success' as const, icon: CheckCircle  },
  rejected: { label: 'Rejected',       variant: 'danger'  as const, icon: XCircle      },
}

interface Props { params: { id: string } }

export default async function MileageClaimDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!myProfile) redirect('/login')
  const isManager = ['super_admin', 'manager'].includes(myProfile.role as string)

  const { data: claim } = await supabase
    .from('mileage_claims')
    .select(`
      id, claim_date, miles, purpose, status, rate_per_mile,
      from_location, to_location, staff_notes, reviewer_notes,
      reviewed_at, created_at,
      staff:profiles!staff_id(id, full_name, job_title),
      service_user:service_users!service_user_id(id, first_name, last_name),
      reviewer:profiles!reviewer_id(full_name)
    `)
    .eq('id', params.id)
    .single()

  if (!claim) notFound()

  // Non-managers can only see their own claims
  const staff = claim.staff as { id: string; full_name: string; job_title: string | null } | null
  if (!isManager && staff?.id !== user.id) notFound()

  const cfg         = STATUS_CONFIG[claim.status as keyof typeof STATUS_CONFIG]
  const StatusIcon  = cfg.icon
  const su          = claim.service_user as { id: string; first_name: string; last_name: string } | null
  const reviewer    = claim.reviewer as { full_name: string } | null
  const total       = (claim.miles * claim.rate_per_mile).toFixed(2)
  const isOwnClaim  = staff?.id === user.id

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <div>
        <Link href="/mileage" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Mileage claims
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{claim.purpose}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{formatDate(claim.claim_date)}</p>
          </div>
          <Badge variant={cfg.variant}>
            <StatusIcon className="h-3.5 w-3.5 mr-1" />
            {cfg.label}
          </Badge>
        </div>
      </div>

      {/* Claim summary card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Amount banner */}
        <div className="bg-purple-950 px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-purple-300 text-sm">Reimbursement amount</p>
            <p className="text-4xl font-bold text-white mt-0.5">£{total}</p>
            <p className="text-purple-400 text-xs mt-1">
              {claim.miles} miles × £{claim.rate_per_mile.toFixed(2)}/mile
            </p>
          </div>
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <Car className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Details */}
        <div className="divide-y divide-slate-100">
          {/* Claimant */}
          <DetailRow icon={User} label="Staff member">
            <span className="font-medium">{staff?.full_name ?? '—'}</span>
            {staff?.job_title && <span className="text-slate-500"> · {staff.job_title}</span>}
          </DetailRow>

          {/* Date */}
          <DetailRow icon={Calendar} label="Journey date">
            {formatDate(claim.claim_date)}
          </DetailRow>

          {/* Route */}
          {(claim.from_location || claim.to_location) && (
            <DetailRow icon={MapPin} label="Route">
              {claim.from_location && claim.to_location
                ? `${claim.from_location} → ${claim.to_location}`
                : claim.from_location || claim.to_location}
            </DetailRow>
          )}

          {/* Service user */}
          {su && (
            <DetailRow icon={User} label="Service user">
              <Link href={`/residents/${su.id}`} className="text-purple-700 hover:underline font-medium">
                {su.first_name} {su.last_name}
              </Link>
            </DetailRow>
          )}

          {/* Staff notes */}
          {claim.staff_notes && (
            <DetailRow icon={Clock} label="Notes from staff">
              {claim.staff_notes}
            </DetailRow>
          )}

          {/* Submitted */}
          <DetailRow icon={Clock} label="Submitted">
            {formatDateTime(claim.created_at)}
          </DetailRow>
        </div>
      </div>

      {/* Reviewer decision (if resolved) */}
      {claim.status !== 'pending' && (
        <div className={`rounded-xl border p-5 ${
          claim.status === 'approved'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {claim.status === 'approved'
              ? <CheckCircle className="h-4 w-4 text-green-600" />
              : <XCircle    className="h-4 w-4 text-red-600"   />
            }
            <p className={`text-sm font-semibold ${
              claim.status === 'approved' ? 'text-green-800' : 'text-red-800'
            }`}>
              {claim.status === 'approved' ? 'Claim approved' : 'Claim rejected'}
              {reviewer && ` by ${reviewer.full_name}`}
            </p>
            {claim.reviewed_at && (
              <span className="text-xs text-slate-400 ml-auto">{formatDateTime(claim.reviewed_at)}</span>
            )}
          </div>
          {claim.reviewer_notes && (
            <p className={`text-sm ${claim.status === 'approved' ? 'text-green-700' : 'text-red-700'}`}>
              {claim.reviewer_notes}
            </p>
          )}
        </div>
      )}

      {/* Manager: review panel */}
      {isManager && claim.status === 'pending' && (
        <ReviewPanel claimId={claim.id} />
      )}

      {/* Staff: delete pending claim */}
      {isOwnClaim && claim.status === 'pending' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-600 mb-3">
            This claim is still pending. You can withdraw it if you submitted it in error.
          </p>
          <WithdrawButton claimId={claim.id} />
        </div>
      )}
    </div>
  )
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-4 px-6 py-4">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <div className="text-sm text-slate-900">{children}</div>
      </div>
    </div>
  )
}
