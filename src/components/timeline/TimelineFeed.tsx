'use client'

import { useEffect, useState, useRef } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TimelineEntryCard, type TimelineEntryData } from './TimelineEntry'
import { cn } from '@/lib/utils/cn'

const ENTRY_SELECT = `
  id, interaction_type, occurred_at, notes, outcome,
  is_flagged, flagged_reason, duration_minutes,
  staff:profiles!staff_id(id, full_name, preferred_name, photo_url)
`

interface TimelineFeedProps {
  serviceUserId: string
  initialEntries: TimelineEntryData[]
}

export function TimelineFeed({ serviceUserId, initialEntries }: TimelineFeedProps) {
  const [entries, setEntries]       = useState<TimelineEntryData[]>(initialEntries)
  const [newIds, setNewIds]         = useState<Set<string>>(new Set())
  const [connected, setConnected]   = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const channelRef                  = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`timeline:${serviceUserId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'interaction_timeline',
          filter: `service_user_id=eq.${serviceUserId}`,
        },
        async (payload) => {
          // Fetch the full entry with staff join
          const { data } = await supabase
            .from('interaction_timeline')
            .select(ENTRY_SELECT)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setEntries(prev => {
              // Avoid duplicates
              if (prev.some(e => e.id === data.id)) return prev
              return [data as unknown as TimelineEntryData, ...prev]
            })
            setNewIds(prev => new Set(Array.from(prev).concat(data.id)))
            setLastUpdated(new Date())
            // Remove "new" highlight after 4s
            setTimeout(() => {
              setNewIds(prev => {
                const next = new Set(prev)
                next.delete(data.id)
                return next
              })
            }, 4000)
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [serviceUserId])

  async function refresh() {
    const supabase = createClient()
    const { data } = await supabase
      .from('interaction_timeline')
      .select(ENTRY_SELECT)
      .eq('service_user_id', serviceUserId)
      .order('occurred_at', { ascending: false })
      .limit(50)

    if (data) {
      setEntries(data as unknown as TimelineEntryData[])
      setLastUpdated(new Date())
    }
  }

  return (
    <div>
      {/* Realtime status bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full',
            connected
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-500'
          )}>
            {connected
              ? <><Wifi className="h-3 w-3" /><span>Live</span></>
              : <><WifiOff className="h-3 w-3" /><span>Connecting…</span></>
            }
          </div>
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              Updated {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={() => void refresh()}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="h-6 w-6 opacity-40" />
          </div>
          <p className="font-medium">No timeline entries yet</p>
          <p className="text-sm mt-1">Use the + button to log the first interaction.</p>
        </div>
      ) : (
        <div>
          {entries.map(entry => (
            <TimelineEntryCard
              key={entry.id}
              entry={entry}
              isNew={newIds.has(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
