'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ShieldCheckIcon } from 'lucide-react'
import * as api from '@/lib/api'
import type { AdminUser } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.fetchAdminUsers()
      .then(list => { setUsers(list); setAllowed(true) })
      .catch(() => setAllowed(false))
      .finally(() => { setChecking(false); setLoading(false) })
  }, [])

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
                      'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
                      u.canUseOcr ? 'translate-x-[22px]' : 'translate-x-0.5'
                    )} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
