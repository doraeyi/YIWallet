'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, XIcon } from 'lucide-react'
import * as api from '@/lib/api'
import type { PendingBankScreenshot } from '@/lib/api'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function BankNotifyPage() {
  const [items, setItems] = useState<PendingBankScreenshot[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setItems(await api.fetchPendingBankScreenshots())
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDismiss(id: string) {
    setDismissingId(id)
    try {
      await api.dismissBankScreenshot(id)
      setItems(prev => prev.filter(i => i.id !== id))
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
        <h1 className="text-xl font-bold">銀行通知記帳</h1>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
        <p className="text-xs text-muted-foreground">
          從 LINE 傳截圖給 Bot 後，會先出現在這裡待確認。目前還沒有自動辨識金額，可以先手動記帳，再把這張截圖略過。
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">載入中…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            目前沒有待確認的銀行通知
          </div>
        ) : (
          items.map(item => (
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
    </div>
  )
}
