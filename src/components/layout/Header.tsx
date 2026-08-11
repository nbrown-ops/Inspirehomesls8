'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, Bell, User, AlertTriangle, ShieldAlert, Pill, FileText, UserX, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/AuthContext'
import { ROLE_LABELS } from '@/lib/constants/roles'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { GlobalSearch } from '@/components/layout/GlobalSearch'

interface Alert {
  id: string
  alert_type: string
  title: string
  triggered_at: string
  service_user_id: string | null
}

const ALERT_ICONS: Record<string, React.ReactNode> = {
  incident_flagged:        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  safeguarding:            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />,
  medication_overdue:      <Pill className="h-3.5 w-3.5 text-amber-500" />,
  document_expiring:       <FileText className="h-3.5 w-3.5 text-amber-500" />,
  missing_person:          <UserX className="h-3.5 w-3.5 text-red-500" />,
}

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { profile }    = useAuth()
  const router         = useRouter()
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [bellOpen,  setBellOpen]  = useState(false)
  const [alerts,    setAlerts]    = useState<Alert[]>([])
  const bellRef = useRef<HTMLDivElement>(null)

  // Fetch unread alerts on mount and subscribe to new ones
  useEffect(() => {
    const supabase = createClient()

    async function loadAlerts() {
      const { data } = await supabase
        .from('alerts')
        .select('id, alert_type, title, triggered_at, service_user_id')
        .eq('is_resolved', false)
        .order('triggered_at', { ascending: false })
        .limit(20)
      if (data) setAlerts(data)
    }

    void loadAlerts()

    const channel = supabase
      .channel('header-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, payload => {
        setAlerts(prev => [payload.new as Alert, ...prev].slice(0, 20))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, payload => {
        if ((payload.new as any).is_resolved) {
          setAlerts(prev => prev.filter(a => a.id !== (payload.new as any).id))
        }
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  // Close bell on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const unreadCount = alerts.length

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-30">
      {/* Left: hamburger (mobile) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Global search */}
      <div className="flex-1 flex justify-center px-4 max-w-sm mx-auto">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(o => !o)}
            className={cn(
              'relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors',
              bellOpen && 'bg-slate-100 text-slate-700'
            )}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setBellOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">
                    Alerts
                    {unreadCount > 0 && (
                      <span className="ml-2 text-xs bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                    )}
                  </p>
                  <a href="/reports" className="text-xs text-purple-700 hover:text-purple-900 font-medium" onClick={() => setBellOpen(false)}>
                    View all
                  </a>
                </div>
                {alerts.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Bell className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No unresolved alerts</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {alerts.map(alert => (
                      <a
                        key={alert.id}
                        href={alert.service_user_id ? `/residents/${alert.service_user_id}` : '/reports'}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                        onClick={() => setBellOpen(false)}
                      >
                        <div className="mt-0.5 shrink-0">
                          {ALERT_ICONS[alert.alert_type] ?? <Bell className="h-3.5 w-3.5 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 line-clamp-2">{alert.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {formatDistanceToNow(parseISO(alert.triggered_at), { addSuffix: true })}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className={cn(
              'flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg transition-colors',
              'hover:bg-slate-100',
              menuOpen && 'bg-slate-100'
            )}
          >
            {profile.photo_url ? (
              <img
                src={profile.photo_url}
                alt={profile.full_name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-200"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#8DC63F] flex items-center justify-center text-white text-xs font-bold shrink-0">
                {profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900 leading-tight">
                {profile.preferred_name ?? profile.full_name.split(' ')[0]}
              </p>
              <p className="text-xs text-slate-500 leading-tight">{ROLE_LABELS[profile.role]}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-slate-200 bg-white shadow-lg z-20 py-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">{profile.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                </div>
                <a
                  href="/settings"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-4 w-4 text-slate-400" />
                  My profile
                </a>
                <div className="border-t border-slate-100 mt-1">
                  <button
                    onClick={() => { setMenuOpen(false); void handleSignOut() }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
