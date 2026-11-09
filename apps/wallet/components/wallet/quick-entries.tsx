'use client'

import { useState } from 'react'
import { useCards } from '@/hooks/use-cards'
import { useTransactions } from '@/hooks/use-transactions'
import { formatCurrency, todayString } from '@/lib/finance-utils'
import { frequentItems, type QuickItem } from '@/lib/quick-entry'
import { getCategoryById } from '@/lib/types'
import { toast } from '@/lib/toast'
import { CategoryBadge } from './category-icon'

/** 首頁的常用項目：點一下就記好，點錯了從提示按復原。 */
export function QuickEntries() {
  const { transactions, addTransaction, deleteTransaction } = useTransactions()
  const { cards } = useCards()
  // 只在進首頁時算一次：記完一筆次數會變，順序跟著跳的話連點會點到別的項目
  const [items] = useState(() => frequentItems(transactions))
  const [savingKey, setSavingKey] = useState<string | null>(null)

  // 那張卡已經刪掉的項目不顯示
  const visible = items.filter(item => !item.cardId || cards.some(c => c.id === item.cardId))
  if (visible.length === 0) return null

  const labelOf = (item: QuickItem) => item.note || getCategoryById(item.category)?.name || '一筆支出'

  async function record(item: QuickItem) {
    if (savingKey) return
    setSavingKey(item.key)
    const label = `${labelOf(item)} ${formatCurrency(item.amount)}`
    try {
      const tx = await addTransaction({
        type: 'expense', amount: item.amount, category: item.category, note: item.note,
        date: todayString(), cardId: item.cardId, isCash: item.isCash,
      })
      toast(`記好了：${label}`, 'success', {
        label: '復原',
        onClick: () => {
          deleteTransaction(tx.id)
            .then(() => toast('已復原'))
            .catch(() => toast('復原失敗，請到明細刪除', 'error'))
        },
      })
    } catch {
      toast('記帳失敗，請再試一次', 'error')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="mt-4">
      <p className="text-xs text-muted-foreground">常用，點一下就記好</p>
      <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 scrollbar-none lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {visible.map(item => (
          <button
            key={item.key}
            onClick={() => record(item)}
            disabled={!!savingKey}
            aria-label={`記一筆 ${labelOf(item)} ${formatCurrency(item.amount)}`}
            className="flex h-12 max-w-48 shrink-0 items-center gap-2 rounded-2xl border bg-card py-1 pr-3.5 pl-2 shadow-sm transition-[background-color,scale] duration-150 hover:bg-muted/50 active:scale-[0.97] disabled:opacity-70"
          >
            <CategoryBadge id={item.category} className="size-8" />
            <span className="truncate text-sm font-medium">{labelOf(item)}</span>
            <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{formatCurrency(item.amount)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
