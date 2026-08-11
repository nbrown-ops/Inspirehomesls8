'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  profile: UserProfile
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({
  profile,
  children,
}: {
  profile: UserProfile
  children: ReactNode
}) {
  return (
    <AuthContext.Provider value={{ profile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider (portal layout)')
  return ctx
}
