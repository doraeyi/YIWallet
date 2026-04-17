'use client'

import { useState, useEffect } from 'react'
import { CheckIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon, LogOutIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency } from '@/lib/finance-utils'
import * as api from '@/lib/api'
import type { Job } from '@/lib/types'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'

const JOB_COLORS = [
  '#6366F1', '#F59E0B', '#10B981', '#EF4444',
  '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4',
]

const EMPTY_FORM = {
  name: '',
  color: '#6366F1',
  pay_type: 'hourly' as 'hourly' | 'monthly',
  rate: '',
  payday: '',
  labor_insurance: '',
  health_insurance: '',
}

export default function SettingsPage() {
  const { budget, setBudget } = useTransactions()
  const [input, setInput] = useState(budget > 0 ? String(budget) : '')
  const [saved, setSaved] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.fetchJobs().then(setJobs).catch(() => {})
  }, [])

  function handleSaveBudget() {
    const val = parseFloat(input)
    if (!isNaN(val) && val >= 0) {
      setBudget(val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  function openNewJob() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEditJob(job: Job) {
    setEditingId(job.id)
    setForm({
      name: job.name,
      color: job.color,
      pay_type: job.pay_type,
      rate: String(job.rate),
      payday: String(job.payday),
      labor_insurance: String(job.labor_insurance),
      health_insurance: String(job.health_insurance),
    })
    setFormOpen(true)
  }

  async function handleSubmitJob() {
    if (!form.name || !form.rate || !form.payday) return
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        color: form.color,
        pay_type: form.pay_type,
        rate: parseFloat(form.rate),
        payday: parseInt(form.payday),
        labor_insurance: parseFloat(form.labor_insurance || '0'),
        health_insurance: parseFloat(form.health_insurance || '0'),
      }
      if (editingId) {
        const updated = await api.updateJob(editingId, payload)
        setJobs(prev => prev.map(j => j.id === editingId ? updated : j))
      } else {
        const created = await api.createJob(payload)
        setJobs(prev => [...prev, created])
      }
      setFormOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteJob(id: string) {
    if (!confirm('確定刪除此工作？班表紀錄也會一併刪除。')) return
    await api.deleteJob(id)
    setJobs(prev => prev.filter(j => j.id !== id))
  }

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-10 pb-6 lg:pt-8">
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 lg:max-w-lg lg:px-6">

        {/* Budget */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">預算管理</p>
          </div>
          <div className="px-4 py-4">
            <label className="mb-1 block text-sm font-medium">每月預算</label>
            <p className="mb-3 text-xs text-muted-foreground">
              {budget > 0 ? `目前：${formatCurrency(budget)}` : '尚未設定每月預算'}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  placeholder="輸入金額"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveBudget()}
                  className="w-full rounded-xl border bg-muted/30 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-ring"
                />
              </div>
              <button
                onClick={handleSaveBudget}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                {saved && <CheckIcon className="size-4" />}
                {saved ? '已儲存' : '儲存'}
              </button>
            </div>
          </div>
        </div>

        {/* Job management */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">工作管理</p>
            <button
              onClick={openNewJob}
              className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
            >
              <PlusIcon className="size-3.5" />
              新增工作
            </button>
          </div>

          {jobs.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">還沒有工作，點右上角新增</p>
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map(job => (
                <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: job.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{job.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.pay_type === 'hourly' ? `時薪 ${formatCurrency(job.rate)}` : `月薪 ${formatCurrency(job.rate)}`}
                      　每月 {job.payday} 號發薪
                    </p>
                  </div>
                  <button onClick={() => openEditJob(job)} className="p-1.5 text-muted-foreground hover:text-foreground">
                    <PencilIcon className="size-4" />
                  </button>
                  <button onClick={() => handleDeleteJob(job.id)} className="p-1.5 text-muted-foreground hover:text-rose-500">
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* About */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">關於</p>
          </div>
          <div className="px-4 py-4">
            <p className="text-sm font-medium">易記帳</p>
            <p className="mt-0.5 text-xs text-muted-foreground">簡單好用的個人記帳 App</p>
            <p className="mt-2 text-xs text-muted-foreground">資料儲存於雲端資料庫。</p>
          </div>
        </div>

        {/* Logout — visible on mobile only (desktop uses sidebar) */}
        <form action={logout} className="lg:hidden">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-sm font-medium text-rose-500 shadow-sm dark:bg-card"
          >
            <LogOutIcon className="size-4" />
            登出
          </button>
        </form>
      </div>

      {/* Job form overlay */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl lg:rounded-2xl dark:bg-card">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold">{editingId ? '編輯工作' : '新增工作'}</p>
              <button onClick={() => setFormOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">公司名稱</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：全家便利商店"
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>

              {/* Color */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">顏色</label>
                <div className="flex gap-2">
                  {JOB_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={cn(
                        'size-8 rounded-full transition-transform',
                        form.color === c && 'scale-125 ring-2 ring-offset-1 ring-ring'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Pay type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">薪資類型</label>
                <div className="flex gap-2">
                  {(['hourly', 'monthly'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, pay_type: t }))}
                      className={cn(
                        'flex-1 rounded-xl py-2 text-sm font-medium transition-colors',
                        form.pay_type === t ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {t === 'hourly' ? '時薪' : '月薪'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rate */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {form.pay_type === 'hourly' ? '時薪金額' : '月薪金額'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.rate}
                  onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>

              {/* Payday */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">發薪日（每月幾號）</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.payday}
                  onChange={e => setForm(f => ({ ...f, payday: e.target.value }))}
                  placeholder="5"
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>

              {/* Insurance */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">勞保自付額</label>
                  <input
                    type="number"
                    min="0"
                    value={form.labor_insurance}
                    onChange={e => setForm(f => ({ ...f, labor_insurance: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">健保自付額</label>
                  <input
                    type="number"
                    min="0"
                    value={form.health_insurance}
                    onChange={e => setForm(f => ({ ...f, health_insurance: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmitJob}
              disabled={submitting || !form.name || !form.rate || !form.payday}
              className="mt-4 w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:bg-amber-500"
            >
              {submitting ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
