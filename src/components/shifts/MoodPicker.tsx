'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

const MOODS = [
  { value: 1, label: 'Very Low',  emoji: '😞', bg: 'bg-red-100',    border: 'border-red-400',    text: 'text-red-700'    },
  { value: 2, label: 'Low',       emoji: '😕', bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
  { value: 3, label: 'Neutral',   emoji: '😐', bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' },
  { value: 4, label: 'Good',      emoji: '🙂', bg: 'bg-lime-100',   border: 'border-lime-400',   text: 'text-lime-700'   },
  { value: 5, label: 'Very Good', emoji: '😊', bg: 'bg-green-100',  border: 'border-green-400',  text: 'text-green-700'  },
] as const

interface MoodPickerProps {
  name?: string
  defaultValue?: number | null
}

export function MoodPicker({ name = 'mood_rating', defaultValue }: MoodPickerProps) {
  const [selected, setSelected] = useState<number | null>(defaultValue ?? null)

  return (
    <div>
      <input type="hidden" name={name} value={selected ?? ''} />
      <div className="flex gap-2 flex-wrap">
        {MOODS.map(m => (
          <button
            key={m.value}
            type="button"
            onClick={() => setSelected(selected === m.value ? null : m.value)}
            className={cn(
              'flex flex-col items-center gap-1 px-4 py-3 rounded-xl border-2 transition-all cursor-pointer',
              selected === m.value
                ? `${m.bg} ${m.border} scale-105 shadow-sm`
                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className={cn('text-xs font-medium', selected === m.value ? m.text : 'text-slate-500')}>
              {m.label}
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-2 text-xs text-slate-500">
          Mood recorded: <span className="font-medium">{MOODS.find(m => m.value === selected)?.label}</span>
        </p>
      )}
    </div>
  )
}
