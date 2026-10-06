'use client'
import { useEffect } from 'react'

// 註冊 service worker，並在發現新版時發出 'sw-update-ready' 事件給 UpdateBanner。
// 新版 service worker 裝好後會停在 waiting，等使用者按「更新」才接手（見 sw.js）。
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const notify = () => window.dispatchEvent(new CustomEvent('sw-update-ready'))
    let registration: ServiceWorkerRegistration | null = null

    navigator.serviceWorker.register('/sw.js').then(reg => {
      registration = reg
      // 上次開 App 時就已經下載好、還沒按更新的新版
      if (reg.waiting && navigator.serviceWorker.controller) notify()
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) notify()
        })
      })
    }).catch(console.error)

    // PWA 常常一直開在背景不會重新載入，回到前景時主動問一次有沒有新版
    function onVisible() {
      if (document.visibilityState === 'visible') registration?.update().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  return null
}
