'use client'

import { useEffect, useState } from 'react'
import { CHANGELOG, APP_VERSION } from '@/lib/version'

export function UpdateBanner() {
  const [reg, setReg] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.ready.then(registration => {
      // 已經有 waiting 的新版本
      if (registration.waiting) {
        setReg(registration)
      }

      // 偵測新版本裝好並進入等待
      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing
        if (!newSW) return
        newSW.addEventListener('statechange', () => {
          if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
            setReg(registration)
          }
        })
      })
    })

    // SW 接管後自動 reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }, [])

  if (!reg) return null

  function handleUpdate() {
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' })
  }

  function handleDismiss() {
    setReg(null)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-card">
        <div className="bg-amber-400 px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-bold text-white">🎉 易記帳 {APP_VERSION} 更新</span>
        </div>
        <div className="px-4 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">更新內容：</p>
          <ul className="mb-3 flex flex-col gap-1">
            {CHANGELOG.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm">
                <span className="mt-0.5 text-amber-400">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              onClick={handleUpdate}
              className="flex-1 rounded-xl bg-amber-400 py-2 text-sm font-semibold text-white hover:bg-amber-500"
            >
              立即更新
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-xl bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/80"
            >
              稍後
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
