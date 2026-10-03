'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2Icon, AlertCircleIcon } from 'lucide-react'
import { subscribeToasts, type ToastItem } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => subscribeToasts(setItems), [])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map(t => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex max-w-sm items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2',
            t.kind === 'error' ? 'bg-rose-500 text-white' : 'bg-foreground text-background',
          )}
        >
          {t.kind === 'error' ? <AlertCircleIcon className="size-4 shrink-0" /> : <CheckCircle2Icon className="size-4 shrink-0" />}
          {t.message}
        </div>
      ))}
    </div>
  )
}
