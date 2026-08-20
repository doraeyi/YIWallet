'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { CheckIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon, LogOutIcon, BotIcon, CopyIcon, ChevronDownIcon, UsersIcon, ShieldCheckIcon, GripVerticalIcon } from 'lucide-react'
import Link from 'next/link'
import { APP_VERSION } from '@/lib/version'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency, jobRate } from '@/lib/finance-utils'
import * as api from '@/lib/api'
import type { Job } from '@/lib/types'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'
import { useSearchParams } from 'next/navigation'
import { useCards } from '@/hooks/use-cards'
import { EditCardSheet } from '@/components/wallet/edit-card-sheet'
import { JobShareSheet } from '@/components/wallet/job-share-sheet'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useTheme, type ThemePref } from '@/hooks/use-theme'
import { SunIcon, MoonIcon, MonitorIcon } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import type { Card } from '@/lib/types'

interface UserProfile {
  id: string
  username?: string
  email?: string
  name?: string
  picture?: string
  auto_accept_shared_shifts?: boolean
  dashboard_order?: string | null
}

function GoogleStatusBanner() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  if (success === 'google_linked') return (
    <p className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-950/30">Google 帳號綁定成功！</p>
  )
  if (error === 'google_failed') return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">Google 綁定失敗，請稍後再試</p>
  )
  if (error === 'google_taken') return (
    <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">此 Google 帳號已被其他帳號綁定</p>
  )
  return null
}
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
  welfare_fee: '',
}



export default function SettingsPage() {
  const { budget, setBudget, isLoaded: txLoaded } = useTransactions()
  const [input, setInput] = useState(budget > 0 ? String(budget) : '')
  const [saved, setSaved] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  // 班別（ShiftPreset）管理：只有編輯既有工作時才能新增，因為需要 job_id
  const [presetLabel, setPresetLabel] = useState('')
  const [presetStart, setPresetStart] = useState('')
  const [presetEnd, setPresetEnd] = useState('')
  const [presetSubmitting, setPresetSubmitting] = useState(false)

  // 卡片管理
  const { cards, updateCard, removeCard, isLoaded: cardsLoaded } = useCards()
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [sharingJob, setSharingJob] = useState<Job | null>(null)

  // 卡片排序（在卡片管理清單裡直接拖拉），null 代表使用者還沒在這次畫面裡拖過，
  // 顯示順序退回用 profile.dashboard_order 算，拖過一次之後就以本地狀態為準，
  // 避免每次 render 都要重新從 profile 字串算一次。
  const [cardOrder, setCardOrder] = useState<string[] | null>(null)
  const draggingCardRef = useRef<string | null>(null)
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null)

  // 個人資料
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // 展開狀態
  const [expandedAccount, setExpandedAccount] = useState<'google' | 'line' | null>(null)
  const [expandedFeature, setExpandedFeature] = useState<'cards' | 'budget' | 'jobs' | 'push' | null>(null)

  // 推播通知
  const { permission: pushPermission, subscribed: pushSubscribed, loading: pushLoading, enable: enablePush, disable: disablePush } = usePushNotifications()

  // 深色／淺色模式
  const { theme, setTheme } = useTheme()
  const THEME_OPTIONS: { key: ThemePref; label: string; icon: typeof SunIcon }[] = [
    { key: 'light', label: '淺色', icon: SunIcon },
    { key: 'dark', label: '深色', icon: MoonIcon },
    { key: 'system', label: '跟隨系統', icon: MonitorIcon },
  ]

  useEffect(() => {
    fetch('/api/backend/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d) })
      .catch(() => {})
  }, [])

  // Google 綁定
  const [googleLinked, setGoogleLinked] = useState<boolean | null>(null)
  const [googleUnlinking, setGoogleUnlinking] = useState(false)

  useEffect(() => {
    fetch('/api/backend/users/me/google')
      .then(r => r.json())
      .then(d => setGoogleLinked(d.linked))
      .catch(() => setGoogleLinked(false))
  }, [])

  async function handleGoogleUnlink() {
    setGoogleUnlinking(true)
    try {
      await fetch('/api/backend/users/me/google', { method: 'DELETE' })
      setGoogleLinked(false)
    } finally {
      setGoogleUnlinking(false)
    }
  }

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

  async function handleToggleAutoAccept(checked: boolean) {
    setProfile(p => p ? { ...p, auto_accept_shared_shifts: checked } : p)
    await fetch('/api/backend/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_accept_shared_shifts: checked }),
    }).catch(() => {
      setProfile(p => p ? { ...p, auto_accept_shared_shifts: !checked } : p)
    })
  }

  useEffect(() => {
    api.fetchJobs().then(setJobs).catch(() => {}).finally(() => setJobsLoaded(true))
  }, [])

  // 卡片管理清單裡的顯示順序：拖過的話用本地 cardOrder，沒拖過就從
  // profile.dashboard_order 算，新卡片或還沒排序過的話補在最後面。
  const orderedCards = useMemo(() => {
    const defaultOrder = cards.map(c => c.id)
    let base = cardOrder
    if (!base) {
      let saved: string[] | null = null
      if (profile?.dashboard_order) {
        try { saved = JSON.parse(profile.dashboard_order) } catch {}
      }
      if (saved) {
        const known = new Set(defaultOrder)
        const kept = saved.filter(id => known.has(id))
        const missing = defaultOrder.filter(id => !kept.includes(id))
        base = [...kept, ...missing]
      } else {
        base = defaultOrder
      }
    }
    const byId = new Map(cards.map(c => [c.id, c]))
    return base.map(id => byId.get(id)).filter((c): c is Card => !!c)
  }, [cards, cardOrder, profile?.dashboard_order])

  function handleCardPointerDown(e: React.PointerEvent, id: string) {
    if (!cardOrder) setCardOrder(orderedCards.map(c => c.id))
    draggingCardRef.current = id
    setDraggingCardId(id)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  function handleCardPointerMove(e: React.PointerEvent) {
    if (!draggingCardRef.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const overId = el?.closest<HTMLElement>('[data-card-drag-id]')?.dataset.cardDragId
    if (!overId || overId === draggingCardRef.current) return
    setCardOrder(prev => {
      const list = prev ?? orderedCards.map(c => c.id)
      const from = list.indexOf(draggingCardRef.current!)
      const to = list.indexOf(overId)
      if (from === -1 || to === -1 || from === to) return prev
      const next = [...list]
      next.splice(from, 1)
      next.splice(to, 0, draggingCardRef.current!)
      return next
    })
  }

  async function handleCardPointerUp() {
    if (!draggingCardRef.current) return
    draggingCardRef.current = null
    setDraggingCardId(null)
    const order = cardOrder ?? orderedCards.map(c => c.id)
    const encoded = JSON.stringify(order)
    setProfile(p => p ? { ...p, dashboard_order: encoded } : p)
    await fetch('/api/backend/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dashboard_order: encoded }),
    }).catch(() => {})
  }

  function handleSaveBudget() {
    const val = parseFloat(input)
    if (!isNaN(val) && val >= 0) {
      setBudget(val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  function resetPresetForm() {
    setPresetLabel('')
    setPresetStart('')
    setPresetEnd('')
  }

  function openNewJob() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    resetPresetForm()
    setFormOpen(true)
  }

  function openEditJob(job: Job) {
    setEditingId(job.id)
    setForm({
      name: job.name,
      color: job.color,
      pay_type: job.pay_type,
      rate: String(jobRate(job)),
      payday: String(job.payday),
      labor_insurance: String(job.labor_insurance_fee),
      health_insurance: String(job.health_insurance_fee),
      welfare_fee: String(job.welfare_fee ?? 0),
    })
    resetPresetForm()
    setFormOpen(true)
  }

  async function handleAddPreset() {
    if (!editingId || !presetLabel.trim() || !presetStart || !presetEnd || presetSubmitting) return
    setPresetSubmitting(true)
    try {
      const preset = await api.addShiftPreset(editingId, {
        label: presetLabel.trim(),
        start_time: presetStart,
        end_time: presetEnd,
      })
      setJobs(prev => prev.map(j => j.id === editingId ? { ...j, presets: [...j.presets, preset] } : j))
      resetPresetForm()
    } finally {
      setPresetSubmitting(false)
    }
  }

  async function handleDeletePreset(presetId: string) {
    if (!editingId) return
    await api.deleteShiftPreset(editingId, presetId)
    setJobs(prev => prev.map(j => j.id === editingId ? { ...j, presets: j.presets.filter(p => p.id !== presetId) } : j))
  }

  async function handleSubmitJob() {
    if (!form.name || !form.rate || !form.payday) return
    setSubmitting(true)
    try {
      const rateValue = parseFloat(form.rate)
      const payload = {
        name: form.name,
        color: form.color,
        pay_type: form.pay_type,
        hourly_rate: form.pay_type === 'hourly' ? rateValue : null,
        monthly_salary: form.pay_type === 'monthly' ? rateValue : null,
        payday: parseInt(form.payday),
        labor_insurance_fee: parseFloat(form.labor_insurance || '0'),
        health_insurance_fee: parseFloat(form.health_insurance || '0'),
        welfare_fee: parseFloat(form.welfare_fee || '0'),
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

  const isLoaded = txLoaded && cardsLoaded && jobsLoaded && googleLinked !== null && lineLinked !== null

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-amber-400" />
          <p className="text-sm text-muted-foreground">載入中…</p>
        </div>
      </div>
    )
  }

  const displayName = profile?.name || profile?.username || profile?.email?.split('@')[0] || '使用者'
  const avatarLetter = displayName.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col">
      <div className="px-5 pt-10 pb-6 lg:mx-auto lg:w-full lg:max-w-lg lg:pt-8">
        <h1 className="text-xl font-bold">設定</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 lg:mx-auto lg:max-w-lg lg:px-6">

        {/* 個人資料 */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          {/* 漸層 header */}
          <div className="relative h-20 bg-gradient-to-br from-amber-400 to-amber-300">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
              {profile?.picture ? (
                <img
                  src={profile.picture}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="size-20 rounded-full object-cover ring-4 ring-white dark:ring-card"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-full bg-white ring-4 ring-white dark:ring-card shadow-sm">
                  <span className="text-3xl font-bold text-amber-400">{avatarLetter}</span>
                </div>
              )}
            </div>
          </div>
          {/* 名字 & email */}
          <div className="flex flex-col items-center pt-14 pb-5 gap-1">
            <p className="text-base font-semibold">{displayName}</p>
            {profile?.email && (
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            )}
          </div>
          <Link
            href="/settings/profile"
            className="flex w-full items-center justify-between border-t px-4 py-3.5 text-sm text-muted-foreground hover:bg-muted/40"
          >
            <span>編輯個人資料</span>
            <span className="text-base leading-none">›</span>
          </Link>
        </div>

        {/* ── 外觀 ── */}
        <p className="px-1 text-xs font-medium text-muted-foreground">外觀</p>
        <div className="overflow-hidden rounded-2xl bg-white p-3 shadow-sm dark:bg-card">
          <div className="flex gap-2">
            {THEME_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => setTheme(opt.key)}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1.5 rounded-xl py-3 text-xs font-medium transition-colors',
                  theme === opt.key ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70',
                )}
              >
                <opt.icon className="size-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 帳號 ── */}
        <p className="px-1 text-xs font-medium text-muted-foreground">帳號</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">

          {/* Google 帳號 row */}
          <button
            onClick={() => setExpandedAccount(v => v === 'google' ? null : 'google')}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2.5">
              <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-medium">Google 帳號</span>
            </div>
            <div className="flex items-center gap-2">
              {googleLinked !== null && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  googleLinked ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted text-muted-foreground'
                )}>
                  {googleLinked ? '已綁定' : '未綁定'}
                </span>
              )}
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expandedAccount === 'google' && 'rotate-180')} />
            </div>
          </button>
          {expandedAccount === 'google' && (
            <div className="flex flex-col gap-3 border-t px-4 py-4">
              <Suspense><GoogleStatusBanner /></Suspense>
              <p className="text-xs text-muted-foreground">綁定後可用 Google 帳號直接登入，忘記密碼也不怕。</p>
              {googleLinked ? (
                <button
                  onClick={handleGoogleUnlink}
                  disabled={googleUnlinking}
                  className="flex items-center justify-center rounded-xl border border-rose-200 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 disabled:opacity-60 dark:hover:bg-rose-950/20"
                >
                  {googleUnlinking ? '解除中…' : '解除 Google 綁定'}
                </button>
              ) : (
                <a
                  href="/api/auth/google/link-redirect"
                  className="flex items-center justify-center rounded-xl bg-white border py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 dark:bg-card dark:hover:bg-muted/20"
                >
                  綁定 Google 帳號
                </a>
              )}
            </div>
          )}

          <div className="border-t" />

          {/* LINE Bot row */}
          <button
            onClick={() => setExpandedAccount(v => v === 'line' ? null : 'line')}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
          >
            <div className="flex items-center gap-2.5">
              <BotIcon className="size-4 text-green-500" />
              <span className="text-sm font-medium">LINE Bot 自動記帳</span>
            </div>
            <div className="flex items-center gap-2">
              {lineLinked !== null && (
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  lineLinked ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-muted text-muted-foreground'
                )}>
                  {lineLinked ? '已綁定' : '未綁定'}
                </span>
              )}
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expandedAccount === 'line' && 'rotate-180')} />
            </div>
          </button>
          {expandedAccount === 'line' && (
            <div className="border-t px-4 py-4 flex flex-col gap-4">
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
          )}
        </div>

        {/* ── 功能 ── */}
        <p className="px-1 text-xs font-medium text-muted-foreground">功能</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">

          {/* 卡片管理 row */}
          <button
            onClick={() => setExpandedFeature(v => v === 'cards' ? null : 'cards')}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
          >
            <span className="text-sm font-medium">卡片管理</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{cards.length > 0 ? `${cards.length} 張` : '尚未新增'}</span>
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expandedFeature === 'cards' && 'rotate-180')} />
            </div>
          </button>
          {expandedFeature === 'cards' && (
            <div className={cn('border-t divide-y', cards.length > 3 && 'max-h-54 overflow-y-auto')}>
              {orderedCards.length === 0 ? (
                <p className="px-4 py-4 text-center text-sm text-muted-foreground">尚未新增任何卡片</p>
              ) : (
                <>
                  {orderedCards.length > 1 && (
                    <p className="px-4 pt-2.5 text-[11px] text-muted-foreground">拖右邊的把手可以調整卡片順序</p>
                  )}
                  {orderedCards.map(card => {
                    const emoji = card.type === 'credit' ? '💳' : card.type === 'easycard' ? '🚌' : '🏧'
                    return (
                      <div
                        key={card.id}
                        data-card-drag-id={card.id}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 transition-transform',
                          draggingCardId === card.id && 'scale-[1.01] bg-amber-50 dark:bg-amber-900/20',
                        )}
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full text-lg text-white" style={{ backgroundColor: card.color }}>{emoji}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{card.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {card.type === 'debit' && card.balance != null && `餘額 $${card.balance}`}
                            {card.type === 'easycard' && card.balance != null && `餘額 $${card.balance}`}
                            {card.type === 'easycard' && card.balance != null && card.passExpiryDate && ' · '}
                            {card.type === 'easycard' && card.passExpiryDate && `月票 ${card.passExpiryDate}`}
                            {card.type === 'credit' && card.paymentDueDate && `繳費截止 ${card.paymentDueDate}`}
                            {!card.balance && !card.passExpiryDate && !card.paymentDueDate && '尚未設定'}
                          </p>
                        </div>
                        <button onClick={() => setEditingCard(card)} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          onClick={async () => { if (!confirm(`確定刪除「${card.name}」？相關交易紀錄不受影響。`)) return; await removeCard(card.id) }}
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                        {orderedCards.length > 1 && (
                          <span
                            onPointerDown={e => handleCardPointerDown(e, card.id)}
                            onPointerMove={handleCardPointerMove}
                            onPointerUp={handleCardPointerUp}
                            onPointerCancel={handleCardPointerUp}
                            style={{ touchAction: 'none' }}
                            className="flex size-8 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing"
                          >
                            <GripVerticalIcon className="size-4" />
                          </span>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}

          <div className="border-t" />

          {/* 預算管理 row */}
          <button
            onClick={() => setExpandedFeature(v => v === 'budget' ? null : 'budget')}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
          >
            <span className="text-sm font-medium">預算管理</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{budget > 0 ? formatCurrency(budget) : '未設定'}</span>
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expandedFeature === 'budget' && 'rotate-180')} />
            </div>
          </button>
          {expandedFeature === 'budget' && (
            <div className="border-t px-4 py-4">
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
          )}

          <div className="border-t" />

          {/* 工作管理 row */}
          <button
            onClick={() => setExpandedFeature(v => v === 'jobs' ? null : 'jobs')}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
          >
            <span className="text-sm font-medium">工作管理</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{jobs.length > 0 ? `${jobs.length} 個` : '未設定'}</span>
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expandedFeature === 'jobs' && 'rotate-180')} />
            </div>
          </button>
          {expandedFeature === 'jobs' && (
            <div className="border-t">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-xs text-muted-foreground">工作列表</p>
                <button
                  onClick={openNewJob}
                  className="flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
                >
                  <PlusIcon className="size-3.5" />
                  新增
                </button>
              </div>
              {jobs.length === 0 ? (
                <div className="px-4 pb-4 text-center">
                  <p className="text-sm text-muted-foreground">還沒有工作，點右上角新增</p>
                </div>
              ) : (
                <div className="divide-y border-t">
                  {jobs.map(job => (
                    <div key={job.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: job.color }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{job.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.pay_type === 'hourly' ? `時薪 ${formatCurrency(jobRate(job))}` : `月薪 ${formatCurrency(jobRate(job))}`}　每月 {job.payday} 號
                        </p>
                      </div>
                      <button onClick={() => setSharingJob(job)} className="p-1.5 text-muted-foreground hover:text-indigo-500" title="共享設定">
                        <UsersIcon className="size-4" />
                      </button>
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
          )}

          <div className="border-t" />

          {/* 推播通知 row */}
          <button
            onClick={() => setExpandedFeature(v => v === 'push' ? null : 'push')}
            className="flex w-full items-center justify-between px-4 py-3.5 hover:bg-muted/40"
          >
            <span className="text-sm font-medium">推播通知</span>
            <div className="flex items-center gap-2">
              <span className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                pushSubscribed ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted text-muted-foreground'
              )}>
                {pushPermission === 'unsupported' ? '不支援' : pushPermission === 'denied' ? '已封鎖' : pushSubscribed ? '已開啟' : '未開啟'}
              </span>
              <ChevronDownIcon className={cn('size-4 text-muted-foreground transition-transform', expandedFeature === 'push' && 'rotate-180')} />
            </div>
          </button>
          {expandedFeature === 'push' && (
            <div className="border-t px-4 py-4 flex flex-col gap-3">
              {pushPermission === 'unsupported' && (
                <p className="text-xs text-muted-foreground">此瀏覽器不支援推播通知（iOS 需先將本站加入主畫面再開啟）。</p>
              )}
              {pushPermission === 'denied' && (
                <p className="text-xs text-muted-foreground">通知權限已被封鎖，請至瀏覽器設定手動開啟後再試一次。</p>
              )}
              {pushPermission !== 'unsupported' && pushPermission !== 'denied' && (
                <>
                  <p className="text-xs text-muted-foreground">開啟後可在卡片到期、繳費等提醒時收到推播通知。</p>
                  <button
                    onClick={() => { if (pushSubscribed) { disablePush() } else { enablePush() } }}
                    disabled={pushLoading}
                    className={cn(
                      'flex items-center justify-center rounded-xl py-2.5 text-sm font-medium disabled:opacity-60',
                      pushSubscribed ? 'border border-rose-200 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20' : 'bg-amber-400 text-white hover:bg-amber-500'
                    )}
                  >
                    {pushLoading ? '處理中…' : pushSubscribed ? '關閉推播通知' : '開啟推播通知'}
                  </button>
                </>
              )}
            </div>
          )}

          <div className="border-t" />

          {/* 好友幫我標註本人 row */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">接受好友標註我的班表</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                開啟後，好友幫忙上傳班表、標註「這是你本人」時會直接建立成你的班表；關閉的話只會顯示唯讀提示
              </p>
            </div>
            <Switch
              checked={!!profile?.auto_accept_shared_shifts}
              onCheckedChange={handleToggleAutoAccept}
              className="shrink-0"
            />
          </div>
        </div>

        {editingCard && (
          <EditCardSheet
            card={editingCard}
            open={!!editingCard}
            onOpenChange={open => { if (!open) setEditingCard(null) }}
            onSave={async (id, data) => { await updateCard(id, data) }}
          />
        )}

        {sharingJob && (
          <JobShareSheet
            job={sharingJob}
            open={!!sharingJob}
            onOpenChange={open => { if (!open) setSharingJob(null) }}
          />
        )}

        {/* ── 管理後台（只有管理員帳號看得到入口，真正的權限判斷在後端）── */}
        {profile?.email === 'ch855118@gmail.com' && (
          <Link
            href="/admin"
            className="flex items-center justify-between rounded-2xl bg-white px-4 py-3.5 shadow-sm hover:bg-muted/40 dark:bg-card"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <ShieldCheckIcon className="size-4 text-amber-500" />
              管理後台
            </span>
            <span className="text-base leading-none text-muted-foreground">›</span>
          </Link>
        )}

        {/* ── 關於 ── */}
        <p className="px-1 text-xs font-medium text-muted-foreground">關於</p>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm font-medium">易記帳</span>
            <span className="text-sm text-muted-foreground">{APP_VERSION}</span>
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

              {/* Welfare fee */}
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">福利金自付額</label>
                <input
                  type="number"
                  min="0"
                  value={form.welfare_fee}
                  onChange={e => setForm(f => ({ ...f, welfare_fee: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>

              {/* 班別（早班/晚班/大夜...），需要先儲存過工作才能新增 */}
              {editingId && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">班別</label>
                  <div className="flex flex-col gap-1.5">
                    {(jobs.find(j => j.id === editingId)?.presets ?? []).map(preset => (
                      <div key={preset.id} className="flex items-center gap-2 rounded-xl bg-muted/30 px-3 py-2">
                        <span className="flex-1 text-sm">
                          {preset.label}　{preset.start_time.slice(0, 5)}–{preset.end_time.slice(0, 5)}
                        </span>
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-end gap-1.5">
                    <input
                      value={presetLabel}
                      onChange={e => setPresetLabel(e.target.value)}
                      placeholder="早班"
                      className="w-16 min-w-0 flex-1 rounded-xl border bg-muted/30 px-2.5 py-2 text-sm outline-none focus:border-ring"
                    />
                    <input
                      type="time"
                      value={presetStart}
                      onChange={e => setPresetStart(e.target.value)}
                      className="min-w-0 rounded-xl border bg-muted/30 px-2 py-2 text-sm outline-none focus:border-ring"
                    />
                    <input
                      type="time"
                      value={presetEnd}
                      onChange={e => setPresetEnd(e.target.value)}
                      className="min-w-0 rounded-xl border bg-muted/30 px-2 py-2 text-sm outline-none focus:border-ring"
                    />
                    <button
                      onClick={handleAddPreset}
                      disabled={presetSubmitting || !presetLabel.trim() || !presetStart || !presetEnd}
                      className="flex shrink-0 size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-600 disabled:opacity-50"
                    >
                      <PlusIcon className="size-4" />
                    </button>
                  </div>
                </div>
              )}
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
