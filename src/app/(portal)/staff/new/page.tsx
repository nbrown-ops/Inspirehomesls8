'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function NewStaffPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [homes, setHomes]     = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [email, setEmail]         = useState('')
  const [fullName, setFullName]   = useState('')
  const [role, setRole]           = useState('staff')
  const [jobTitle, setJobTitle]   = useState('')
  const [phone, setPhone]         = useState('')
  const [homeId, setHomeId]       = useState('')
  const [startDate, setStartDate] = useState('')
  const [contractedHours, setContractedHours] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!myProfile || !['super_admin', 'manager'].includes(myProfile.role)) {
        router.replace('/dashboard')
        return
      }
      const { data } = await supabase.from('homes').select('id, name').eq('is_active', true).order('name')
      setHomes(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !fullName.trim()) { setError('Email and full name are required.'); return }
    setSaving(true)
    setError(null)

    // Create the auth user via admin API requires service role key — instead we'll create the profile
    // and trigger an invite email. In Supabase, you use signUp or admin API on the server.
    // For now we do a server-side route call.
    const res = await fetch('/api/staff/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:            email.trim().toLowerCase(),
        full_name:        fullName.trim(),
        role,
        job_title:        jobTitle.trim() || null,
        phone:            phone.trim() || null,
        home_id:          homeId || null,
        employment_start_date: startDate || null,
        contracted_hours: contractedHours ? Number(contractedHours) : null,
      }),
    })

    const result = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(result.error ?? 'Failed to create staff member.')
      return
    }

    router.push(`/staff/${result.id}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/staff" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to staff
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Staff Member</h1>
        <p className="mt-1 text-sm text-slate-500">An invitation email will be sent to the new staff member.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Account Details</h2>

          <div>
            <Label htmlFor="email">Email address *</Label>
            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
          </div>

          <div>
            <Label htmlFor="fullName">Full name *</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="First Last" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="social_worker">Social Worker</option>
                <option value="auditor">Auditor</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="home">Assign to home</Label>
              <select
                id="home"
                value={homeId}
                onChange={e => setHomeId(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Select home…</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Employment Details</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="e.g. Support Worker" />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07700 900000" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Employment start date</Label>
              <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="hours">Contracted hours / week</Label>
              <Input id="hours" type="number" min="1" max="60" value={contractedHours} onChange={e => setContractedHours(e.target.value)} placeholder="e.g. 37.5" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create &amp; send invite'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
