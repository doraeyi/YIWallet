'use client'

import { useEffect, useMemo, useState } from 'react'
import * as api from '@/lib/api'
import { buildCashflow, type Cashflow } from '@/lib/cashflow'
import { fetchHolidaySet } from '@/lib/salary'
import { useCards } from '@/hooks/use-cards'
import { useTransactions } from '@/hooks/use-transactions'
import type { Job, Shift } from '@/lib/types'

// 現金流要的資料：工作、班表、國定假日、各銀行帳單、固定支出（卡片和交易用共用的 context）
export function useCashflow(days = 45): { cashflow: Cashflow | null; loading: boolean } {
  const { cards, isLoaded: cardsLoaded } = useCards()
  const { transactions, isLoaded: txLoaded } = useTransactions()
  const [data, setData] = useState<{
    jobs: Job[]
    shifts: Shift[]
    holidays: Set<string>
    recurring: api.RecurringExpense[]
  } | null>(null)
  const [summaries, setSummaries] = useState<Record<string, api.BankCreditSummary | null> | null>(null)

  useEffect(() => {
    const year = new Date().getFullYear()
    Promise.all([
      api.fetchJobs().catch(() => [] as Job[]),
      api.fetchShifts().catch(() => [] as Shift[]),
      Promise.all([fetchHolidaySet(year), fetchHolidaySet(year + 1)]).then(([a, b]) => new Set([...a, ...b])),
      api.fetchRecurring().catch(() => [] as api.RecurringExpense[]),
    ]).then(([jobs, shifts, holidays, recurring]) => setData({ jobs, shifts, holidays, recurring }))
  }, [])

  const bankKey = useMemo(
    () => [...new Set(cards.filter(c => c.type === 'credit').map(c => c.bank ?? c.name))].sort().join('|'),
    [cards],
  )
  useEffect(() => {
    if (!cardsLoaded) return
    const banks = bankKey ? bankKey.split('|') : []
    let alive = true
    Promise.all(banks.map(async b => [b, await api.fetchBankCreditSummary(b).catch(() => null)] as const))
      .then(entries => { if (alive) setSummaries(Object.fromEntries(entries)) })
    return () => { alive = false }
  }, [bankKey, cardsLoaded])

  const cashflow = useMemo(() => {
    if (!data || !summaries || !txLoaded) return null
    return buildCashflow({ ...data, days, cards, creditSummaries: summaries, transactions })
  }, [data, summaries, txLoaded, days, cards, transactions])

  return { cashflow, loading: cashflow == null }
}
