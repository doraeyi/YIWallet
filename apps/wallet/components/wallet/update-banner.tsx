'use client'

import { useEffect, useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import { APP_VERSION } from '@/lib/version'

interface RemoteVersion {
  version: string
  build: string
  changes: string[]
}

// 有新版時從底部浮出來；內容向伺服器拿（新版自己報的版本號和更新內容），
// 這支元件本身是舊版程式，裡面的 APP_VERSION 是「目前這版」
export function UpdateBanner() {
  const [remote, setRemote] = useState<RemoteVersion | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    async function onReady() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        setRemote(res.ok ? await res.json() : { version: '', build: '', changes: [] })
      } catch {
        setRemote({ version: '', build: '', changes: [] })
      }
    }
    window.addEventListener('sw-update-ready', onReady)
    return () => window.removeEventListener('sw-update-ready', onReady)
  }, [])

  if (!remote) return null

  async function applyUpdate() {
    setUpdating(true)
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg?.waiting) {
      window.location.reload()
      return
    }
    // 新版接手後重新載入
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true })
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  const isNewVersion = !!remote.version && remote.version !== APP_VERSION

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-rise lg:bottom-6 lg:left-auto lg:right-6 lg:w-80">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-card">
        <div className="flex items-center gap-2 bg-brand px-4 py-2.5 text-brand-foreground">
          <SparklesIcon className="size-4" />
          <span className="text-sm font-bold">
            {isNewVersion ? `新版本 ${remote.version} 可以更新了` : '有小更新可以安裝'}
          </span>
        </div>
        <div className="px-4 py-3">
          {isNewVersion && remote.changes.length > 0 ? (
            <ul className="mb-3 flex flex-col gap-1">
              {remote.changes.map(item => (
                <li key={item} className="flex items-start gap-1.5 text-sm">
                  <span className="mt-0.5 text-brand-text">•</span>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">修正了一些小問題，讓 App 更穩定。</p>
          )}
          <p className="mb-3 text-xs text-muted-foreground">目前版本 {APP_VERSION}</p>
          <div className="flex gap-2">
            <button
              onClick={applyUpdate}
              disabled={updating}
              className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover disabled:opacity-60"
            >
              {updating ? '更新中…' : '立即更新'}
            </button>
            <button
              onClick={() => setRemote(null)}
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
