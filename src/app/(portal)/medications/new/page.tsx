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

const ROUTES = ['oral', 'sublingual', 'topical', 'inhaled', 'injection', 'transdermal', 'rectal', 'nasal', 'ophthalmic', 'other']

export default function NewMedicationPage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const supabase    = createClient()

  const [residents, setResidents] = useState<{ id: string; first_name: string; last_name: string; home_id: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const preselectedResident = searchParams.get('resident') ?? ''
  const [residentId, setResidentId]           = useState(preselectedResident)
  const [medicationName, setMedicationName]   = useState('')
  const [dosage, setDosage]                   = useState('')
  const [route, setRoute]                     = useState('oral')
  const [frequency, setFrequency]             = useState('')
  const [isPrn, setIsPrn]                     = useState(false)
  const [isControlled, setIsControlled]       = useState(false)
  const [startDate, setStartDate]             = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate]                 = useState('')
  const [prescriber, setPrescriber]           = useState('')
  const [prescriberContact, setPrescriberContact] = useState('')
  const [sideEffects, setSideEffects]         = useState('')
  const [adminNotes, setAdminNotes]           = useState('')
  const [storageInstructions, setStorageInstructions] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('service_users')
        .select('id, first_name, last_name, home_id')
        .eq('status', 'active')
        .order('last_name')
      setResidents(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!residentId) { setError('Please select a resident.'); return }
    if (!medicationName.trim()) { setError('Medication name is required.'); return }
    if (!dosage.trim() || !frequency.trim()) { setError('Dosage and frequency are required.'); return }
    setSaving(true)
    setError(null)

    const resident = residents.find(r => r.id === residentId)

    const { data, error: insertError } = await supabase
      .from('medications')
      .insert({
        service_user_id:       residentId,
        home_id:               resident?.home_id ?? null,
        medication_name:       medicationName.trim(),
        dosage:                dosage.trim(),
        route,
        frequency:             frequency.trim(),
        is_prn:                isPrn,
        is_controlled:         isControlled,
        is_active:             true,
        start_date:            startDate,
        end_date:              endDate || null,
        prescriber:            prescriber.trim() || null,
        prescriber_contact:    prescriberContact.trim() || null,
        side_effects:          sideEffects.trim() || null,
        administration_notes:  adminNotes.trim() || null,
        storage_instructions:  storageInstructions.trim() || null,
      })
      .select('id')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/medications/${data.id}`)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-purple-600" /></div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/medications" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-purple-700 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to medications
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Medication</h1>
        <p className="mt-1 text-sm text-slate-500">Enter the prescription details accurately.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Prescription Details</h2>

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
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="medName">Medication name *</Label>
            <Input id="medName" value={medicationName} onChange={e => setMedicationName(e.target.value)} placeholder="e.g. Sertraline" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="dosage">Dosage *</Label>
              <Input id="dosage" value={dosage} onChange={e => setDosage(e.target.value)} placeholder="e.g. 50mg" required />
            </div>
            <div>
              <Label htmlFor="route">Route *</Label>
              <select
                id="route"
                value={route}
                onChange={e => setRoute(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {ROUTES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Input id="frequency" value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g. Once daily" required />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPrn} onChange={e => setIsPrn(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm text-slate-700">PRN (as required)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isControlled} onChange={e => setIsControlled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500" />
              <span className="text-sm text-slate-700 font-medium text-red-700">Controlled Drug (CD)</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">Start date *</Label>
              <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="endDate">End date (if applicable)</Label>
              <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="prescriber">Prescriber</Label>
              <Input id="prescriber" value={prescriber} onChange={e => setPrescriber(e.target.value)} placeholder="Dr. Name" />
            </div>
            <div>
              <Label htmlFor="prescriberContact">Prescriber contact</Label>
              <Input id="prescriberContact" value={prescriberContact} onChange={e => setPrescriberContact(e.target.value)} placeholder="Phone / surgery" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Clinical Notes</h2>
          <div>
            <Label htmlFor="adminNotes">Administration notes</Label>
            <Textarea id="adminNotes" value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Any special instructions for giving this medication..." rows={2} />
          </div>
          <div>
            <Label htmlFor="sideEffects">Known side effects to monitor</Label>
            <Textarea id="sideEffects" value={sideEffects} onChange={e => setSideEffects(e.target.value)} placeholder="List any side effects staff should watch for..." rows={2} />
          </div>
          <div>
            <Label htmlFor="storage">Storage instructions</Label>
            <Input id="storage" value={storageInstructions} onChange={e => setStorageInstructions(e.target.value)} placeholder="e.g. Keep refrigerated" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add medication'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
