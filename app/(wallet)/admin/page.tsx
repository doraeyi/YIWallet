'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ShieldCheckIcon, MessageCircleIcon, UsersIcon, ScanLineIcon, Trash2Icon } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import * as api from '@/lib/api'
import type { AdminUser, LineQuota } from '@/lib/types'
import { cn } from '@/lib/utils'

// 近 N 個月每月新增使用者數，用來畫新增趨勢圖
function monthlySignups(users: AdminUser[], months: number) {
  const now = new Date()
  const buckets: { key: string; label: string; count: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${d.getMonth() + 1}月`, count: 0 })
  }
  const byKey = new Map(buckets.map(b => [b.key, b]))
  for (const u of users) {
    const d = new Date(u.createdAt)
    if (Number.isNaN(d.getTime())) continue
    const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.count++
  }
  return buckets
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lineQuota, setLineQuota] = useState<LineQuota | null>(null)

  useEffect(() => {
    api.fetchAdminUsers()
      .then(list => { setUsers(list); setAllowed(true) })
      .catch(() => setAllowed(false))
      .finally(() => { setChecking(false); setLoading(false) })
    api.fetchLineQuota().then(setLineQuota).catch(() => setLineQuota(null))
  }, [])

  async function removeUser(user: AdminUser) {
    if (removingId) return
    setRemovingId(user.id)
    setError(null)
    try {
      await api.deleteAdminUser(user.id)
      setUsers(prev => prev.filter(u => u.id !== user.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : '刪除失敗')
    } finally {
      setRemovingId(null)
    }
  }

  async function toggleOcr(user: AdminUser) {
    if (togglingId) return
    setTogglingId(user.id)
    setError(null)
    try {
      const updated = await api.updateOcrPermission(user.id, !user.canUseOcr)
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u))
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失敗')
    } finally {
      setTogglingId(null)
    }
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
    )
  }

  if (!allowed) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-3xl">🔒</p>
        <p className="text-sm text-muted-foreground">你沒有管理員權限</p>
        <Link href="/settings" className="mt-2 text-xs text-amber-500 hover:text-amber-600">回設定頁</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:pt-8">
        <Link href="/settings" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="flex items-center gap-1.5 text-xl font-bold">
          <ShieldCheckIcon className="size-5 text-amber-500" />
          管理後台
        </h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:max-w-2xl lg:px-6">
        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3.5 shadow-sm dark:bg-card">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <UsersIcon className="size-3.5" />
                <span className="text-xs">總使用者</span>
              </div>
              <p className="mt-1 text-2xl font-bold">{users.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3.5 shadow-sm dark:bg-card">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ScanLineIcon className="size-3.5" />
                <span className="text-xs">OCR 已開通</span>
              </div>
              <p className="mt-1 text-2xl font-bold">
                {users.filter(u => u.canUseOcr).length}
                <span className="text-sm font-normal text-muted-foreground"> / {users.length}</span>
              </p>
            </div>
          </div>
        )}

        {lineQuota && (
          <div className="rounded-2xl bg-white px-4 py-3.5 shadow-sm dark:bg-card">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15">
                <MessageCircleIcon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">LINE Bot 推播用量（本月）</p>
                <p className="text-xs text-muted-foreground">
                  {lineQuota.type === 'limited'
                    ? `已用 ${lineQuota.used} / ${lineQuota.limit} 則`
                    : `已用 ${lineQuota.used} 則（無上限方案）`}
                </p>
              </div>
            </div>
            {lineQuota.type === 'limited' && lineQuota.limit && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((lineQuota.used / lineQuota.limit) * 100))}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!loading && users.length > 0 && (
          <div className="rounded-2xl bg-white px-4 py-3.5 shadow-sm dark:bg-card">
            <p className="text-sm font-medium">近 6 個月新增使用者</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlySignups(users, 6)} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} 人`, '新增']}
                  contentStyle={{ borderRadius: '8px', fontSize: 13 }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-muted-foreground">OCR 功能（排班表照片匯入）使用權限管理，預設所有使用者關閉。</p>

        {error && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
            {users.map((u, i) => (
              <div key={u.id} className={cn('flex items-center gap-3 px-4 py-3.5', i > 0 && 'border-t')}>
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 dark:bg-indigo-400/15">
                  {u.displayName.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{u.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-[10px] text-muted-foreground">OCR 權限</span>
                  <button
                    onClick={() => toggleOcr(u)}
                    disabled={togglingId === u.id}
                    className={cn(
                      'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
                      u.canUseOcr ? 'bg-amber-400' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      'absolute top-0.5 left-0 size-5 rounded-full bg-white shadow transition-transform',
                      u.canUseOcr ? 'translate-x-[22px]' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      disabled={removingId === u.id}
                      className="flex size-7 shrink-0 items-center justify-center rounded-full text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>刪除「{u.displayName}」？</AlertDialogTitle>
                      <AlertDialogDescription>
                        會一併刪除他的帳號，以及名下所有交易、卡片、班表等資料，此操作無法復原。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => removeUser(u)}>
                        刪除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
