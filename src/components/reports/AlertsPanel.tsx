import { formatDistanceToNow, parseISO } from 'date-fns'
import { AlertTriangle, ShieldAlert, Pill, FileText, UserX, Bell } from 'lucide-react'
import Link from 'next/link'

interface AlertRow {
  id: string
  alert_type: string
  title: string
  message: string | null
  triggered_at: string
  service_user_id: string | null
  service_users: { first_name: string; last_name: string } | null
}

interface Props {
  alerts: AlertRow[]
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
  incident_flagged:        <AlertTriangle className="h-4 w-4 text-red-600" />,
  safeguarding:            <ShieldAlert className="h-4 w-4 text-red-600" />,
  medication_overdue:      <Pill className="h-4 w-4 text-amber-600" />,
  document_expiring:       <FileText className="h-4 w-4 text-amber-600" />,
  dbs_expiring:            <FileText className="h-4 w-4 text-amber-600" />,
  missing_person:          <UserX className="h-4 w-4 text-red-600" />,
  handover_unacknowledged: <Bell className="h-4 w-4 text-purple-600" />,
}

const ALERT_BG: Record<string, string> = {
  incident_flagged:        'bg-red-50 border-red-200',
  safeguarding:            'bg-red-50 border-red-200',
  medication_overdue:      'bg-amber-50 border-amber-200',
  missing_person:          'bg-red-50 border-red-200',
}

export function AlertsPanel({ alerts }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Open alerts</h2>
          <p className="text-sm text-slate-500 mt-0.5">{alerts.length} unresolved alert{alerts.length !== 1 ? 's' : ''}</p>
        </div>
        {alerts.length > 0 && (
          <span className="text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1 rounded-full">
            Action required
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-sm text-green-600 font-medium">No open alerts</p>
          <p className="text-xs text-slate-400 mt-1">All alerts have been resolved.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {alerts.map(alert => {
            const age = formatDistanceToNow(parseISO(alert.triggered_at), { addSuffix: true })
            const bg  = ALERT_BG[alert.alert_type] ?? 'bg-white border-transparent'
            const icon = ALERT_ICONS[alert.alert_type] ?? <Bell className="h-4 w-4 text-slate-500" />

            return (
              <div key={alert.id} className={`px-6 py-3.5 flex items-start gap-4 border-l-4 ${bg}`}>
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{alert.title}</p>
                      {alert.service_users && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Re: {alert.service_users.first_name} {alert.service_users.last_name}
                        </p>
                      )}
                      {alert.message && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{alert.message}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-400">{age}</p>
                      {alert.service_user_id && (
                        <Link
                          href={`/residents/${alert.service_user_id}`}
                          className="text-xs text-purple-700 hover:text-purple-900 font-medium mt-1 inline-block"
                        >
                          View →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
