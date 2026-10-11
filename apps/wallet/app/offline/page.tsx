'use client'

import { WifiOffIcon } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground"><WifiOffIcon className="size-8" /></span>
      <h1 className="text-2xl font-semibold">你目前離線</h1>
      <p className="text-muted-foreground">請確認網路連線後再試</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground hover:bg-brand-hover"
      >
        重新整理
      </button>
    </div>
  )
}
