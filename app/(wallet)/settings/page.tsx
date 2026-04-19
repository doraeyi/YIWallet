'use client'

import { useState, useEffect } from 'react'
import { CheckIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon, LogOutIcon, ReceiptIcon, BotIcon, CopyIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency } from '@/lib/finance-utils'
import * as api from '@/lib/api'
import type { Job } from '@/lib/types'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import { InvoiceSyncSheet } from '@/components/wallet/invoice-sync-sheet'

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

const CARRIER_KEY = 'yiwallet_carrier_code'
const CARRIER_VERIFY_KEY = 'yiwallet_carrier_verify'

function getMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate()
  return {
    startDate: `${y}-${m}-01`,
    endDate: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
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

  // LINE Bot 綁定
  const [lineLinked, setLineLinked] = useState<boolean | null>(null)
  const [linkCode, setLinkCode] = useState<string | null>(null)
  const [linkExpiry, setLinkExpiry] = useState<number>(0)
  const [linkSecondsLeft, setLinkSecondsLeft] = useState(0)
  const [linkLoading, setLinkLoading] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  useEffect(() => {
    fetch('/api/line/link')
      .then(r => r.json())
      .then(d => setLineLinked(d.linked))
      .catch(() => setLineLinked(false))
  }, [])

  useEffect(() => {
    if (!linkExpiry) return
    const id = setInterval(async () => {
      const left = Math.max(0, Math.ceil((linkExpiry - Date.now()) / 1000))
      setLinkSecondsLeft(left)
      if (left === 0) { setLinkCode(null); setLinkExpiry(0); clearInterval(id); return }

      // 每 3 秒檢查一次是否已綁定
      if (left % 3 === 0) {
        const res = await fetch('/api/line/link').catch(() => null)
        if (res?.ok) {
          const data = await res.json()
          if (data.linked) {
            setLineLinked(true)
            setLinkCode(null)
            setLinkExpiry(0)
            clearInterval(id)
          }
        }
      }
    }, 1000)
    return () => clearInterval(id)
  }, [linkExpiry])

  async function handleGenerateCode() {
    setLinkLoading(true)
    try {
      const res = await fetch('/api/line/link', { method: 'POST' })
      const data = await res.json()
      setLinkCode(data.code)
      setLinkExpiry(Date.now() + 10 * 60 * 1000)
      setLinkSecondsLeft(600)
    } catch {
      alert('產生失敗，請重試')
    } finally {
      setLinkLoading(false)
    }
  }

  async function handleUnlink() {
    await fetch('/api/line/link', { method: 'DELETE' })
    setLineLinked(false)
    setLinkCode(null)
  }

  async function handleCopyCode() {
    if (!linkCode) return
    await navigator.clipboard.writeText(`/link ${linkCode}`)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  // 電子發票載具
  const [carrierCode, setCarrierCode] = useState('')
  const [carrierVerify, setCarrierVerify] = useState('')
  const [carrierSaved, setCarrierSaved] = useState(false)
  const [carrierError, setCarrierError] = useState('')
  const [syncOpen, setSyncOpen] = useState(false)
  const { startDate, endDate } = getMonthRange()

  useEffect(() => {
    setCarrierCode(localStorage.getItem(CARRIER_KEY) ?? '')
    setCarrierVerify(localStorage.getItem(CARRIER_VERIFY_KEY) ?? '')
  }, [])

  useEffect(() => {
    api.fetchJobs().then(setJobs).catch(() => {})
  }, [])

  function handleSaveCarrier() {
    const trimmed = carrierCode.trim().toUpperCase()
    if (!/^\/[A-Z0-9+.]{7}$/.test(trimmed)) {
      setCarrierError('格式錯誤，應為 /XXXXXXX（含「/」共 8 碼）')
      return
    }
    if (!carrierVerify) {
      setCarrierError('請輸入驗證碼')
      return
    }
    setCarrierError('')
    localStorage.setItem(CARRIER_KEY, trimmed)
    localStorage.setItem(CARRIER_VERIFY_KEY, carrierVerify)
    setCarrierCode(trimmed)
    setCarrierSaved(true)
    setTimeout(() => setCarrierSaved(false), 2000)
  }

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

        {/* Invoice carrier */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <ReceiptIcon className="size-4 text-amber-500" />
            <p className="text-sm font-semibold">電子發票載具</p>
          </div>
          <div className="px-4 py-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium">手機條碼</label>
                <p className="mb-1.5 text-xs text-muted-foreground">格式：/XXXXXXX（含「/」共 8 碼）</p>
                <input
                  value={carrierCode}
                  onChange={e => { setCarrierCode(e.target.value); setCarrierError('') }}
                  placeholder="/MH3LKMR"
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm uppercase outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">驗證碼（密碼）</label>
                <p className="mb-1.5 text-xs text-muted-foreground">財政部平台手機條碼專區的登入密碼</p>
                <input
                  type="password"
                  value={carrierVerify}
                  onChange={e => { setCarrierVerify(e.target.value); setCarrierError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSaveCarrier()}
                  placeholder="••••••••"
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>
              {carrierError && <p className="text-xs text-rose-500">{carrierError}</p>}
              <button
                onClick={handleSaveCarrier}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                {carrierSaved && <CheckIcon className="size-4" />}
                {carrierSaved ? '已儲存' : '儲存設定'}
              </button>
            </div>
            <button
              onClick={() => setSyncOpen(true)}
              disabled={!carrierCode || !carrierVerify}
              className="w-full rounded-xl border-2 border-dashed border-amber-300 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-amber-950/20"
            >
              匯入本月發票
            </button>
          </div>
        </div>

        {/* LINE Bot */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <BotIcon className="size-4 text-green-500" />
              <p className="text-sm font-semibold">LINE Bot 自動記帳</p>
            </div>
            {lineLinked !== null && (
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                lineLinked ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-muted text-muted-foreground'
              )}>
                {lineLinked ? '已綁定' : '未綁定'}
              </span>
            )}
          </div>
          <div className="px-4 py-4 flex flex-col gap-4">
            {lineLinked ? (
              <>
                <div className="rounded-xl bg-green-50 px-3 py-2.5 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-400">
                  LINE 帳號已綁定。直接傳給 Bot 消費記錄即可，例如：<br />
                  <code className="font-mono">全家 茶葉蛋 10</code>　或　<code className="font-mono">捷運28</code>
                </div>
                <button
                  onClick={handleUnlink}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  解除 LINE 綁定
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs text-muted-foreground">步驟 1：加入 Bot 好友（<span className="font-mono">@984ehkom</span>）</p>
                  <p className="text-xs text-muted-foreground">步驟 2：產生綁定碼，傳給 Bot</p>
                </div>

                {linkCode && linkSecondsLeft > 0 ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between rounded-xl bg-muted px-3 py-2.5">
                      <code className="text-lg font-bold tracking-widest">{linkCode}</code>
                      <span className="text-xs text-muted-foreground">{Math.floor(linkSecondsLeft / 60)}:{String(linkSecondsLeft % 60).padStart(2, '0')}</span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600"
                    >
                      {codeCopied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                      {codeCopied ? '已複製！' : '複製指令（/link 綁定碼）'}
                    </button>
                    <p className="text-center text-xs text-muted-foreground">複製後貼到 Bot 聊天室傳送即完成綁定</p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateCode}
                    disabled={linkLoading}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
                  >
                    {linkLoading ? '產生中…' : '產生綁定碼'}
                  </button>
                )}
              </>
            )}
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

      <InvoiceSyncSheet
        open={syncOpen}
        onOpenChange={setSyncOpen}
        carrierCode={carrierCode}
        carrierVerify={carrierVerify}
        startDate={startDate}
        endDate={endDate}
      />

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
