'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

// GDPR-compliant: warn at 25 min, sign out at 30 min
const WARN_AFTER_MS  = 25 * 60 * 1000
const LOGOUT_AFTER_MS = 30 * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click']

export function SessionTimeoutModal() {
  const router      = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [countdown, setCountdown] = useState(5 * 60) // seconds remaining
  const warnTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = () => {
    if (warnTimer.current)   clearTimeout(warnTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)
  }

  const signOut = useCallback(async () => {
    clearTimers()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }, [router])

  const startCountdown = useCallback(() => {
    setCountdown(5 * 60)
    countdownInterval.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    logoutTimer.current = setTimeout(signOut, 5 * 60 * 1000)
  }, [signOut])

  const resetTimers = useCallback(() => {
    clearTimers()
    setShowModal(false)
    warnTimer.current = setTimeout(() => {
      setShowModal(true)
      startCountdown()
    }, WARN_AFTER_MS)
  }, [startCountdown])

  const staySignedIn = () => {
    setShowModal(false)
    resetTimers()
    // Refresh session
    const supabase = createClient()
    supabase.auth.getSession()
  }

  useEffect(() => {
    resetTimers()
    const handler = () => {
      if (!showModal) resetTimers()
    }
    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, handler, { passive: true }))
    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, handler))
    }
  }, [resetTimers, showModal])

  // Warn at threshold even without component re-render
  const _ = LOGOUT_AFTER_MS // suppress unused warning

  if (!showModal) return null

  const minutes = Math.floor(countdown / 60)
  const seconds = countdown % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Session expiring soon</h2>
        <p className="text-sm text-slate-500 mb-2">
          For security on shared devices, you will be automatically signed out in:
        </p>
        <p className="text-4xl font-bold text-slate-900 mb-1 tabular-nums">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </p>
        <p className="text-xs text-slate-400 mb-6">Any unsaved work may be lost</p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => void signOut()}
          >
            Sign out now
          </Button>
          <Button
            className="flex-1 bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
            onClick={staySignedIn}
          >
            Stay signed in
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          This message is shown to protect data on shared devices (UK GDPR Article 32)
        </p>
      </div>
    </div>
  )
}
