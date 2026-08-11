'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { loginAction } from './actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="w-full bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700">
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#141422] via-[#1e1e38] to-[#2a1a0a] px-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] bg-[length:32px_32px]" />

      <div className="relative w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          {/* Inspire logo mark */}
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

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">Sign in to your account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter your Inspire Homes LS8 credentials to continue
            </p>
          </div>

          {state?.error && (
            <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@inspirehomes.co.uk"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-purple-700 hover:text-purple-800 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            <SubmitButton />
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-purple-300">
          Authorised personnel only &middot; All activity is logged
        </p>
      </div>
    </div>
  )
}
