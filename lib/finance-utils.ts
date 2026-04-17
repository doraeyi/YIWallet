import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isWithinInterval,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { Transaction, Period, ChartDataPoint } from './types'

export function filterByPeriod(
  transactions: Transaction[],
  period: Period,
  referenceDate: Date = new Date()
): Transaction[] {
  let start: Date
  let end: Date

  switch (period) {
    case 'week':
      start = startOfWeek(referenceDate, { weekStartsOn: 1 })
      end = endOfWeek(referenceDate, { weekStartsOn: 1 })
      break
    case 'month':
      start = startOfMonth(referenceDate)
      end = endOfMonth(referenceDate)
      break
    case 'year':
      start = startOfYear(referenceDate)
      end = endOfYear(referenceDate)
      break
  }

  return transactions.filter(t => {
    const d = parseISO(t.date)
    return isWithinInterval(d, { start, end })
  })
}

/** Filter to just one calendar month (YYYY-MM) */
export function filterByMonth(transactions: Transaction[], year: number, month: number): Transaction[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return transactions.filter(t => t.date.startsWith(prefix))
}

export function sumByType(transactions: Transaction[], type: 'income' | 'expense'): number {
  return transactions.filter(t => t.type === type).reduce((sum, t) => sum + t.amount, 0)
}

export function groupByDate(transactions: Transaction[]): { date: string; items: Transaction[] }[] {
  const map: Record<string, Transaction[]> = {}
  for (const t of transactions) {
    if (!map[t.date]) map[t.date] = []
    map[t.date].push(t)
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, items]) => ({ date, items }))
}

export function groupByCategory(
  transactions: Transaction[],
  type: 'income' | 'expense'
): { category: string; amount: number; percent: number }[] {
  const map: Record<string, number> = {}
  const typed = transactions.filter(tx => tx.type === type)
  const total = typed.reduce((s, t) => s + t.amount, 0)
  for (const t of typed) {
    map[t.category] = (map[t.category] ?? 0) + t.amount
  }
  return Object.entries(map)
    .map(([category, amount]) => ({
      category,
      amount,
      percent: total > 0 ? Math.round((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function buildChartData(
  transactions: Transaction[],
  period: Period,
  referenceDate: Date = new Date()
): ChartDataPoint[] {
  if (period === 'year') {
    const year = referenceDate.getFullYear()
    return Array.from({ length: 12 }, (_, i) => {
      const monthKey = `${year}-${String(i + 1).padStart(2, '0')}`
      const monthTxs = transactions.filter(t => t.date.startsWith(monthKey))
      return {
        label: format(new Date(year, i, 1), 'MMM', { locale: zhTW }),
        income: sumByType(monthTxs, 'income'),
        expense: sumByType(monthTxs, 'expense'),
      }
    })
  }

  if (period === 'month') {
    const days = eachDayOfInterval({ start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) })
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const dayTxs = transactions.filter(t => t.date === dayStr)
      return {
        label: format(day, 'd'),
        income: sumByType(dayTxs, 'income'),
        expense: sumByType(dayTxs, 'expense'),
      }
    })
  }

  // week
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(referenceDate, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dayTxs = transactions.filter(t => t.date === dayStr)
    return {
      label: format(day, 'EEE', { locale: zhTW }),
      income: sumByType(dayTxs, 'income'),
      expense: sumByType(dayTxs, 'expense'),
    }
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'yyyy/MM/dd (EEE)', { locale: zhTW })
}

export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
