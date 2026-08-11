'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FolderOpen, FileText, Lock, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { formatDate, formatTimeAgo } from '@/lib/utils/dates'
import { UploadDocumentModal } from '@/components/documents/UploadDocumentModal'

const DOC_TYPE_LABELS: Record<string, string> = {
  referral_pack:          'Referral Pack',
  care_plan:              'Care Plan',
  risk_assessment:        'Risk Assessment',
  pathway_plan:           'Pathway Plan',
  court_order:            'Court Order',
  placement_agreement:    'Placement Agreement',
  health_assessment:      'Health Assessment',
  education_plan:         'Education Plan',
  dbs_certificate:        'DBS Certificate',
  training_certificate:   'Training Certificate',
  id_document:            'ID Document',
  correspondence:         'Correspondence',
  photo_id:               'Photo ID',
  other:                  'Other',
}

interface DocRow {
  id: string
  title: string
  document_type: string
  file_name: string
  file_url: string
  file_size: number | null
  is_confidential: boolean
  created_at: string
  expiry_date: string | null
  service_user: { id: string; first_name: string; last_name: string } | null
  uploader: { full_name: string } | null
}

interface Resident { id: string; first_name: string; last_name: string }

export default function DocumentsPage() {
  const supabase = createClient()

  const [documents, setDocuments] = useState<DocRow[]>([])
  const [residents, setResidents] = useState<Resident[]>([])
  const [homeId, setHomeId]       = useState<string>('')
  const [canWrite, setCanWrite]   = useState(false)
  const [loading, setLoading]     = useState(true)

  const loadDocuments = useCallback(async () => {
    const { data } = await supabase
      .from('documents')
      .select(`
        id, title, document_type, file_name, file_url, file_size, is_confidential,
        created_at, expiry_date,
        service_user:service_users!service_user_id(id, first_name, last_name),
        uploader:profiles!uploaded_by(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(200)
    setDocuments((data as unknown as DocRow[]) ?? [])
  }, [supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profile }, { data: assignment }, { data: res }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('user_home_assignments').select('home_id').eq('user_id', user.id).limit(1).single(),
        supabase.from('service_users').select('id, first_name, last_name').eq('status', 'active').order('last_name'),
      ])

      if (profile) setCanWrite(['super_admin', 'manager', 'staff'].includes(profile.role))
      if (assignment) setHomeId(assignment.home_id)
      setResidents((res as unknown as Resident[]) ?? [])

      await loadDocuments()
      setLoading(false)
    }
    init()
  }, [supabase, loadDocuments])

  // Group by type
  const byType = new Map<string, DocRow[]>()
  for (const doc of documents) {
    if (!byType.has(doc.document_type)) byType.set(doc.document_type, [])
    byType.get(doc.document_type)!.push(doc)
  }

  const expiringSoon = documents.filter(d => {
    if (!d.expiry_date) return false
    const days = (new Date(d.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return days >= 0 && days <= 30
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="mt-1 text-sm text-slate-500">
            {documents.length} documents &middot; {expiringSoon.length} expiring within 30 days
          </p>
        </div>
        {canWrite && homeId && (
          <UploadDocumentModal
            homeId={homeId}
            residents={residents}
            onUploaded={loadDocuments}
          />
        )}
      </div>

      {/* Expiring soon banner */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Documents expiring within 30 days</p>
          {expiringSoon.map(doc => (
            <div key={doc.id} className="flex items-center justify-between text-sm gap-4">
              <span className="text-amber-900 truncate">{doc.title}</span>
              <span className="text-amber-600 shrink-0 text-xs">
                {doc.service_user ? `${doc.service_user.first_name} ${doc.service_user.last_name} · ` : ''}
                Expires {formatDate(doc.expiry_date!)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Documents by type */}
      {byType.size === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents uploaded yet</p>
          {canWrite && (
            <p className="text-sm mt-1">Use the &ldquo;Upload document&rdquo; button to add one.</p>
          )}
        </div>
      ) : (
        Array.from(byType.entries()).map(([type, docs]) => (
          <section key={type}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
              {DOC_TYPE_LABELS[type] ?? type} ({docs.length})
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <div key={doc.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        {doc.is_confidential
                          ? <Lock className="h-4 w-4 text-slate-400" />
                          : <FileText className="h-4 w-4 text-slate-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{doc.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {doc.service_user ? (
                            <Link href={`/residents/${doc.service_user.id}`} className="hover:text-purple-600">
                              {doc.service_user.first_name} {doc.service_user.last_name}
                            </Link>
                          ) : 'Home-level'}
                          {doc.uploader ? ` · ${doc.uploader.full_name}` : ''}
                          {' · '}{formatTimeAgo(doc.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {doc.is_confidential && (
                        <Badge variant="warning">Confidential</Badge>
                      )}
                      {doc.expiry_date && (
                        <span className="text-xs text-slate-400">Expires {formatDate(doc.expiry_date)}</span>
                      )}
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))
      )}
    </div>
  )
}
