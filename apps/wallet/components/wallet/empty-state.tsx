import { createElement } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// 列表沒有資料時的提示：線條圖示＋一句話（＋選填的下一步），取代以前的大 emoji
export function EmptyState({ icon, title, hint, className }: {
  icon: LucideIcon
  title: string
  hint?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 rounded-2xl bg-white py-12 text-center shadow-sm dark:bg-card', className)}>
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {createElement(icon, { className: 'size-6', strokeWidth: 1.8 })}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-60 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
