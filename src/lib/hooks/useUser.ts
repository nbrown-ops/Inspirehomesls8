'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types'

export function useUser() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*, user_home_assignments(home_id)')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile({
          ...data,
          home_ids: data.user_home_assignments?.map((a: { home_id: string }) => a.home_id) ?? [],
        })
      }
      setLoading(false)
    }

    load()
  }, [])

  return { profile, loading }
}
