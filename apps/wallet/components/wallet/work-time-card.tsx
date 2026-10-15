'use client'

import { BriefcaseIcon } from 'lucide-react'
import { useWorkRate } from '@/hooks/use-work-rate'
import { formatWorkTime } from '@/lib/salary'
import { formatCurrency } from '@/lib/finance-utils'
import { getCategoryById } from '@/lib/types'

// 統計頁：「這段期間的花費 ＝ 上班多久」，再列花最多的三個分類各要上幾小時班。
// 用的是設定裡工作的時薪（月薪換算成時薪），沒有設工作就整塊不顯示。
export function WorkTimeCard({ expense, categories, periodLabel }: {
  expense: number
  categories: { category: string; amount: number }[]
  periodLabel: string
}) {
  const rate = useWorkRate()
  if (!rate || expense <= 0) return null
  const total = formatWorkTime(expense, rate)
  const top = categories.filter(c => c.category !== 'transfer').slice(0, 3)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BriefcaseIcon className="size-3.5" />
        {periodLabel}的花費，換算成工作時間
      </div>
      <p className="mt-1.5 text-2xl font-bold">{total?.replace('上班 ', '要上班 ')}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">以平均時薪 {formatCurrency(rate)} 計算</p>
      {top.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5 border-t pt-3">
          {top.map(c => (
            <div key={c.category} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {getCategoryById(c.category)?.name ?? c.category}・{formatCurrency(c.amount)}
              </span>
              <span className="font-medium">{formatWorkTime(c.amount, rate)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
