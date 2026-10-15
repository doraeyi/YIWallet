'use client'

import Link from 'next/link'
import { ChevronRightIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'

// 首頁「全部」的本月預算進度：用了幾 %、還剩多少、接下來每天大約能花多少。
// 80% 以上變琥珀色、超過變紅色（跟 LINE 預算提醒同一個門檻）。沒設預算就提示去設定。
export function BudgetBar({ budget, spent }: { budget: number; spent: number }) {
  if (budget <= 0) {
    return (
      <Link href="/settings" className="mx-6 mb-3 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground hover:bg-muted">
        設定每月預算，快超支時提醒你
        <ChevronRightIcon className="size-3.5" />
      </Link>
    )
  }
  const now = new Date()
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate() + 1
  const ratio = spent / budget
  const remaining = budget - spent
  const tone = ratio >= 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <Link href="/cashflow" className="mx-6 mb-3 block rounded-xl px-0.5 py-1" aria-label="本月預算，點了看現金流">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">
          預算 {formatCurrency(budget)}・已用 <span className="font-semibold text-foreground">{Math.round(ratio * 100)}%</span>
        </span>
        <span className={cn('font-medium', remaining < 0 ? 'text-rose-500' : 'text-muted-foreground')}>
          {remaining >= 0 ? `每天還能花 ${formatCurrency(remaining / daysLeft)}` : `超支 ${formatCurrency(-remaining)}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-[width] duration-700 ease-(--ease-out-expo)', tone)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
      </div>
    </Link>
  )
}
