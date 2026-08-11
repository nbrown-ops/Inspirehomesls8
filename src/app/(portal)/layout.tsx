import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/lib/context/AuthContext'
import { SessionTimeoutModal } from '@/components/auth/SessionTimeoutModal'
import { QuickLogFAB } from '@/components/timeline/QuickLogFAB'
import { PortalShell } from '@/components/layout/PortalShell'
import type { UserProfile } from '@/types'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, user_home_assignments(home_id)')
    .eq('id', user.id)
    .single()

  if (!profileData || !profileData.is_active) redirect('/login')

  const profile: UserProfile = {
    ...profileData,
    home_ids: profileData.user_home_assignments?.map((a: { home_id: string }) => a.home_id) ?? [],
  }

  return (
    <AuthProvider profile={profile}>
      <PortalShell>
        {children}
      </PortalShell>
      <SessionTimeoutModal />
      {(profile.role === 'staff' || profile.role === 'manager' || profile.role === 'super_admin') && (
        <QuickLogFAB />
      )}
    </AuthProvider>
  )
}
