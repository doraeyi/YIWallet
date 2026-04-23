'use client'

import { useState, useEffect } from 'react'
import { APP_VERSION, CHANGELOG } from '@/lib/version'

export function UpdateBanner() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const handler = () => setReady(true)
    window.addEventListener('sw-update-ready', handler)
    return () => window.removeEventListener('sw-update-ready', handler)
  }, [])

  if (!ready) return null

  function applyUpdate() {
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' })
    window.location.reload()
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl bg-white shadow-xl border px-4 py-3 lg:left-auto lg:right-6 lg:w-80 dark:bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">新版本 {APP_VERSION} 可用</p>
          {CHANGELOG.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {CHANGELOG.map((item, i) => (
                <li key={i} className="text-xs text-muted-foreground">· {item}</li>
              ))}
            </ul>
          )}
        </div>
        <button
          onClick={applyUpdate}
          className="shrink-0 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
        >
          立即更新
        </button>
      </div>
    </div>
  )
}
