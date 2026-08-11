import { Flag, Clock } from 'lucide-react'
import { formatDate, formatTimeAgo } from '@/lib/utils/dates'
import { INTERACTION_CONFIG } from '@/lib/constants/timeline'
import { cn } from '@/lib/utils/cn'
import type { InteractionType } from '@/types'

export interface TimelineEntryData {
  id: string
  interaction_type: string
  occurred_at: string
  notes: string | null
  outcome: string | null
  is_flagged: boolean
  flagged_reason: string | null
  duration_minutes: number | null
  staff: {
    id: string
    full_name: string
    preferred_name: string | null
    photo_url: string | null
  } | null
}

interface TimelineEntryProps {
  entry: TimelineEntryData
  isNew?: boolean
}

export function TimelineEntryCard({ entry, isNew }: TimelineEntryProps) {
  const config = INTERACTION_CONFIG[entry.interaction_type as InteractionType]
    ?? INTERACTION_CONFIG.other

  const staffName = entry.staff?.preferred_name ?? entry.staff?.full_name ?? 'Unknown staff'
  const initials  = (entry.staff?.full_name ?? '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'flex gap-4 group',
        isNew && 'animate-[fadeIn_0.4s_ease-out]'
      )}
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={cn('w-3 h-3 rounded-full mt-1.5 shrink-0 ring-2 ring-white', config.dot)} />
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>

      {/* Card */}
      <div
        className={cn(
          'flex-1 mb-6 rounded-xl border bg-white p-4 shadow-sm transition-shadow group-hover:shadow-md',
          entry.is_flagged
            ? 'border-red-200 bg-red-50/50'
            : 'border-slate-200'
        )}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2.5">
            {/* Staff avatar */}
            {entry.staff?.photo_url ? (
              <img
                src={entry.staff.photo_url}
                alt={staffName}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-purple-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-900">{staffName}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                <time dateTime={entry.occurred_at} title={formatDate(entry.occurred_at, 'dd/MM/yyyy HH:mm')}>
                  {formatTimeAgo(entry.occurred_at)}
                </time>
                {entry.duration_minutes && (
                  <span>&middot; {entry.duration_minutes}min</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', config.bg, config.color)}>
              {config.label}
            </span>
            {entry.is_flagged && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                <Flag className="h-3 w-3" />
                Escalated
              </span>
            )}
            {entry.interaction_type === 'positive_achievement' && (
              <span className="text-base" title="Positive achievement">⭐</span>
            )}
          </div>
        </div>

        {/* Note */}
        {entry.notes && (
          <p className="text-sm text-slate-700 leading-relaxed">{entry.notes}</p>
        )}

        {/* Outcome */}
        {entry.outcome && (
          <p className="mt-2 text-xs text-slate-500 italic border-t border-slate-100 pt-2">
            Outcome: {entry.outcome}
          </p>
        )}

        {/* Flagged reason */}
        {entry.is_flagged && entry.flagged_reason && (
          <div className="mt-2 flex items-start gap-2 p-2 bg-red-100 rounded-lg border border-red-200">
            <Flag className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 font-medium">{entry.flagged_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}
