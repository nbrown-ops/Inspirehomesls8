'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Phone, Mail, User, Building2,
  Heart, AlertTriangle, FileText, Users, CalendarDays,
  ShieldAlert,
} from 'lucide-react'
import { Tabs, TabList, Tab, TabPanel } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { TimelineFeed } from '@/components/timeline/TimelineFeed'
import { ProfessionalMessagesPanel } from '@/components/external/ProfessionalMessagesPanel'
import { formatDate } from '@/lib/utils/dates'
import { flagSafeguardingAction } from '@/app/(portal)/residents/actions'
import type { ServiceUser, Profile, Home } from '@/types'
import type { TimelineEntryData } from '@/components/timeline/TimelineEntry'
import type { ProfessionalNote, MeetingRequest } from '@/components/external/ProfessionalMessagesPanel'

type Professional = {
  id: string
  role: string
  is_primary: boolean
  external_name: string | null
  external_email: string | null
  external_phone: string | null
  external_org: string | null
  profile: Pick<Profile, 'id' | 'full_name' | 'preferred_name' | 'phone' | 'email' | 'photo_url'> | null
}


interface ProfileTabsProps {
  resident: ServiceUser
  keyWorker: Pick<Profile, 'id' | 'full_name' | 'preferred_name' | 'phone' | 'email' | 'photo_url' | 'job_title'> | null
  home: Pick<Home, 'id' | 'name' | 'address' | 'city' | 'postcode' | 'phone'>
  professionals: Professional[]
  timeline: TimelineEntryData[]
  professionalNotes: ProfessionalNote[]
  meetingRequests: MeetingRequest[]
  canEdit: boolean
  unreadNotesCount: number
}

export function ProfileTabs({ resident, keyWorker, home, professionals, timeline, professionalNotes, meetingRequests, canEdit, unreadNotesCount }: ProfileTabsProps) {
  const [safeguardingOpen, setSafeguardingOpen] = useState(false)
  const [reason, setReason]     = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [flagError, setFlagError]   = useState<string | null>(null)
  const [flagged, setFlagged]       = useState(false)

  async function handleSafeguarding() {
    if (!reason.trim()) return
    setSubmitting(true)
    setFlagError(null)
    const result = await flagSafeguardingAction(resident.id, resident.home_id, reason)
    setSubmitting(false)
    if (result?.error) {
      setFlagError(result.error)
    } else {
      setFlagged(true)
      setSafeguardingOpen(false)
      setReason('')
    }
  }

  const socialWorker = professionals.find(p => /social.?worker/i.test(p.role))
  const iro          = professionals.find(p => /\biro\b|reviewing.?officer/i.test(p.role))

  return (
    <>
      {/* Safeguarding flag button */}
      <div className="flex justify-end mb-4">
        {flagged && (
          <Badge variant="danger" className="mr-3 self-center">
            <ShieldAlert className="h-3 w-3 mr-1" />
            Safeguarding alert raised
          </Badge>
        )}
        <Button
          variant="danger"
          onClick={() => setSafeguardingOpen(true)}
          className="gap-2"
        >
          <ShieldAlert className="h-4 w-4" />
          Flag for safeguarding
        </Button>
      </div>

      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="support-plan">Support Plan</Tab>
          <Tab id="risk">Risk Assessment</Tab>
          <Tab id="documents">Documents</Tab>
          <Tab id="timeline">Timeline</Tab>
          <Tab id="contacts">Contacts</Tab>
          <Tab id="meetings">Meetings</Tab>
          <Tab id="professionals">
            Professional Messages
            {unreadNotesCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-xs font-bold leading-none">
                {unreadNotesCount}
              </span>
            )}
          </Tab>
        </TabList>

        {/* ── OVERVIEW ─────────────────────────────────── */}
        <TabPanel id="overview">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Placement */}
            <InfoSection title="Placement" icon={<Building2 className="h-4 w-4" />}>
              <InfoRow label="Property" value={home.name} />
              <InfoRow label="Address" value={`${home.address}, ${home.city}, ${home.postcode}`} />
              <InfoRow label="Room" value={resident.room_number} />
              <InfoRow label="Placement type" value={resident.placement_type.replace(/_/g, ' ')} />
              <InfoRow label="Start date" value={formatDate(resident.placement_start_date)} />
              {resident.placement_end_date && (
                <InfoRow label="End date" value={formatDate(resident.placement_end_date)} />
              )}
              <InfoRow label="Local authority" value={resident.local_authority} />
              <InfoRow label="Legal status" value={resident.legal_status} />
            </InfoSection>

            {/* Key worker */}
            <InfoSection title="Key Worker" icon={<User className="h-4 w-4" />}>
              {keyWorker ? (
                <>
                  <InfoRow label="Name" value={keyWorker.full_name} />
                  <InfoRow label="Role" value={(keyWorker as { job_title?: string | null }).job_title} />
                  <InfoRow label="Phone" value={keyWorker.phone} />
                  <InfoRow label="Email" value={keyWorker.email} />
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">No key worker assigned</p>
              )}
            </InfoSection>

            {/* GP / Medical */}
            <InfoSection title="GP & Medical" icon={<Heart className="h-4 w-4" />}>
              <InfoRow label="GP name" value={resident.gp_name} />
              <InfoRow label="Practice" value={resident.gp_practice} />
              <InfoRow label="GP phone" value={resident.gp_phone} />
              <InfoRow label="GP address" value={resident.gp_address} />
              <InfoRow label="NHS number" value={resident.nhs_number} />
              <InfoRow label="Blood type" value={resident.blood_type} />
              {resident.allergies && resident.allergies.length > 0 && (
                <div className="flex gap-1.5 flex-wrap py-2 border-b border-slate-100">
                  <span className="text-xs text-slate-500 w-28 shrink-0 pt-0.5">Allergies</span>
                  <div className="flex flex-wrap gap-1">
                    {resident.allergies.map(a => (
                      <Badge key={a} variant="danger">{a}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {resident.medical_conditions && resident.medical_conditions.length > 0 && (
                <div className="py-2">
                  <span className="text-xs text-slate-500 block mb-1">Medical conditions</span>
                  <ul className="text-sm text-slate-700 space-y-0.5 ml-1">
                    {resident.medical_conditions.map(c => (
                      <li key={c} className="flex items-start gap-1.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </InfoSection>

            {/* Next of kin */}
            <InfoSection title="Next of Kin" icon={<Users className="h-4 w-4" />}>
              {resident.nok_name ? (
                <>
                  <InfoRow label="Name" value={resident.nok_name} />
                  <InfoRow label="Relationship" value={resident.nok_relationship} />
                  <InfoRow label="Phone" value={resident.nok_phone} />
                  <InfoRow label="Email" value={resident.nok_email} />
                  <InfoRow label="Address" value={resident.nok_address} />
                  {resident.nok_is_emergency_contact && (
                    <p className="text-xs text-green-600 font-medium mt-1">Emergency contact</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">No next of kin recorded</p>
              )}
            </InfoSection>

            {/* Social worker + IRO */}
            {(socialWorker || iro) && (
              <InfoSection title="Allocated Professionals" icon={<CalendarDays className="h-4 w-4" />}>
                {socialWorker && (
                  <>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1 mb-1">Social Worker</p>
                    <ProfessionalRow professional={socialWorker} />
                  </>
                )}
                {iro && (
                  <>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-2 mb-1">IRO</p>
                    <ProfessionalRow professional={iro} />
                  </>
                )}
              </InfoSection>
            )}

            {/* Mental capacity */}
            <InfoSection title="Mental Capacity" icon={<AlertTriangle className="h-4 w-4" />}>
              <InfoRow
                label="Has mental capacity"
                value={resident.has_mental_capacity ? 'Yes' : 'No — DoLS may apply'}
              />
              {resident.mca_assessment_date && (
                <InfoRow label="Last assessed" value={formatDate(resident.mca_assessment_date)} />
              )}
            </InfoSection>
          </div>
        </TabPanel>

        {/* ── SUPPORT PLAN ─────────────────────────────── */}
        <TabPanel id="support-plan">
          <ModuleLink
            href={`/care-plans?resident=${resident.id}&type=support`}
            label="View Support Plans"
            description="Manage person-centred support plans and goals in the Care Plans module."
          />
        </TabPanel>

        {/* ── RISK ASSESSMENT ──────────────────────────── */}
        <TabPanel id="risk">
          <ModuleLink
            href={`/care-plans?resident=${resident.id}&type=risk`}
            label="View Risk Assessments"
            description="Manage risk assessments and safety plans in the Care Plans module."
          />
        </TabPanel>

        {/* ── DOCUMENTS ────────────────────────────────── */}
        <TabPanel id="documents">
          <ModuleLink
            href={`/documents?resident=${resident.id}`}
            label="View Documents"
            description="Referral packs, pathway plans, court orders, and other linked documents."
          />
        </TabPanel>

        {/* ── TIMELINE ─────────────────────────────────── */}
        <TabPanel id="timeline">
          <TimelineFeed
            serviceUserId={resident.id}
            initialEntries={timeline}
          />
        </TabPanel>

        {/* ── CONTACTS ─────────────────────────────────── */}
        <TabPanel id="contacts">
          {professionals.length === 0 ? (
            <p className="text-sm text-slate-400 italic">No professionals linked to this resident.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {professionals.map(p => (
                <div key={p.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    {p.profile?.photo_url ? (
                      <img
                        src={p.profile.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold shrink-0 text-sm">
                        {(p.profile?.full_name ?? p.external_name ?? '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm">
                        {p.profile?.full_name ?? p.external_name ?? '—'}
                      </p>
                      <p className="text-xs text-slate-500">{p.role}</p>
                      {p.external_org && (
                        <p className="text-xs text-slate-400">{p.external_org}</p>
                      )}
                      {p.is_primary && (
                        <Badge variant="primary" className="mt-1">Primary</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {(p.profile?.phone ?? p.external_phone) && (
                      <a
                        href={`tel:${p.profile?.phone ?? p.external_phone}`}
                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-purple-700"
                      >
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {p.profile?.phone ?? p.external_phone}
                      </a>
                    )}
                    {(p.profile?.email ?? p.external_email) && (
                      <a
                        href={`mailto:${p.profile?.email ?? p.external_email}`}
                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-purple-700"
                      >
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {p.profile?.email ?? p.external_email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        {/* ── MEETINGS ─────────────────────────────────── */}
        <TabPanel id="meetings">
          <ModuleLink
            href={`/meetings?resident=${resident.id}`}
            label="View Meetings"
            description="LAC reviews, pathway planning, key work sessions, and professionals meetings."
          />
        </TabPanel>

        {/* ── PROFESSIONAL MESSAGES ─────────────────────── */}
        <TabPanel id="professionals">
          <ProfessionalMessagesPanel
            notes={professionalNotes}
            requests={meetingRequests}
            serviceUserId={resident.id}
          />
        </TabPanel>
      </Tabs>

      {/* Safeguarding modal */}
      <Modal
        open={safeguardingOpen}
        onClose={() => setSafeguardingOpen(false)}
        title="Flag for safeguarding"
        description="This will create a safeguarding alert and notify the property manager."
      >
        <div className="space-y-4">
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Only use this for genuine safeguarding concerns. All flags are logged with your name
              and timestamp and cannot be deleted.
            </p>
          </div>

          {flagError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {flagError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Describe the concern <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Describe the safeguarding concern in detail…"
              rows={5}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setSafeguardingOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={submitting}
              disabled={!reason.trim()}
              onClick={() => void handleSafeguarding()}
            >
              Raise safeguarding alert
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoSection({
  title,
  icon,
  children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-500">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-5 py-2 divide-y divide-slate-100">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex gap-3 py-2 text-sm">
      <span className="text-slate-500 w-28 shrink-0">{label}</span>
      <span className="text-slate-900">{value}</span>
    </div>
  )
}

function ProfessionalRow({ professional: p }: { professional: Professional }) {
  const name  = p.profile?.full_name ?? p.external_name
  const phone = p.profile?.phone ?? p.external_phone
  const email = p.profile?.email ?? p.external_email
  return (
    <div className="text-sm space-y-0.5">
      <p className="font-medium text-slate-800">{name}</p>
      {p.external_org && <p className="text-xs text-slate-500">{p.external_org}</p>}
      {phone && (
        <a href={`tel:${phone}`} className="text-xs text-slate-500 flex items-center gap-1 hover:text-purple-700">
          <Phone className="h-3 w-3" />{phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="text-xs text-slate-500 flex items-center gap-1 hover:text-purple-700">
          <Mail className="h-3 w-3" />{email}
        </a>
      )}
    </div>
  )
}

function ModuleLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <div className="text-center py-10">
      <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
      <p className="text-sm text-slate-500 mb-4">{description}</p>
      <Button asChild variant="secondary">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  )
}
