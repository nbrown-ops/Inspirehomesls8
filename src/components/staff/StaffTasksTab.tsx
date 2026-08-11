'use client'

import { useState, useTransition } from 'react'
import { Plus, CheckCircle2, Clock, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { formatDate, formatTimeAgo } from '@/lib/utils/dates'
import { createTaskAction, completeTaskAction, cancelTaskAction } from './taskActions'

const PRIORITY_STYLE: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-100',
  normal: 'bg-blue-50 text-blue-600 border-blue-100',
  low:    'bg-slate-100 text-slate-500 border-slate-200',
}
const PRIORITY_LABEL: Record<string, string> = {
  urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low',
}

export type TaskRow = {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  created_at: string
  completed_at: string | null
  completion_note: string | null
  assigned_by: { full_name: string } | null
  completed_by: { full_name: string } | null
}

interface Props {
  staffId: string
  staffName: string
  tasks: TaskRow[]
  homeId: string
  canManage: boolean   // manager/super_admin
  isSelf: boolean      // viewing own profile
}

export function StaffTasksTab({ staffId, staffName, tasks, homeId, canManage, isSelf }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm]   = useState(false)
  const [signOffId, setSignOffId] = useState<string | null>(null)
  const [cancelId, setCancelId]   = useState<string | null>(null)
  const [signOffNote, setSignOffNote] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [optimisticTasks, setOptimisticTasks] = useState<TaskRow[]>(tasks)

  // New task form state
  const [title, setTitle]         = useState('')
  const [desc, setDesc]           = useState('')
  const [priority, setPriority]   = useState('normal')
  const [dueDate, setDueDate]     = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const pending   = optimisticTasks.filter(t => t.status === 'pending')
  const inProg    = optimisticTasks.filter(t => t.status === 'in_progress')
  const completed = optimisticTasks.filter(t => t.status === 'completed')
  const cancelled = optimisticTasks.filter(t => t.status === 'cancelled')

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setFormError('Title is required.'); return }
    setFormError(null)

    const fd = new FormData()
    fd.set('title',       title.trim())
    fd.set('description', desc.trim())
    fd.set('priority',    priority)
    fd.set('due_date',    dueDate)
    fd.set('assigned_to', staffId)
    fd.set('home_id',     homeId)

    startTransition(async () => {
      const result = await createTaskAction(null, fd)
      if (result.error) { setFormError(result.error); return }
      if (result.task) {
        setOptimisticTasks(prev => [result.task as unknown as TaskRow, ...prev])
        setTitle(''); setDesc(''); setPriority('normal'); setDueDate('')
        setShowForm(false)
      }
    })
  }

  function handleComplete(taskId: string) {
    const fd = new FormData()
    fd.set('task_id',         taskId)
    fd.set('completion_note', signOffNote.trim())

    startTransition(async () => {
      const result = await completeTaskAction(fd)
      if (result.error) { alert(result.error); return }
      setOptimisticTasks(prev => prev.map(t =>
        t.id === taskId
          ? { ...t, status: 'completed', completed_at: new Date().toISOString(), completion_note: signOffNote || null }
          : t
      ))
      setSignOffId(null)
      setSignOffNote('')
    })
  }

  function handleCancel(taskId: string) {
    const fd = new FormData()
    fd.set('task_id',       taskId)
    fd.set('cancel_reason', cancelReason.trim())

    startTransition(async () => {
      const result = await cancelTaskAction(fd)
      if (result.error) { alert(result.error); return }
      setOptimisticTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'cancelled' } : t
      ))
      setCancelId(null)
      setCancelReason('')
    })
  }

  return (
    <div className="space-y-5">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {pending.length + inProg.length} open &middot; {completed.length} completed
          </p>
        </div>
        {canManage && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(v => !v)}
          >
            <Plus className="h-4 w-4" />
            Assign task
          </Button>
        )}
      </div>

      {/* New task form */}
      {showForm && canManage && (
        <form onSubmit={handleCreate} className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-purple-900">New task for {staffName}</p>

          <div>
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Complete mandatory fire safety training"
              required
            />
          </div>

          <div>
            <Label htmlFor="task-desc">Details (optional)</Label>
            <Textarea
              id="task-desc"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Any additional context or instructions..."
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-priority">Priority</Label>
              <select
                id="task-priority"
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <Label htmlFor="task-due">Due date (optional)</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-600">{formError}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="bg-purple-700 hover:bg-purple-800">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Assign task'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Open tasks */}
      {(pending.length > 0 || inProg.length > 0) && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Open tasks</h3>
          <div className="space-y-2">
            {[...inProg, ...pending].map(task => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed'
              const isSigningOff = signOffId === task.id
              const isCancelling = cancelId === task.id

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-xl border p-4 space-y-3 ${isOverdue ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[task.priority]}`}>
                          {PRIORITY_LABEL[task.priority]}
                        </span>
                        {isOverdue && (
                          <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Overdue
                          </span>
                        )}
                        {task.due_date && !isOverdue && (
                          <span className="text-xs text-slate-400">Due {formatDate(task.due_date)}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1">{task.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Assigned by {task.assigned_by?.full_name ?? '—'} · {formatTimeAgo(task.created_at)}
                      </p>
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {(isSelf || canManage) && !isSigningOff && !isCancelling && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-xs"
                          onClick={() => { setSignOffId(task.id); setCancelId(null) }}
                          disabled={isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Sign off
                        </Button>
                      )}
                      {canManage && !isCancelling && !isSigningOff && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => { setCancelId(task.id); setSignOffId(null) }}
                          disabled={isPending}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Sign-off panel */}
                  {isSigningOff && (
                    <div className="pt-2 border-t border-green-200 bg-green-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                      <p className="text-xs font-semibold text-green-800 mb-2">Mark as complete</p>
                      <Textarea
                        value={signOffNote}
                        onChange={e => setSignOffNote(e.target.value)}
                        placeholder="Add a completion note (optional)..."
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleComplete(task.id)}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Confirm complete'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setSignOffId(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Cancel panel */}
                  {isCancelling && (
                    <div className="pt-2 border-t border-red-200 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
                      <p className="text-xs font-semibold text-red-800 mb-2">Cancel this task</p>
                      <Input
                        value={cancelReason}
                        onChange={e => setCancelReason(e.target.value)}
                        placeholder="Reason for cancelling (optional)"
                        className="text-sm"
                      />
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => handleCancel(task.id)}
                          disabled={isPending}
                        >
                          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancel task'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setCancelId(null)}>Back</Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Completed ({completed.length})</h3>
          <div className="space-y-2">
            {completed.map(task => (
              <div key={task.id} className="bg-white rounded-xl border border-slate-100 p-4 opacity-70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                      <p className="text-sm font-medium text-slate-700 line-through decoration-slate-300">{task.title}</p>
                    </div>
                    {task.completion_note && (
                      <p className="text-xs text-slate-500 ml-6">{task.completion_note}</p>
                    )}
                    <p className="text-xs text-slate-400 ml-6 mt-0.5">
                      Signed off {task.completed_at ? formatTimeAgo(task.completed_at) : ''}
                      {task.completed_by ? ` by ${task.completed_by.full_name}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Cancelled ({cancelled.length})</h3>
          <div className="space-y-2">
            {cancelled.map(task => (
              <div key={task.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 opacity-60">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-slate-400 shrink-0" />
                  <p className="text-sm text-slate-500 line-through">{task.title}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {optimisticTasks.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No tasks assigned yet</p>
          {canManage && (
            <p className="text-xs mt-1">Use the &ldquo;Assign task&rdquo; button above to create one.</p>
          )}
        </div>
      )}
    </div>
  )
}
