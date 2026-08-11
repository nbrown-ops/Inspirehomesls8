import { Badge } from '@/components/ui/Badge'
import type { BadgeProps } from '@/components/ui/Badge'
import type { ServiceUserStatus } from '@/types'

const STATUS_CONFIG: Record<ServiceUserStatus, { label: string; variant: BadgeProps['variant'] }> = {
  active:     { label: 'Active',     variant: 'success'  },
  discharged: { label: 'Discharged', variant: 'default'  },
  on_leave:   { label: 'On Leave',   variant: 'warning'  },
  hospital:   { label: 'Hospital',   variant: 'info'     },
  missing:    { label: 'Missing',    variant: 'danger'   },
}

export function ResidentStatusBadge({ status }: { status: ServiceUserStatus }) {
  const { label, variant } = STATUS_CONFIG[status] ?? { label: status, variant: 'default' }
  return <Badge variant={variant}>{label}</Badge>
}

// Legal status badges — free-text field, pattern-matched
const LEGAL_PATTERNS: Array<{ test: RegExp; variant: BadgeProps['variant'] }> = [
  { test: /asylum/i,           variant: 'info'    },
  { test: /section\s*20/i,     variant: 'warning' },
  { test: /section\s*31/i,     variant: 'danger'  },
  { test: /section\s*17/i,     variant: 'default' },
  { test: /care\s*leaver/i,    variant: 'purple'  },
  { test: /looked\s*after/i,   variant: 'primary' },
  { test: /lac/i,              variant: 'primary' },
  { test: /remand/i,           variant: 'danger'  },
]

export function LegalStatusBadge({ legalStatus, isAsylumSeeker }: { legalStatus: string | null; isAsylumSeeker: boolean }) {
  if (!legalStatus && !isAsylumSeeker) return null

  const label    = legalStatus ?? 'Asylum Seeker'
  const matched  = LEGAL_PATTERNS.find(p => p.test.test(label))
  const variant  = isAsylumSeeker && !legalStatus ? 'info' : (matched?.variant ?? 'default')

  return <Badge variant={variant}>{label}</Badge>
}
