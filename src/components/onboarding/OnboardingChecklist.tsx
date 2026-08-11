'use client'

import { useState } from 'react'
import { CheckCircle, Circle, ChevronDown, ChevronUp, X, User, BookOpen, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils/cn'

interface ChecklistItem {
  id: string
  label: string
  description: string
  href?: string
  icon: React.ReactNode
  completed: boolean
}

interface Props {
  profileComplete: boolean
  handbookAcknowledged: boolean
  confidentialityAcknowledged: boolean
  staffId: string
}

export function OnboardingChecklist({ profileComplete, handbookAcknowledged, confidentialityAcknowledged, staffId }: Props) {
  const [collapsed, setCollapsed]   = useState(false)
  const [dismissed, setDismissed]   = useState(false)
  const [handbook,  setHandbook]    = useState(handbookAcknowledged)
  const [confid,    setConfid]      = useState(confidentialityAcknowledged)
  const [loading,   setLoading]     = useState<string | null>(null)

  const items: ChecklistItem[] = [
    {
      id:          'profile',
      label:       'Complete your profile',
      description: 'Add your job title, phone number, and profile photo.',
      href:        '/settings',
      icon:        <User className="h-4 w-4" />,
      completed:   profileComplete,
    },
    {
      id:          'handbook',
      label:       'Read the staff handbook',
      description: 'Familiarise yourself with Inspire Homes LS8 policies and procedures.',
      icon:        <BookOpen className="h-4 w-4" />,
      completed:   handbook,
    },
    {
      id:          'confidentiality',
      label:       'Acknowledge the confidentiality policy',
      description: 'Confirm you understand your data protection obligations under UK GDPR.',
      icon:        <Shield className="h-4 w-4" />,
      completed:   confid,
    },
  ]

  const completedCount = items.filter(i => i.completed).length
  const allDone        = completedCount === items.length

  async function acknowledge(type: 'handbook' | 'confidentiality') {
    setLoading(type)
    const supabase = createClient()
    const key = type === 'handbook' ? 'handbook_acknowledged_at' : 'confidentiality_acknowledged_at'
    await supabase.from('profiles').update({ [key]: new Date().toISOString() }).eq('id', staffId)
    if (type === 'handbook')      setHandbook(true)
    if (type === 'confidentiality') setConfid(true)
    setLoading(null)
  }

  if (dismissed || allDone) return null

  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden mb-6 print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-purple-100/60 border-b border-purple-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'h-2 w-2 rounded-full',
                  item.completed ? 'bg-green-500' : 'bg-purple-300'
                )}
              />
            ))}
          </div>
          <p className="text-sm font-semibold text-purple-900">
            Getting started — {completedCount}/{items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 rounded text-purple-700 hover:bg-purple-200 transition-colors"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-purple-700 hover:bg-purple-200 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="px-5 py-4 space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-3 rounded-lg p-3',
                item.completed ? 'bg-green-50 border border-green-200' : 'bg-white border border-purple-100'
              )}
            >
              <div className={cn('mt-0.5 shrink-0', item.completed ? 'text-green-500' : 'text-purple-400')}>
                {item.completed ? <CheckCircle className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', item.completed ? 'text-green-800 line-through' : 'text-slate-900')}>
                  {item.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
              </div>
              {!item.completed && (
                <div className="shrink-0">
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-xs font-medium text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      Go →
                    </a>
                  ) : (
                    <button
                      disabled={loading === item.id}
                      onClick={() => acknowledge(item.id as 'handbook' | 'confidentiality')}
                      className="text-xs font-medium text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {loading === item.id ? 'Saving…' : 'Acknowledge'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
