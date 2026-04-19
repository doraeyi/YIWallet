'use client'

import { useState, useEffect, useRef } from 'react'
import { BotIcon, XIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/use-transactions'
import { cn } from '@/lib/utils'

export function LineImportBanner() {
  const { refetch } = useTransactions()
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const [updating, setUpdating] = useState(false)
  const dismissedRef = useRef(false)

  useEffect(() => {
    const es = new EventSource('/api/line/sse')

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { count: number }
        if (data.count > 0 && !dismissedRef.current) {
          setCount(data.count)
          setVisible(true)
        }
      } catch {}
    }

    return () => es.close()
  }, [])

  async function handleUpdate() {
    setUpdating(true)
    await refetch()
    await fetch('/api/line/pending', { method: 'DELETE' })
    dismissedRef.current = false
    setVisible(false)
    setUpdating(false)
  }

  function handleDismiss() {
    dismissedRef.current = true
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={cn(
      'fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2',
      'rounded-2xl bg-white shadow-lg border px-4 py-3',
      'flex items-center gap-3 lg:bottom-6 dark:bg-card',
      'animate-in slide-in-from-bottom-4 duration-300',
    )}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40">
        <BotIcon className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">LINE Bot 新增了 {count} 筆記錄</p>
        <p className="text-xs text-muted-foreground">點「更新」載入最新資料</p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleDismiss}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <XIcon className="size-4" />
        </button>
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="rounded-xl bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-60"
        >
          {updating ? '更新中…' : '更新'}
        </button>
      </div>
    </div>
  )
}
