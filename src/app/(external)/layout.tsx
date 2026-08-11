import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ExternalHeader } from '@/components/external/ExternalHeader'
import { SessionTimeoutModal } from '@/components/auth/SessionTimeoutModal'
import type { UserProfile } from '@/types'

export default async function ExternalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, user_home_assignments(home_id)')
    .eq('id', user.id)
    .single()

  // Only social_worker role reaches this layout
  if (!profileData || profileData.role !== 'social_worker') {
    redirect('/dashboard')
  }

  const profile: UserProfile = {
    ...profileData,
    home_ids: profileData.user_home_assignments?.map((a: { home_id: string }) => a.home_id) ?? [],
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ExternalHeader profile={profile} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {children}
      </main>
      <SessionTimeoutModal />
    </div>
  )
}
