'use client'

import { useState } from 'react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionForm } from './transaction-form'
import { groupByDate, formatDate, formatCurrency } from '@/lib/finance-utils'
import { getCategoryById, type Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TransactionListProps {
  transactions: Transaction[]
  onUpdate: (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  emptyMessage?: string
}

export function TransactionList({
  transactions,
  onUpdate,
  onDelete,
  emptyMessage = '這個期間沒有記帳資料',
}: TransactionListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const groups = groupByDate(transactions)

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-4xl">📒</p>
        <p className="mt-2 text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ date, items }) => {
        const dayIncome  = items.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
        const dayExpense = items.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

        return (
          <div key={date}>
            {/* Date header */}
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-medium text-muted-foreground">
                {formatDate(date)}
              </span>
              <div className="flex gap-3 text-xs text-muted-foreground">
                {dayIncome > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(dayIncome)}
                  </span>
                )}
                {dayExpense > 0 && (
                  <span className="text-rose-600 dark:text-rose-400">
                    -{formatCurrency(dayExpense)}
                  </span>
                )}
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                {items.map((tx, idx) => {
                  const cat = getCategoryById(tx.category)
                  return (
                    <div
                      key={tx.id}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3',
                        idx < items.length - 1 && 'border-b'
                      )}
                    >
                      {/* Category emoji */}
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                        {cat?.emoji ?? '💸'}
                      </span>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {cat?.name ?? tx.category}
                        </p>
                        {tx.note && (
                          <p className="truncate text-xs text-muted-foreground">
                            {tx.note}
                          </p>
                        )}
                      </div>

                      {/* Amount */}
                      <span className={cn(
                        'shrink-0 text-sm font-semibold',
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-1">
                        <TransactionForm
                          initialData={tx}
                          onSubmit={data => onUpdate(tx.id, data)}
                          trigger={
                            <Button variant="ghost" size="icon-sm">
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (deletingId === tx.id) {
                              onDelete(tx.id)
                              setDeletingId(null)
                            } else {
                              setDeletingId(tx.id)
                              setTimeout(() => setDeletingId(null), 3000)
                            }
                          }}
                        >
                          <Trash2Icon />
                        </Button>
                        {deletingId === tx.id && (
                          <span className="self-center text-xs text-destructive">再按一次確認</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
