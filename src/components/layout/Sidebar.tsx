'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileWarning,
  Pill,
  BookOpen,
  ClipboardList,
  FileText,
  FolderOpen,
  Settings,
  ShieldCheck,
  CalendarClock,
  CheckSquare,
  Car,
  LayoutGrid,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/lib/context/AuthContext'
import { ROLE_LABELS } from '@/lib/constants/roles'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard, roles: ['super_admin', 'manager', 'staff', 'auditor'] },
  { href: '/shifts',      label: 'Shifts',       icon: CalendarClock,   roles: ['super_admin', 'manager', 'staff'] },
  { href: '/shifts/schedule', label: 'Schedule', icon: LayoutGrid,      roles: ['super_admin', 'manager', 'staff'] },
  { href: '/residents',   label: 'Residents',    icon: Users,           roles: ['super_admin', 'manager', 'staff', 'social_worker', 'auditor'] },
  { href: '/incidents',   label: 'Incidents',    icon: FileWarning,     roles: ['super_admin', 'manager', 'staff', 'auditor'] },
  { href: '/medications', label: 'Medications',  icon: Pill,            roles: ['super_admin', 'manager', 'staff'] },
  { href: '/daily-logs',  label: 'Daily Logs',   icon: BookOpen,        roles: ['super_admin', 'manager', 'staff'] },
  { href: '/tasks',       label: 'My Tasks',     icon: CheckSquare,     roles: ['super_admin', 'manager', 'staff'] },
  { href: '/care-plans',  label: 'Care Plans',   icon: ClipboardList,   roles: ['super_admin', 'manager', 'staff', 'social_worker', 'auditor'] },
  { href: '/mileage',     label: 'Mileage',      icon: Car,             roles: ['super_admin', 'manager', 'staff'] },
  { href: '/reports',     label: 'Reports',      icon: FileText,        roles: ['super_admin', 'manager', 'auditor'] },
  { href: '/documents',   label: 'Documents',    icon: FolderOpen,      roles: ['super_admin', 'manager', 'staff', 'social_worker', 'auditor'] },
  { href: '/staff',       label: 'Staff',        icon: ShieldCheck,     roles: ['super_admin', 'manager'] },
  { href: '/admin',       label: 'Admin',        icon: Settings,        roles: ['super_admin'] },
] as const

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname    = usePathname()
  const { profile } = useAuth()

  const visible = navItems.filter(item =>
    (item.roles as readonly string[]).includes(profile.role)
  )

  const sidebarContent = (
    <aside className="w-64 shrink-0 flex flex-col bg-purple-950 h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          {/* Inspire raised-hands logo mark */}
          <svg width="40" height="30" viewBox="0 0 40 30" aria-hidden="true">
            {/* Left hand — fingers arc from pinky (left) to thumb (inner right) */}
            <rect x="0.5" y="13" width="2.5" height="14" rx="1.25" fill="#8DC63F"/>
            <rect x="4"   y="7"  width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="7.5" y="4"  width="2.5" height="23" rx="1.25" fill="#8DC63F"/>
            <rect x="11"  y="7"  width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="14.5" y="16" width="2.5" height="11" rx="1.25" fill="#8DC63F"/>
            {/* Left palm base */}
            <rect x="0" y="23" width="17" height="7" rx="3" fill="#8DC63F"/>
            {/* Right hand — mirrored, thumb (inner left) to pinky (right) */}
            <rect x="23"  y="16" width="2.5" height="11" rx="1.25" fill="#8DC63F"/>
            <rect x="26.5" y="7" width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="30"  y="4"  width="2.5" height="23" rx="1.25" fill="#8DC63F"/>
            <rect x="33.5" y="7" width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="37"  y="13" width="2.5" height="14" rx="1.25" fill="#8DC63F"/>
            {/* Right palm base */}
            <rect x="23" y="23" width="17" height="7" rx="3" fill="#8DC63F"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-white leading-tight tracking-wide">INSPIRE</p>
            <p className="text-[10px] font-semibold text-[#8DC63F] leading-tight tracking-widest">HOMES LS8</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onMobileClose}
          className="lg:hidden p-1 rounded text-purple-300 hover:text-white hover:bg-purple-800 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map(({ href, label, icon: Icon }) => {
          // Active if exact match, OR starts-with — but yield to a more-specific sibling that also matches
          const active = pathname === href || (
            href !== '/dashboard' &&
            pathname.startsWith(href) &&
            !visible.some(other => other.href !== href && other.href.startsWith(href) && pathname.startsWith(other.href))
          )
          return (
            <Link
              key={href}
              href={href}
              onClick={onMobileClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-[#8DC63F] text-[#1a2a0a] font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info at bottom */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.full_name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-[#8DC63F]"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#8DC63F] flex items-center justify-center text-[#1a2a0a] text-xs font-bold shrink-0">
              {profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile.preferred_name ?? profile.full_name}</p>
            <p className="text-xs text-white/50 truncate">{ROLE_LABELS[profile.role]}</p>
          </div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:block shrink-0 min-h-screen">
        {sidebarContent}
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={onMobileClose} />
          <div className="relative z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
