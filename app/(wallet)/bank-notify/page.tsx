'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, XIcon, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api'
import type { PendingBankScreenshot } from '@/lib/api'

type Tab = 'bank' | 'roster'

function formatDateTime(iso: string): string {
  // 後端回傳的是沒有時區標記的 UTC 時間字串（例如 "2026-08-17T05:12:17"），
  // 瀏覽器解析時如果沒看到 'Z' 會誤判成本地時間，導致顯示少 8 小時——
  // 這裡明確補上 'Z' 讓 Date 正確當成 UTC 解析，toLocaleString 才會轉對時區。
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  return d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BankNotifyPage() {
  const [tab, setTab] = useState<Tab>('bank')

  const [bankItems, setBankItems] = useState<PendingBankScreenshot[]>([])
  const [bankLoading, setBankLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  const [rosterItems, setRosterItems] = useState<api.PendingRosterPhoto[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)

  async function loadBank() {
    setBankLoading(true)
    try {
      setBankItems(await api.fetchPendingBankScreenshots())
    } catch {
      setBankItems([])
    } finally {
      setBankLoading(false)
    }
  }

  async function loadRoster() {
    setRosterLoading(true)
    try {
      setRosterItems(await api.fetchPendingRosterPhotos())
    } catch {
      setRosterItems([])
    } finally {
      setRosterLoading(false)
    }
  }

  useEffect(() => { loadBank(); loadRoster() }, [])

  async function handleDismiss(id: string) {
    setDismissingId(id)
    try {
      await api.dismissBankScreenshot(id)
      setBankItems(prev => prev.filter(i => i.id !== id))
    } finally {
      setDismissingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-lg lg:pt-8">
        <Link href="/dashboard" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">待確認記帳</h1>
      </div>

      <div className="px-4 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
        <div className="flex gap-1.5">
          {([
            { key: 'bank' as const, label: '消費紀錄', count: bankItems.length },
            { key: 'roster' as const, label: '班表', count: rosterItems.length },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-foreground text-background' : 'bg-white text-muted-foreground shadow-sm dark:bg-card hover:bg-muted'
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  'flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4',
                  tab === t.key ? 'bg-background/20' : 'bg-rose-500 text-white'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bank' ? (
        <div className="flex flex-col gap-3 px-4 py-4 pb-6 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
          <p className="text-xs text-muted-foreground">
            從 LINE 傳截圖給 Bot 後，會先出現在這裡待確認。目前還沒有自動辨識金額，可以先手動記帳，再把這張截圖略過。
          </p>

          {bankLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">載入中…</div>
          ) : bankItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              目前沒有待確認的銀行通知
            </div>
          ) : (
            bankItems.map(item => (
              <div key={item.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                <div className="flex items-center justify-between border-b px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                  <button
                    onClick={() => handleDismiss(item.id)}
                    disabled={dismissingId === item.id}
                    className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
                  >
                    <XIcon className="size-3" />
                    {dismissingId === item.id ? '處理中…' : '略過'}
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={api.bankScreenshotImageUrl(item.id)}
                  alt="銀行通知截圖"
                  className="max-h-96 w-full object-contain bg-muted/20"
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4 pb-6 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
          <p className="text-xs text-muted-foreground">
            從 LINE 傳班表照片給 Bot 後會先出現在這裡，點下去可以辨識、校正表格，確認沒問題就能匯入。
          </p>

          {rosterLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">載入中…</div>
          ) : rosterItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              目前沒有待確認的班表照片
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {rosterItems.map(item => (
                  <Link
                    key={item.id}
                    href="/schedule/import"
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-muted/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={api.pendingRosterPhotoImageUrl(item.id)}
                      alt="班表照片"
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  </Link>
                ))}
              </div>
              <Link
                href="/schedule/import"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                <ImageIcon className="size-4" />
                前往辨識與確認匯入
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
