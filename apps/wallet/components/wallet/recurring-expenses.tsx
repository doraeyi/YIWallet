'use client'

import { useEffect, useState } from 'react'
import { RepeatIcon, XIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import * as api from '@/lib/api'
import { formatCurrency } from '@/lib/finance-utils'
import { toast } from '@/lib/toast'
import { CategoryBadge } from './category-icon'

// 固定支出：後端從交易偵測（每月差不多同一天、同樣金額扣一次，例如訂閱、電信、房租），
// 扣款前一天 LINE 會提醒。認錯的可以按 × 排除，之後就不再列出。
export function RecurringExpenses() {
  const [items, setItems] = useState<api.RecurringExpense[] | null>(null)

  useEffect(() => {
    api.fetchRecurring().then(setItems).catch(() => setItems([]))
  }, [])

  async function hide(item: api.RecurringExpense) {
    setItems(prev => prev?.filter(i => i.key !== item.key) ?? null)
    try {
      await api.hideRecurring(item.key)
      toast(`「${item.name}」不會再列為固定支出`)
    } catch {
      toast('沒有成功，請再試一次', 'error')
      setItems(prev => (prev ? [...prev, item] : prev))
    }
  }

  if (!items || items.length === 0) return null
  const monthly = items.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card">
      <div className="mb-1 flex items-baseline justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><RepeatIcon className="size-4 text-brand-text" />固定支出</p>
        <p className="text-sm font-bold tabular-nums">{formatCurrency(monthly)}<span className="text-xs font-normal text-muted-foreground"> / 月</span></p>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">每個月固定會扣的錢，扣款前一天會提醒你</p>
      <div className="flex flex-col">
        {items.map((item, idx) => (
          <div key={item.key} className={idx > 0 ? 'flex items-center gap-3 border-t py-2.5' : 'flex items-center gap-3 py-2.5'}>
            <CategoryBadge id={item.category ?? 'other-expense'} className="size-8" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">每月 {item.day} 號・下次 {format(parseISO(item.next_date), 'M/d')}</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(item.amount)}</p>
            <button
              onClick={() => hide(item)}
              aria-label={`${item.name}不是固定支出`}
              title="這不是固定支出"
              className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
