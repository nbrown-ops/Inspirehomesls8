import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Car, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils/dates'

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  variant: 'warning' as const,  icon: Clock        },
  approved: { label: 'Approved', variant: 'success' as const,  icon: CheckCircle  },
  rejected: { label: 'Rejected', variant: 'danger'  as const,  icon: XCircle      },
}

function formatMiles(miles: number) {
  return `${miles % 1 === 0 ? miles.toFixed(0) : miles.toFixed(1)} miles`
}

function formatAmount(miles: number, rate: number) {
  return `£${(miles * rate).toFixed(2)}`
}

export default async function MileagePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const isManager = ['super_admin', 'manager'].includes(profile.role as string)

  // Staff: own claims. Manager: all claims.
  const claimsQuery = supabase
    .from('mileage_claims')
    .select(`
      id, claim_date, miles, purpose, status, rate_per_mile,
      from_location, to_location, created_at,
      staff:profiles!staff_id(full_name),
      service_user:service_users!service_user_id(first_name, last_name)
    `)
    .order('claim_date', { ascending: false })
    .limit(100)

  if (!isManager) claimsQuery.eq('staff_id', user.id)

  const { data: claims } = await claimsQuery

  const pending  = claims?.filter(c => c.status === 'pending')  ?? []
  const resolved = claims?.filter(c => c.status !== 'pending')  ?? []

  const totalApproved = claims
    ?.filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.miles * c.rate_per_mile, 0) ?? 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mileage Claims</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isManager
              ? 'Review and manage staff mileage reimbursement claims'
              : 'Submit and track your mileage reimbursement claims'}
          </p>
        </div>
        <Button asChild className="bg-purple-700 hover:bg-purple-800">
          <Link href="/mileage/new">
            <Plus className="h-4 w-4" />
            New claim
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Pending</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{pending.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">{isManager ? 'awaiting review' : 'awaiting approval'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Total approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">£{totalApproved.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-0.5">all time</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">Rate</p>
          <p className="text-3xl font-bold text-slate-700 mt-1">45p</p>
          <p className="text-xs text-slate-400 mt-0.5">per mile (HMRC rate)</p>
        </div>
      </div>

      {/* Pending claims */}
      {pending.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-700">
              {isManager ? 'Awaiting your review' : 'Pending approval'}
            </h2>
            <Badge variant="warning">{pending.length}</Badge>
          </div>
          <div className="space-y-2">
            {pending.map(claim => (
              <ClaimRow key={claim.id} claim={claim} isManager={isManager} />
            ))}
          </div>
        </section>
      )}

      {/* Resolved claims */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          {isManager ? 'All reviewed claims' : 'Claim history'}
        </h2>
        {resolved.length === 0 && pending.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <Car className="h-10 w-10 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No mileage claims yet</p>
            <p className="text-sm text-slate-400 mt-1">
              Submit a claim when you transport a service user for an activity.
            </p>
            <Button asChild className="mt-4 bg-purple-700 hover:bg-purple-800" size="sm">
              <Link href="/mileage/new">Submit first claim</Link>
            </Button>
          </div>
        ) : resolved.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No reviewed claims yet.</p>
        ) : (
          <div className="space-y-2">
            {resolved.map(claim => (
              <ClaimRow key={claim.id} claim={claim} isManager={isManager} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function ClaimRow({ claim, isManager }: { claim: any; isManager: boolean }) {
  const cfg    = STATUS_CONFIG[claim.status as keyof typeof STATUS_CONFIG]
  const staff  = claim.staff as { full_name: string } | null
  const su     = claim.service_user as { first_name: string; last_name: string } | null

  return (
    <Link
      href={`/mileage/${claim.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all"
    >
      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
        <Car className="h-5 w-5 text-purple-700" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 truncate">{claim.purpose}</p>
          {su && (
            <span className="text-xs text-slate-400">
              — {su.first_name} {su.last_name}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {formatDate(claim.claim_date)}
          {isManager && staff && ` · ${staff.full_name}`}
          {claim.from_location && claim.to_location && ` · ${claim.from_location} → ${claim.to_location}`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-900">{formatAmount(claim.miles, claim.rate_per_mile)}</p>
        <p className="text-xs text-slate-400">{formatMiles(claim.miles)}</p>
      </div>
      <Badge variant={cfg.variant}>{cfg.label}</Badge>
      <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
    </Link>
  )
}
