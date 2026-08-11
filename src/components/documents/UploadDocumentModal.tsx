'use client'

import { useState, useRef, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { Upload, Loader2, FileText } from 'lucide-react'

const DOC_TYPES = [
  { value: 'referral_pack',        label: 'Referral Pack' },
  { value: 'care_plan',            label: 'Care Plan' },
  { value: 'risk_assessment',      label: 'Risk Assessment' },
  { value: 'pathway_plan',         label: 'Pathway Plan' },
  { value: 'court_order',          label: 'Court Order' },
  { value: 'placement_agreement',  label: 'Placement Agreement' },
  { value: 'health_assessment',    label: 'Health Assessment' },
  { value: 'education_plan',       label: 'Education Plan' },
  { value: 'dbs_certificate',      label: 'DBS Certificate' },
  { value: 'training_certificate', label: 'Training Certificate' },
  { value: 'id_document',          label: 'ID Document' },
  { value: 'correspondence',       label: 'Correspondence' },
  { value: 'photo_id',             label: 'Photo ID' },
  { value: 'other',                label: 'Other' },
]

interface Resident { id: string; first_name: string; last_name: string }

interface Props {
  homeId: string
  residents: Resident[]
  onUploaded: () => void
}

export function UploadDocumentModal({ homeId, residents, onUploaded }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle]             = useState('')
  const [docType, setDocType]         = useState('other')
  const [residentId, setResidentId]   = useState('')
  const [expiryDate, setExpiryDate]   = useState('')
  const [isConfidential, setIsConfidential] = useState(false)
  const [file, setFile]               = useState<File | null>(null)
  const [error, setError]             = useState<string | null>(null)

  function handleOpen() {
    setTitle(''); setDocType('other'); setResidentId('')
    setExpiryDate(''); setIsConfidential(false); setFile(null); setError(null)
    setOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !title) setTitle(f.name.replace(/\.[^/.]+$/, ''))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    if (!title.trim()) { setError('Title is required.'); return }
    setError(null)

    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not authenticated.'); return }

      // Upload to Supabase Storage
      const ext        = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${homeId}/${crypto.randomUUID()}.${ext}`

      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { contentType: file.type || 'application/octet-stream' })

      if (storageError) { setError(`Upload failed: ${storageError.message}`); return }

      // Get a signed URL (valid 10 years — refreshed on access)
      const { data: signedData } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10)

      const fileUrl = signedData?.signedUrl ?? storagePath

      const { error: dbError } = await supabase.from('documents').insert({
        home_id:        homeId,
        service_user_id: residentId || null,
        document_type:  docType,
        title:          title.trim(),
        file_url:       fileUrl,
        file_name:      file.name,
        file_size:      file.size,
        mime_type:      file.type || null,
        expiry_date:    expiryDate || null,
        is_confidential: isConfidential,
        uploaded_by:    user.id,
      })

      if (dbError) {
        // Clean up orphaned storage file
        await supabase.storage.from('documents').remove([storagePath])
        setError(dbError.message)
        return
      }

      setOpen(false)
      onUploaded()
    })
  }

  return (
    <>
      <Button onClick={handleOpen} className="bg-purple-700 hover:bg-purple-800">
        <Upload className="h-4 w-4" />
        Upload document
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Upload Document">
        <form onSubmit={handleSubmit} className="space-y-4 mt-1">

          {/* File picker */}
          <div>
            <Label>File *</Label>
            <div
              className="mt-1.5 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:border-purple-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                  <FileText className="h-5 w-5 text-purple-600 shrink-0" />
                  <span className="font-medium truncate max-w-xs">{file.name}</span>
                  <span className="text-slate-400 shrink-0">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div className="text-sm text-slate-400">
                  <Upload className="h-6 w-6 mx-auto mb-2 opacity-40" />
                  Click to select a file
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.heic"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="docTitle">Title *</Label>
            <Input
              id="docTitle"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Safeguarding Risk Assessment"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="docType">Document type *</Label>
              <select
                id="docType"
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {DOC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="docExpiry">Expiry date (if applicable)</Label>
              <Input
                id="docExpiry"
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="docResident">Link to resident (optional)</Label>
            <select
              id="docResident"
              value={residentId}
              onChange={e => setResidentId(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="">Home-level document (no resident)</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.last_name}, {r.first_name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isConfidential}
              onChange={e => setIsConfidential(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-slate-700">Mark as confidential (managers only)</span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={isPending} className="bg-purple-700 hover:bg-purple-800">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upload'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
