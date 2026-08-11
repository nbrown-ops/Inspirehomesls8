import { ShieldCheck, ShieldAlert, ShieldX, Shield } from 'lucide-react'
import { getDbsStatus, getDbsDaysLeft } from '@/lib/utils/compliance'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

interface DbsBadgeProps {
  expiryDate: string | null
  showDate?: boolean
  size?: 'sm' | 'md'
}

const CONFIG = {
  valid:          { label: 'DBS Valid',         icon: ShieldCheck, classes: 'bg-green-100 text-green-700 border-green-200' },
  expiring_soon:  { label: 'DBS Expiring Soon', icon: ShieldAlert, classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  expired:        { label: 'DBS Expired',       icon: ShieldX,     classes: 'bg-red-100 text-red-700 border-red-200'   },
  missing:        { label: 'DBS Missing',       icon: Shield,      classes: 'bg-slate-100 text-slate-500 border-slate-200' },
}

export function DbsBadge({ expiryDate, showDate = false, size = 'md' }: DbsBadgeProps) {
  const status   = getDbsStatus(expiryDate)
  const daysLeft = getDbsDaysLeft(expiryDate)
  const { label, icon: Icon, classes } = CONFIG[status]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      classes
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {label}
      {showDate && expiryDate && (
        <span className="opacity-75">
          {status === 'expired' ? `(expired ${formatDate(expiryDate)})` :
           status === 'expiring_soon' ? `(${daysLeft}d left)` :
           `(${formatDate(expiryDate)})`}
        </span>
      )}
    </span>
  )
}
