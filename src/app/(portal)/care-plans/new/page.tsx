'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewCarePlanPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = createClient()

  const [residents, setResidents] = useState<{ id: string; first_name: string; last_name: string; home_id: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const preselected = searchParams.get('resident') ?? ''
  const [residentId, setResidentId]             = useState(preselected)
  const [title, setTitle]                       = useState('')
  const [status, setStatus]                     = useState<'draft' | 'active'>('draft')
  const [reviewDate, setReviewDate]             = useState('')
  const [strengths, setStrengths]               = useState('')
  const [supportNeeds, setSupportNeeds]         = useState('')
  const [goals, setGoals]                       = useState('')
  const [longTermObjectives, setLongTermObjectives] = useState('')
  const [risks, setRisks]                       = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('service_users').select('id, first_name, last_name, home_id').eq('status', 'active').order('last_name')
      setResidents(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!residentId) { setError('Please select a resident.'); return }
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated.'); setSaving(false); return }

    const resident = residents.find(r => r.id === residentId)

    const { data, error: insertError } = await supabase
      .from('care_plans')
      .insert({
        service_user_id:       residentId,
        home_id:               resident?.home_id ?? null,
        title:                 title.trim(),
        status,
        review_date:           reviewDate || null,
        strengths:             strengths.trim() || null,
        support_needs:         supportNeeds.trim() || null,
        goals:                 goals.trim() || null,
        long_term_objectives:  longTermObjectives.trim() || null,
        risks:                 risks.trim() || null,
        created_by:            user.id,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/care-plans/${data.id}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/care-plans" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to care plans
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Care Plan</h1>
        <p className="mt-1 text-sm text-slate-500">Person-centred plans should reflect the resident's own voice and goals.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Plan Details</h2>

          <div>
            <Label htmlFor="resident">Resident *</Label>
            <select
              id="resident"
              value={residentId}
              onChange={e => setResidentId(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Select resident…</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}</option>)}
            </select>
          </div>

          <div>
            <Label htmlFor="title">Plan title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Independent Living Support Plan" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">Initial status</Label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value as 'draft' | 'active')}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div>
              <Label htmlFor="reviewDate">Review date</Label>
              <Input id="reviewDate" type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Person-Centred Content</h2>

          <div>
            <Label htmlFor="strengths">Strengths &amp; abilities</Label>
            <Textarea id="strengths" value={strengths} onChange={e => setStrengths(e.target.value)} placeholder="What does this person do well? What are they proud of?..." rows={3} />
          </div>

          <div>
            <Label htmlFor="supportNeeds">Support needs</Label>
            <Textarea id="supportNeeds" value={supportNeeds} onChange={e => setSupportNeeds(e.target.value)} placeholder="What support does this person need and why?..." rows={3} />
          </div>

          <div>
            <Label htmlFor="goals">Goals (short-term)</Label>
            <Textarea id="goals" value={goals} onChange={e => setGoals(e.target.value)} placeholder="What does this person want to achieve in the next 3–6 months?..." rows={3} />
          </div>

          <div>
            <Label htmlFor="longTerm">Long-term objectives</Label>
            <Textarea id="longTerm" value={longTermObjectives} onChange={e => setLongTermObjectives(e.target.value)} placeholder="Longer-term aspirations and independence goals..." rows={3} />
          </div>

          <div>
            <Label htmlFor="risks">Identified risks</Label>
            <Textarea id="risks" value={risks} onChange={e => setRisks(e.target.value)} placeholder="Any risks identified and how they will be managed..." rows={3} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create care plan'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
