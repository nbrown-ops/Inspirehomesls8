'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronDown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

export function ExternalHeader({ profile }: { profile: UserProfile }) {
  const router   = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <svg width="34" height="26" viewBox="0 0 40 30" aria-hidden="true">
            <rect x="0.5" y="13" width="2.5" height="14" rx="1.25" fill="#8DC63F"/>
            <rect x="4"   y="7"  width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="7.5" y="4"  width="2.5" height="23" rx="1.25" fill="#8DC63F"/>
            <rect x="11"  y="7"  width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="14.5" y="16" width="2.5" height="11" rx="1.25" fill="#8DC63F"/>
            <rect x="0"   y="23" width="17" height="7" rx="3" fill="#8DC63F"/>
            <rect x="23"  y="16" width="2.5" height="11" rx="1.25" fill="#8DC63F"/>
            <rect x="26.5" y="7" width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="30"  y="4"  width="2.5" height="23" rx="1.25" fill="#8DC63F"/>
            <rect x="33.5" y="7" width="2.5" height="20" rx="1.25" fill="#8DC63F"/>
            <rect x="37"  y="13" width="2.5" height="14" rx="1.25" fill="#8DC63F"/>
            <rect x="23"  y="23" width="17" height="7" rx="3" fill="#8DC63F"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">Inspire Homes LS8</p>
            <p className="text-xs text-slate-500 leading-tight">Professional Portal</p>
          </div>
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 text-xs font-bold">
              {profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700">
              {profile.preferred_name ?? profile.full_name.split(' ')[0]}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-slate-200 bg-white shadow-lg z-20 py-1">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-900 truncate">{profile.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                  <p className="text-xs text-purple-600 font-medium mt-0.5">Social Worker / External</p>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); void signOut() }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
