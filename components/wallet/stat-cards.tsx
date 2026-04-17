'use client'

import { TrendingUpIcon, TrendingDownIcon, WalletIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, sumByType } from '@/lib/finance-utils'
import type { Transaction } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StatCardsProps {
  transactions: Transaction[]
}

export function StatCards({ transactions }: StatCardsProps) {
  const income = sumByType(transactions, 'income')
  const expense = sumByType(transactions, 'expense')
  const balance = income - expense

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-muted-foreground">
            <span>收入</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUpIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(income)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-muted-foreground">
            <span>支出</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30">
              <TrendingDownIcon className="size-4 text-rose-600 dark:text-rose-400" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">
            {formatCurrency(expense)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-muted-foreground">
            <span>結餘</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <WalletIcon className="size-4 text-blue-600 dark:text-blue-400" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(
            'text-2xl font-semibold',
            balance >= 0
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-rose-600 dark:text-rose-400'
          )}>
            {formatCurrency(balance)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
