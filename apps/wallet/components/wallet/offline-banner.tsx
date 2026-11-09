'use client'

import { useSyncExternalStore } from 'react'
import { CloudOffIcon } from 'lucide-react'
import { useTransactions } from '@/hooks/use-transactions'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** 沒網路、或還有紀錄沒送出去時才出現 */
export function OfflineBanner() {
  const { pendingCount, rejectedCount } = useTransactions()
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
  if (online && pendingCount === 0 && rejectedCount === 0) return null

  const waiting = pendingCount > 0 ? `${pendingCount} 筆等連上網路後自動送出` : ''
  const message = rejectedCount > 0
    ? `有 ${rejectedCount} 筆送不出去，點開那筆修改或刪除`
    : online ? `${pendingCount} 筆等待同步` : waiting || '沒有網路，記帳會先存在手機'

  return (
    <div className="flex justify-center px-4 pt-[calc(env(safe-area-inset-top)+8px)] lg:pt-3">
      <p role="status" className="flex animate-fade items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background">
        <CloudOffIcon className="size-3.5 shrink-0" />{message}
      </p>
    </div>
  )
}
