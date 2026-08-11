'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Check, ChevronLeft, ChevronRight, Loader2, User, Home, Stethoscope, Heart, Briefcase, Plus, Trash2 } from 'lucide-react'
import type { ServiceUser, Home as HomeType, Profile } from '@/types'

type OtherPro = { role: string; name: string; org: string; phone: string; email: string }

type FormAction = (prev: unknown, formData: FormData) => Promise<{ error: string } | undefined>

interface ResidentFormProps {
  action: FormAction
  homes: Pick<HomeType, 'id' | 'name'>[]
  staff: Pick<Profile, 'id' | 'full_name'>[]
  defaultValues?: Partial<ServiceUser>
  defaultProfessionals?: OtherPro[]
}

const STEPS = [
  { id: 'personal',      label: 'Personal',     icon: User },
  { id: 'placement',     label: 'Placement',    icon: Home },
  { id: 'medical',       label: 'Medical',      icon: Stethoscope },
  { id: 'nok',           label: 'Next of Kin',  icon: Heart },
  { id: 'professionals', label: 'Professionals', icon: Briefcase },
]

export function ResidentForm({ action, homes, staff, defaultValues: d = {}, defaultProfessionals = [] }: ResidentFormProps) {
  const isEdit  = !!d.id
  const [step, setStep]     = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Form state — all fields
  const [firstName, setFirstName]           = useState(d.first_name ?? '')
  const [lastName, setLastName]             = useState(d.last_name ?? '')
  const [preferredName, setPreferredName]   = useState(d.preferred_name ?? '')
  const [dob, setDob]                       = useState(d.date_of_birth ?? '')
  const [gender, setGender]                 = useState(d.gender ?? '')
  const [pronouns, setPronouns]             = useState(d.pronouns ?? '')
  const [nationality, setNationality]       = useState(d.nationality ?? '')
  const [ethnicity, setEthnicity]           = useState(d.ethnicity ?? '')
  const [firstLanguage, setFirstLanguage]   = useState(d.first_language ?? '')
  const [religion, setReligion]             = useState(d.religion ?? '')

  const [homeId, setHomeId]                 = useState(d.home_id ?? '')
  const [roomNumber, setRoomNumber]         = useState(d.room_number ?? '')
  const [placementStart, setPlacementStart] = useState(d.placement_start_date ?? '')
  const [placementEnd, setPlacementEnd]     = useState(d.placement_end_date ?? '')
  const [placementType, setPlacementType]   = useState<string>(d.placement_type ?? 'supported_living')
  const [status, setStatus]                 = useState<string>(d.status ?? 'active')
  const [localAuthority, setLocalAuthority] = useState(d.local_authority ?? '')
  const [keyWorkerId, setKeyWorkerId]       = useState(d.key_worker_id ?? '')
  const [legalStatus, setLegalStatus]       = useState(d.legal_status ?? '')
  const [isAsylumSeeker, setIsAsylumSeeker] = useState(String(d.is_asylum_seeker ?? false))

  const [hasMentalCapacity, setHasMentalCapacity] = useState(String(d.has_mental_capacity ?? true))
  const [mcaDate, setMcaDate]               = useState(d.mca_assessment_date ?? '')
  const [nhsNumber, setNhsNumber]           = useState(d.nhs_number ?? '')
  const [gpName, setGpName]                 = useState(d.gp_name ?? '')
  const [gpPractice, setGpPractice]         = useState(d.gp_practice ?? '')
  const [gpPhone, setGpPhone]               = useState(d.gp_phone ?? '')
  const [gpAddress, setGpAddress]           = useState(d.gp_address ?? '')
  const [bloodType, setBloodType]           = useState(d.blood_type ?? '')
  const [allergies, setAllergies]           = useState(d.allergies?.join(', ') ?? '')
  const [medConditions, setMedConditions]   = useState(d.medical_conditions?.join('\n') ?? '')

  const [nokName, setNokName]               = useState(d.nok_name ?? '')
  const [nokRelationship, setNokRelationship] = useState(d.nok_relationship ?? '')
  const [nokPhone, setNokPhone]             = useState(d.nok_phone ?? '')
  const [nokEmail, setNokEmail]             = useState(d.nok_email ?? '')
  const [nokAddress, setNokAddress]         = useState(d.nok_address ?? '')
  const [nokIsEmergency, setNokIsEmergency] = useState(String(d.nok_is_emergency_contact ?? true))

  // Step 4: Professionals
  const swDefault    = defaultProfessionals.find(p => p.role === 'Social Worker')
  const paDefault    = defaultProfessionals.find(p => p.role === 'Personal Advisor')
  const otherDefault = defaultProfessionals.filter(p => p.role !== 'Social Worker' && p.role !== 'Personal Advisor')

  const [swName,  setSwName]  = useState(swDefault?.name  ?? '')
  const [swOrg,   setSwOrg]   = useState(swDefault?.org   ?? '')
  const [swPhone, setSwPhone] = useState(swDefault?.phone ?? '')
  const [swEmail, setSwEmail] = useState(swDefault?.email ?? '')

  const [paName,  setPaName]  = useState(paDefault?.name  ?? '')
  const [paOrg,   setPaOrg]   = useState(paDefault?.org   ?? '')
  const [paPhone, setPaPhone] = useState(paDefault?.phone ?? '')
  const [paEmail, setPaEmail] = useState(paDefault?.email ?? '')

  const [otherPros, setOtherPros] = useState<OtherPro[]>(
    otherDefault.length > 0 ? otherDefault : []
  )

  function addOtherPro() {
    setOtherPros(prev => [...prev, { role: '', name: '', org: '', phone: '', email: '' }])
  }
  function removeOtherPro(i: number) {
    setOtherPros(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateOtherPro(i: number, field: keyof OtherPro, value: string) {
    setOtherPros(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  // Step validation
  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!firstName.trim()) return 'First name is required.'
      if (!lastName.trim())  return 'Last name is required.'
      if (!dob)              return 'Date of birth is required.'
    }
    if (s === 1) {
      if (!homeId)           return 'Please select a property.'
      if (!placementStart)   return 'Placement start date is required.'
    }
    return null
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setError(null)
    setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)

    const fd = new FormData()
    const fields: Record<string, string> = {
      first_name: firstName.trim(), last_name: lastName.trim(),
      preferred_name: preferredName.trim(), date_of_birth: dob,
      gender: gender.trim(), pronouns: pronouns.trim(),
      nationality: nationality.trim(), ethnicity: ethnicity.trim(),
      first_language: firstLanguage.trim(), religion: religion.trim(),
      home_id: homeId, room_number: roomNumber.trim(),
      placement_start_date: placementStart, placement_end_date: placementEnd,
      placement_type: placementType, status,
      local_authority: localAuthority.trim(), key_worker_id: keyWorkerId,
      legal_status: legalStatus.trim(), is_asylum_seeker: isAsylumSeeker,
      has_mental_capacity: hasMentalCapacity, mca_assessment_date: mcaDate,
      nhs_number: nhsNumber.trim(), gp_name: gpName.trim(),
      gp_practice: gpPractice.trim(), gp_phone: gpPhone.trim(),
      gp_address: gpAddress.trim(), blood_type: bloodType,
      allergies: allergies.trim(), medical_conditions: medConditions.trim(),
      nok_name: nokName.trim(), nok_relationship: nokRelationship.trim(),
      nok_phone: nokPhone.trim(), nok_email: nokEmail.trim(),
      nok_address: nokAddress.trim(), nok_is_emergency_contact: nokIsEmergency,
      sw_name: swName.trim(), sw_org: swOrg.trim(), sw_phone: swPhone.trim(), sw_email: swEmail.trim(),
      pa_name: paName.trim(), pa_org: paOrg.trim(), pa_phone: paPhone.trim(), pa_email: paEmail.trim(),
    }
    for (const [k, v] of Object.entries(fields)) fd.set(k, v)
    fd.set('other_professionals', JSON.stringify(
      otherPros.filter(p => p.name.trim() || p.role.trim())
    ))

    const result = await action(null, fd)
    setSaving(false)
    if (result?.error) {
      setError(result.error)
    }
    // On success the action calls redirect() server-side, navigation happens automatically
  }

  const stepEl = STEPS[step]

  return (
    <div>
      {/* Step progress */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const done    = i < step
            const current = i === step
            const StepIcon = s.icon
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => { if (i < step) { setError(null); setStep(i) } }}
                  className={`flex items-center gap-2 shrink-0 ${i < step ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    done    ? 'bg-purple-600 text-white' :
                    current ? 'bg-purple-700 text-white ring-4 ring-purple-100' :
                              'bg-slate-200 text-slate-400'
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${current ? 'text-purple-700' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-purple-400' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── STEP 0: Personal details ─────────────────────────────── */}
        {step === 0 && (
          <div className="space-y-5">
            <StepHeader icon={<User className="h-5 w-5" />} title="Personal details" desc="Basic identity information about this resident." />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Jordan" autoFocus />
              </Field>
              <Field label="Last name" required>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Ahmed" />
              </Field>
              <Field label="Preferred name" hint="What they like to be called">
                <Input value={preferredName} onChange={e => setPreferredName(e.target.value)} placeholder="e.g. Jay" />
              </Field>
              <Field label="Date of birth" required>
                <Input type="date" value={dob} onChange={e => setDob(e.target.value)} max={new Date().toISOString().slice(0,10)} />
              </Field>
              <Field label="Gender">
                <Input value={gender} onChange={e => setGender(e.target.value)} placeholder="e.g. Male, Female, Non-binary" />
              </Field>
              <Field label="Pronouns">
                <Input value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="e.g. he/him, she/her, they/them" />
              </Field>
              <Field label="Nationality">
                <Input value={nationality} onChange={e => setNationality(e.target.value)} />
              </Field>
              <Field label="Ethnicity">
                <Input value={ethnicity} onChange={e => setEthnicity(e.target.value)} />
              </Field>
              <Field label="First language">
                <Input value={firstLanguage} onChange={e => setFirstLanguage(e.target.value)} />
              </Field>
              <Field label="Religion / belief">
                <Input value={religion} onChange={e => setReligion(e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 1: Placement ──────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <StepHeader icon={<Home className="h-5 w-5" />} title="Placement details" desc="Where this resident is placed and under what arrangements." />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Property" required>
                <Select value={homeId} onChange={e => setHomeId(e.target.value)} required>
                  <option value="">Select property…</option>
                  {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </Select>
              </Field>
              <Field label="Room number">
                <Input value={roomNumber} onChange={e => setRoomNumber(e.target.value)} placeholder="e.g. 3A" />
              </Field>
              <Field label="Placement start date" required>
                <Input type="date" value={placementStart} onChange={e => setPlacementStart(e.target.value)} />
              </Field>
              <Field label="Placement end date" hint="Leave blank if ongoing">
                <Input type="date" value={placementEnd} onChange={e => setPlacementEnd(e.target.value)} />
              </Field>
              <Field label="Placement type">
                <Select value={placementType} onChange={e => setPlacementType(e.target.value)}>
                  <option value="supported_living">Supported Living</option>
                  <option value="semi_independent">Semi-Independent</option>
                  <option value="emergency">Emergency</option>
                  <option value="respite">Respite</option>
                </Select>
              </Field>
              <Field label="Current status">
                <Select value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="hospital">Hospital</option>
                  <option value="missing">Missing</option>
                  <option value="discharged">Discharged</option>
                </Select>
              </Field>
              <Field label="Key worker">
                <Select value={keyWorkerId} onChange={e => setKeyWorkerId(e.target.value)}>
                  <option value="">Not assigned</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </Select>
              </Field>
              <Field label="Local authority">
                <Input value={localAuthority} onChange={e => setLocalAuthority(e.target.value)} placeholder="e.g. Leeds City Council" />
              </Field>
            </div>

            <div className="border-t border-slate-200 pt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Legal status" hint="e.g. Section 20, Looked After Child, Care Leaver">
                <Input value={legalStatus} onChange={e => setLegalStatus(e.target.value)} />
              </Field>
              <Field label="Unaccompanied asylum seeker (UASC)">
                <Select value={isAsylumSeeker} onChange={e => setIsAsylumSeeker(e.target.value)}>
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 2: Medical ────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-5">
            <StepHeader icon={<Stethoscope className="h-5 w-5" />} title="Medical information" desc="Health details, GP registration, and Mental Capacity Act status." />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mental capacity (MCA 2005)" hint="If 'No', a DoLS authorisation may be required">
                <Select value={hasMentalCapacity} onChange={e => setHasMentalCapacity(e.target.value)}>
                  <option value="true">Yes — has capacity</option>
                  <option value="false">No — DoLS may apply</option>
                </Select>
              </Field>
              <Field label="MCA assessment date">
                <Input type="date" value={mcaDate} onChange={e => setMcaDate(e.target.value)} />
              </Field>
            </div>

            <div className="border-t border-slate-200 pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">GP &amp; NHS Details</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="NHS number">
                  <Input value={nhsNumber} onChange={e => setNhsNumber(e.target.value)} placeholder="000 000 0000" />
                </Field>
                <Field label="Blood type">
                  <Select value={bloodType} onChange={e => setBloodType(e.target.value)}>
                    <option value="">Unknown</option>
                    {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="GP name">
                  <Input value={gpName} onChange={e => setGpName(e.target.value)} placeholder="Dr. Smith" />
                </Field>
                <Field label="GP practice">
                  <Input value={gpPractice} onChange={e => setGpPractice(e.target.value)} placeholder="Leeds Road Surgery" />
                </Field>
                <Field label="GP phone">
                  <Input type="tel" value={gpPhone} onChange={e => setGpPhone(e.target.value)} />
                </Field>
                <Field label="GP address">
                  <Input value={gpAddress} onChange={e => setGpAddress(e.target.value)} />
                </Field>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-5 grid gap-4 sm:grid-cols-1">
              <Field label="Known allergies" hint="Comma-separated (e.g. Penicillin, Latex, Nuts)">
                <Input value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Latex" />
              </Field>
              <Field label="Medical conditions" hint="One per line">
                <Textarea value={medConditions} onChange={e => setMedConditions(e.target.value)} placeholder={"e.g. Type 1 Diabetes\nAnxiety disorder"} rows={3} />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 3: Next of Kin ────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-5">
            <StepHeader icon={<Heart className="h-5 w-5" />} title="Next of kin" desc="Primary family contact and emergency contact information." />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={nokName} onChange={e => setNokName(e.target.value)} placeholder="e.g. Sarah Ahmed" />
              </Field>
              <Field label="Relationship">
                <Input value={nokRelationship} onChange={e => setNokRelationship(e.target.value)} placeholder="e.g. Mother, Older brother" />
              </Field>
              <Field label="Phone number">
                <Input type="tel" value={nokPhone} onChange={e => setNokPhone(e.target.value)} />
              </Field>
              <Field label="Email address">
                <Input type="email" value={nokEmail} onChange={e => setNokEmail(e.target.value)} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={nokAddress} onChange={e => setNokAddress(e.target.value)} />
              </Field>
              <Field label="Use as emergency contact?">
                <Select value={nokIsEmergency} onChange={e => setNokIsEmergency(e.target.value)}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </Field>
            </div>

            </div>
        )}

        {/* ── STEP 4: Professionals ──────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            <StepHeader icon={<Briefcase className="h-5 w-5" />} title="Professionals" desc="Social worker, personal advisor, and other professionals involved with this resident." />

            {/* Social Worker */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Social Worker</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input value={swName} onChange={e => setSwName(e.target.value)} placeholder="e.g. Emma Clarke" />
                </Field>
                <Field label="Organisation">
                  <Input value={swOrg} onChange={e => setSwOrg(e.target.value)} placeholder="e.g. Leeds City Council" />
                </Field>
                <Field label="Phone">
                  <Input type="tel" value={swPhone} onChange={e => setSwPhone(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={swEmail} onChange={e => setSwEmail(e.target.value)} />
                </Field>
              </div>
            </div>

            {/* Personal Advisor */}
            <div className="border-t border-slate-200 pt-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Personal Advisor</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <Input value={paName} onChange={e => setPaName(e.target.value)} placeholder="e.g. James Osei" />
                </Field>
                <Field label="Organisation">
                  <Input value={paOrg} onChange={e => setPaOrg(e.target.value)} placeholder="e.g. Leaving Care Team" />
                </Field>
                <Field label="Phone">
                  <Input type="tel" value={paPhone} onChange={e => setPaPhone(e.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={paEmail} onChange={e => setPaEmail(e.target.value)} />
                </Field>
              </div>
            </div>

            {/* Other professionals */}
            <div className="border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Other professionals</p>
                <button
                  type="button"
                  onClick={addOtherPro}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900"
                >
                  <Plus className="h-3.5 w-3.5" /> Add professional
                </button>
              </div>

              {otherPros.length === 0 && (
                <p className="text-sm text-slate-400 italic">No other professionals added yet.</p>
              )}

              <div className="space-y-4">
                {otherPros.map((pro, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Professional {i + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeOtherPro(i)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Role / title" required>
                        <Input value={pro.role} onChange={e => updateOtherPro(i, 'role', e.target.value)} placeholder="e.g. IRO, CAMHS Worker, Probation Officer" />
                      </Field>
                      <Field label="Full name">
                        <Input value={pro.name} onChange={e => updateOtherPro(i, 'name', e.target.value)} />
                      </Field>
                      <Field label="Organisation">
                        <Input value={pro.org} onChange={e => updateOtherPro(i, 'org', e.target.value)} />
                      </Field>
                      <Field label="Phone">
                        <Input type="tel" value={pro.phone} onChange={e => updateOtherPro(i, 'phone', e.target.value)} />
                      </Field>
                      <Field label="Email" className="sm:col-span-2">
                        <Input type="email" value={pro.email} onChange={e => updateOtherPro(i, 'email', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary before submit */}
            <div className="mt-2 rounded-xl bg-purple-50 border border-purple-200 p-4 text-sm space-y-1">
              <p className="font-semibold text-purple-900 mb-2">Ready to save</p>
              <SummaryRow label="Name"     value={`${firstName} ${lastName}${preferredName ? ` (${preferredName})` : ''}`} />
              <SummaryRow label="DOB"      value={dob ? new Date(dob).toLocaleDateString('en-GB') : '—'} />
              <SummaryRow label="Property" value={homes.find(h => h.id === homeId)?.name ?? '—'} />
              <SummaryRow label="Type"     value={placementType.replace(/_/g, ' ')} />
              <SummaryRow label="Key worker" value={staff.find(s => s.id === keyWorkerId)?.full_name ?? 'Not assigned'} />
              {nokName && <SummaryRow label="NOK" value={`${nokName} (${nokRelationship || '?'})`} />}
              {swName && <SummaryRow label="Social Worker" value={swName} />}
              {paName && <SummaryRow label="Personal Advisor" value={paName} />}
              {otherPros.filter(p => p.name || p.role).length > 0 && (
                <SummaryRow label="Other" value={`${otherPros.filter(p => p.name || p.role).length} professional(s)`} />
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between pt-5 border-t border-slate-200">
          <div>
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Step {step + 1} of {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} className="bg-purple-700 hover:bg-purple-800">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={saving} className="bg-purple-700 hover:bg-purple-800">
                {saving
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
                  : isEdit ? 'Save changes' : 'Create resident'
                }
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function StepHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-2">
      <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function Field({
  label, required, hint, className, children,
}: {
  label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-purple-600 w-24 shrink-0 text-xs uppercase tracking-wide font-medium">{label}</span>
      <span className="text-slate-800 font-medium capitalize">{value}</span>
    </div>
  )
}
