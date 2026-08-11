'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/types'

function roleRedirect(role: UserRole): string {
  switch (role) {
    case 'social_worker': return '/portal'      // external professional portal
    case 'auditor':       return '/reports'
    default:              return '/dashboard'
  }
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const email    = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please enter your email and password.' }
  }

  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Incorrect email or password.' }
    }
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Please verify your email address before signing in.' }
    }
    return { error: 'Sign in failed. Please try again.' }
  }

  // Fetch profile to determine redirect
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .single()

  if (profile && !profile.is_active) {
    await supabase.auth.signOut()
    return { error: 'Your account has been deactivated. Please contact your manager.' }
  }

  const destination = profile ? roleRedirect(profile.role) : '/dashboard'
  redirect(destination)
}

export async function forgotPasswordAction(_prev: unknown, formData: FormData) {
  const email = formData.get('email') as string

  if (!email) return { error: 'Please enter your email address.' }

  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) return { error: 'Could not send reset email. Please try again.' }

  return { success: true }
}

export async function signOutAction() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
