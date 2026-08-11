'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export default function ResetPasswordPage() {
  const router   = useRouter()
  const [error, setError]     = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const password    = formData.get('password') as string
    const confirmPass = formData.get('confirm') as string

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPass) {
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#141422] via-[#1e1e38] to-[#2a1a0a] px-4">
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:32px_32px]" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <svg width="54" height="40" viewBox="0 0 40 30" aria-label="Inspire Homes LS8 logo" className="shrink-0">
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
            <div className="text-left">
              <p className="text-2xl font-bold text-white leading-tight tracking-wide">INSPIRE</p>
              <p className="text-xs font-bold text-[#8DC63F] leading-tight tracking-[0.2em]">HOMES LS8</p>
            </div>
          </div>
          <p className="mt-1 text-white/60 text-sm">Care Management Platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Password updated</h2>
              <p className="text-sm text-slate-500">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Set a new password</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a strong password (min. 8 characters).</p>
              </div>

              {error && (
                <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={e => void handleSubmit(e)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  loading={pending}
                  className="w-full bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700"
                >
                  {pending ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
