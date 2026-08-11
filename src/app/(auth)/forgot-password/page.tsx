'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { forgotPasswordAction } from '../login/actions'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" loading={pending} className="w-full bg-purple-700 hover:bg-purple-800 focus-visible:ring-purple-700">
      {pending ? 'Sending…' : 'Send reset link'}
    </Button>
  )
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, null)

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
          {state?.success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100 mb-4">
                <MailCheck className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 mb-6">
                If that email address is registered, you&apos;ll receive a password reset link shortly.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-purple-700 hover:text-purple-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900">Reset your password</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter your email and we&apos;ll send a reset link.
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

                <SubmitButton />
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-white/40">
          Authorised personnel only &middot; All activity is logged
        </p>
      </div>
    </div>
  )
}
