'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { ArrowLeft, Loader2 } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'draft',        label: 'Draft' },
  { value: 'active',       label: 'Active' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'archived',     label: 'Archived' },
]

export default function EditCarePlanPage() {
  const router  = useRouter()
  const params  = useParams<{ id: string }>()
  const supabase = createClient()

  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [notAllowed, setNotAllowed] = useState(false)

  const [title, setTitle]                       = useState('')
  const [status, setStatus]                     = useState('active')
  const [reviewDate, setReviewDate]             = useState('')
  const [strengths, setStrengths]               = useState('')
  const [supportNeeds, setSupportNeeds]         = useState('')
  const [goals, setGoals]                       = useState('')
  const [longTermObjectives, setLongTermObjectives] = useState('')
  const [risks, setRisks]                       = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || !['super_admin', 'manager', 'staff'].includes(profile.role)) {
        setNotAllowed(true); setLoading(false); return
      }

      const { data: plan } = await supabase
        .from('care_plans')
        .select('title, status, review_date, strengths, support_needs, goals, long_term_objectives, risks')
        .eq('id', params.id)
        .single()

      if (!plan) { router.replace('/care-plans'); return }

      setTitle(plan.title ?? '')
      setStatus(plan.status ?? 'active')
      setReviewDate(plan.review_date ?? '')
      setStrengths(plan.strengths ?? '')
      setSupportNeeds(plan.support_needs ?? '')
      setGoals(plan.goals ?? '')
      setLongTermObjectives(plan.long_term_objectives ?? '')
      setRisks(plan.risks ?? '')
      setLoading(false)
    }
    load()
  }, [params.id, router, supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true); setError(null)

    const { error: updateError } = await supabase
      .from('care_plans')
      .update({
        title:                title.trim(),
        status,
        review_date:          reviewDate || null,
        strengths:            strengths.trim() || null,
        support_needs:        supportNeeds.trim() || null,
        goals:                goals.trim() || null,
        long_term_objectives: longTermObjectives.trim() || null,
        risks:                risks.trim() || null,
        updated_at:           new Date().toISOString(),
      })
      .eq('id', params.id)

    if (updateError) { setError(updateError.message); setSaving(false); return }
    router.push(`/care-plans/${params.id}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
  }

  if (notAllowed) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">You don&apos;t have permission to edit care plans.</p>
        <Link href="/care-plans" className="text-purple-700 hover:underline text-sm mt-2 inline-block">Back to care plans</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href={`/care-plans/${params.id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to care plan
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Care Plan</h1>
        <p className="mt-1 text-sm text-slate-500">Keep person-centred plans up to date and reviewed regularly.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Plan Details</h2>

          <div>
            <Label htmlFor="title">Plan title *</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
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
            <Textarea id="strengths" value={strengths} onChange={e => setStrengths(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="supportNeeds">Support needs</Label>
            <Textarea id="supportNeeds" value={supportNeeds} onChange={e => setSupportNeeds(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="goals">Goals (short-term)</Label>
            <Textarea id="goals" value={goals} onChange={e => setGoals(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="longTerm">Long-term objectives</Label>
            <Textarea id="longTerm" value={longTermObjectives} onChange={e => setLongTermObjectives(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="risks">Identified risks</Label>
            <Textarea id="risks" value={risks} onChange={e => setRisks(e.target.value)} rows={3} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
