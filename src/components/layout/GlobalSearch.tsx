'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, UserCheck, FileText, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SearchResult {
  id: string
  label: string
  sublabel?: string
  href: string
  type: 'resident' | 'staff' | 'document'
}

export function GlobalSearch() {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cmd/Ctrl + K to open
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      const mapped: SearchResult[] = [
        ...(data.residents ?? []).map((r: any) => ({
          id:       r.id,
          label:    `${r.first_name} ${r.last_name}${r.preferred_name ? ` (${r.preferred_name})` : ''}`,
          sublabel: r.status,
          href:     `/residents/${r.id}`,
          type:     'resident' as const,
        })),
        ...(data.staff ?? []).map((s: any) => ({
          id:       s.id,
          label:    s.full_name,
          sublabel: s.job_title ?? s.role,
          href:     `/staff/${s.id}`,
          type:     'staff' as const,
        })),
        ...(data.documents ?? []).map((d: any) => ({
          id:       d.id,
          label:    d.title,
          sublabel: d.document_type?.replace(/_/g, ' '),
          href:     d.service_user_id ? `/residents/${d.service_user_id}?tab=documents` : `/documents`,
          type:     'document' as const,
        })),
      ]
      setResults(mapped)
      setSelected(0)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) {
      router.push(results[selected].href)
      setOpen(false)
    }
  }

  const ICONS = {
    resident: <Users className="h-4 w-4 text-purple-600" />,
    staff:    <UserCheck className="h-4 w-4 text-blue-600" />,
    document: <FileText className="h-4 w-4 text-slate-500" />,
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-400 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors w-48"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-xs bg-slate-200 text-slate-500 px-1.5 rounded">⌘K</kbd>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              {loading ? <Loader2 className="h-4 w-4 text-slate-400 shrink-0 animate-spin" /> : <Search className="h-4 w-4 text-slate-400 shrink-0" />}
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Search residents, staff, documents…"
                className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus() }}>
                  <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                </button>
              )}
            </div>

            {/* Results */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((r, i) => (
                  <li key={`${r.type}-${r.id}`}>
                    <a
                      href={r.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 transition-colors',
                        i === selected ? 'bg-purple-50' : 'hover:bg-slate-50'
                      )}
                      onMouseEnter={() => setSelected(i)}
                    >
                      {ICONS[r.type]}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{r.label}</p>
                        {r.sublabel && <p className="text-xs text-slate-400 capitalize">{r.sublabel}</p>}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            ) : query.length >= 2 && !loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">No results for "{query}"</div>
            ) : query.length < 2 && query.length > 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">Type at least 2 characters</div>
            ) : (
              <div className="px-4 py-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick access</p>
                {[
                  { href: '/residents', label: 'All residents', icon: <Users className="h-4 w-4 text-purple-600" /> },
                  { href: '/staff',     label: 'Staff list',    icon: <UserCheck className="h-4 w-4 text-blue-600" /> },
                  { href: '/reports',   label: 'Reports',       icon: <FileText className="h-4 w-4 text-slate-500" /> },
                ].map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 text-sm text-slate-700"
                  >
                    {item.icon}
                    {item.label}
                  </a>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-4 text-xs text-slate-400">
              <span><kbd className="bg-slate-100 px-1 rounded">↑↓</kbd> navigate</span>
              <span><kbd className="bg-slate-100 px-1 rounded">↵</kbd> open</span>
              <span><kbd className="bg-slate-100 px-1 rounded">Esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
