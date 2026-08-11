'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ROLE_LABELS } from '@/lib/constants/roles'
import type { UserRole } from '@/types'
import { CheckCircle, Loader2, User, Phone, Briefcase } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()

  const [profile, setProfile]           = useState<any>(null)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const [fullName, setFullName]         = useState('')
  const [preferredName, setPreferredName] = useState('')
  const [phone, setPhone]               = useState('')
  const [jobTitle, setJobTitle]         = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, preferred_name, role, job_title, phone, photo_url, employment_start_date')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setPreferredName(data.preferred_name ?? '')
        setPhone(data.phone ?? '')
        setJobTitle(data.job_title ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name:      fullName.trim(),
        preferred_name: preferredName.trim() || null,
        phone:          phone.trim() || null,
        job_title:      jobTitle.trim() || null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', profile.id)
    setSaving(false)
    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile and account preferences.</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg shrink-0">
            {profile?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{profile?.full_name}</p>
            <p className="text-sm text-slate-500">{profile?.email}</p>
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {ROLE_LABELS[profile?.role as UserRole]}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div>
              <Label htmlFor="preferredName">Preferred name</Label>
              <Input
                id="preferredName"
                value={preferredName}
                onChange={e => setPreferredName(e.target.value)}
                placeholder="e.g. nickname"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="jobTitle">Job title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Support Worker"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 07700 900000"
                type="tel"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <CheckCircle className="h-4 w-4" /> Saved
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Read-only info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Account information</h2>
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Email</p>
            <p className="text-slate-900">{profile?.email}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Role</p>
            <p className="text-slate-900">{ROLE_LABELS[profile?.role as UserRole]}</p>
          </div>
          {profile?.employment_start_date && (
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Employment start</p>
              <p className="text-slate-900">
                {new Date(profile.employment_start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400">To change your email or role, contact your manager or system administrator.</p>
      </div>
    </div>
  )
}
