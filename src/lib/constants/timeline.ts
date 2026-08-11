import type { InteractionType } from '@/types'

export const INTERACTION_CONFIG: Record<InteractionType, { label: string; color: string; bg: string; dot: string }> = {
  welfare_check:        { label: 'Welfare Check',         color: 'text-sky-700',     bg: 'bg-sky-100',     dot: 'bg-sky-500'     },
  key_work_session:     { label: 'Key Work Session',       color: 'text-purple-700',  bg: 'bg-purple-100',  dot: 'bg-purple-500'  },
  medication_prompt:    { label: 'Medication Prompt',      color: 'text-amber-700',   bg: 'bg-amber-100',   dot: 'bg-amber-500'   },
  activity:             { label: 'Activity',               color: 'text-green-700',   bg: 'bg-green-100',   dot: 'bg-green-500'   },
  community_activity:   { label: 'Community Activity',     color: 'text-teal-700',    bg: 'bg-teal-100',    dot: 'bg-teal-500'    },
  appointment:          { label: 'Appointment',            color: 'text-indigo-700',  bg: 'bg-indigo-100',  dot: 'bg-indigo-500'  },
  medical_appointment:  { label: 'Medical Appointment',    color: 'text-rose-700',    bg: 'bg-rose-100',    dot: 'bg-rose-500'    },
  phone_call:           { label: 'Phone Call',             color: 'text-cyan-700',    bg: 'bg-cyan-100',    dot: 'bg-cyan-500'    },
  visit:                { label: 'Visit',                  color: 'text-slate-700',   bg: 'bg-slate-100',   dot: 'bg-slate-500'   },
  incident:             { label: 'Incident',               color: 'text-red-700',     bg: 'bg-red-100',     dot: 'bg-red-500'     },
  handover:             { label: 'Handover',               color: 'text-orange-700',  bg: 'bg-orange-100',  dot: 'bg-orange-500'  },
  safeguarding_concern: { label: 'Safeguarding Concern',   color: 'text-red-700',     bg: 'bg-red-200',     dot: 'bg-red-600'     },
  positive_achievement: { label: 'Positive Achievement',   color: 'text-emerald-700', bg: 'bg-emerald-100', dot: 'bg-emerald-500' },
  other:                { label: 'Other',                  color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400'   },
}
