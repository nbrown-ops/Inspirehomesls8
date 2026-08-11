'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface TabsContextValue {
  active: string
  setActive: (id: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs subcomponents must be inside <Tabs>')
  return ctx
}

export function Tabs({
  defaultTab,
  children,
  className,
}: {
  defaultTab: string
  children: ReactNode
  className?: string
}) {
  const [active, setActive] = useState(defaultTab)
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-0.5 border-b border-slate-200 overflow-x-auto',
        className
      )}
    >
      {children}
    </div>
  )
}

export function Tab({
  id,
  children,
  className,
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  const { active, setActive } = useTabs()
  const isActive = active === id
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActive(id)}
      className={cn(
        'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
        'border-b-2 -mb-px',
        isActive
          ? 'border-purple-700 text-purple-700'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabPanel({
  id,
  children,
  className,
}: {
  id: string
  children: ReactNode
  className?: string
}) {
  const { active } = useTabs()
  if (active !== id) return null
  return (
    <div role="tabpanel" className={cn('py-6', className)}>
      {children}
    </div>
  )
}
