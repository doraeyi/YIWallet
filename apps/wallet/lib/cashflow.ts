import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns'
import { estimateJobPay } from './salary'
import { dayOfMonth } from './utils'
import type { BankCreditSummary, RecurringExpense } from './api'
import type { Card, Job, Shift, Transaction } from './types'

// 現金流：把接下來一段時間「會進來的錢」（班表推算的薪水）跟「會出去的錢」（信用卡帳單、固定支出）
// 排在同一條時間軸上，看得出「卡費在發薪前要繳，要先留錢」、「扣掉這些還能自由花多少」。
// 只是預估：薪水照班表算、本期帳單照目前刷的算，都還會變。

export type CashflowKind = 'payday' | 'bill' | 'recurring'

export interface CashflowEvent {
  date: Date
  kind: CashflowKind
  title: string
  detail: string
  amount: number      // 進來是正、出去是負
  estimated: boolean  // 預估（本期還沒結帳、薪水照班表算）
  overdue?: boolean   // 帳單已經過了繳費日還沒標記繳清
}

export interface CashflowWarning {
  text: string
}

export interface Cashflow {
  start: Date
  end: Date
  events: CashflowEvent[]
  income: number
  outflow: number
  warnings: CashflowWarning[]
}

const clampDay = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()))

// 從某天（不含）之後第一個「每月 day 號」
function nextMonthlyAfter(from: Date, day: number): Date {
  const same = clampDay(from.getFullYear(), from.getMonth(), day)
  return same > from ? same : clampDay(from.getFullYear(), from.getMonth() + 1, day)
}

// [start, end] 之間每個月的 day 號
function monthlyBetween(start: Date, end: Date, day: number): Date[] {
  const out: Date[] = []
  for (let y = start.getFullYear(), m = start.getMonth(); new Date(y, m, 1) <= end; m++) {
    const d = clampDay(y, m, day)
    if (d >= start && d <= end) out.push(d)
    if (m === 11) { m = -1; y++ }
  }
  return out
}

export function salaryNote(job: Job, year: number, month: number) {
  return `${job.name} ${year}年${month}月薪資`
}

export function buildCashflow(input: {
  today?: Date
  days?: number
  jobs: Job[]
  shifts: Shift[]
  holidays: Set<string>
  cards: Card[]
  creditSummaries: Record<string, BankCreditSummary | null>
  recurring: RecurringExpense[]
  transactions: Transaction[]
}): Cashflow {
  const start = startOfDay(input.today ?? new Date())
  const end = addDays(start, (input.days ?? 45) - 1)
  const events: CashflowEvent[] = []

  // ── 發薪：每份工作的發薪日，金額 = 那個月的薪水預估（跟班表頁同一套算法）──
  for (const job of input.jobs) {
    if (!job.payday) continue
    for (const date of monthlyBetween(start, end, job.payday)) {
      const y = date.getFullYear(), m = date.getMonth() + 1
      if (input.transactions.some(t => t.type === 'income' && t.note === salaryNote(job, y, m))) continue // 已經記進收入
      const pay = estimateJobPay(job, input.shifts, y, m, input.holidays)
      events.push({
        date, kind: 'payday', title: `${job.name} 發薪`,
        detail: pay.net > 0 ? `${m} 月薪水預估` : `${m} 月還沒排班，先算 $0`,
        amount: Math.max(0, Math.round(pay.net)), estimated: true,
      })
    }
  }

  // ── 信用卡帳單：同一家銀行（額度分組）合併 ──
  const banks = new Map<string, Card[]>()
  for (const c of input.cards.filter(c => c.type === 'credit')) {
    const key = c.bank ?? c.name
    banks.set(key, [...(banks.get(key) ?? []), c])
  }
  for (const [bank, bankCards] of banks) {
    const dueDay = bankCards.map(c => dayOfMonth(c.paymentDueDate)).find(d => d != null) ?? null
    if (!dueDay) continue
    const summary = input.creditSummaries[bank]
    if (summary && summary.billing_day != null) {
      // 已經結帳、還沒繳的帳單
      for (const bill of summary.unpaid_bills) {
        const due = nextMonthlyAfter(parseISO(bill.closing_date), dueDay)
        if (due > end || bill.amount <= 0.01) continue
        events.push({
          date: due, kind: 'bill', title: `${bank} 卡費`, detail: `${format(parseISO(bill.closing_date), 'M/d')} 結帳的帳單`,
          amount: -Math.round(bill.amount), estimated: false, overdue: due < start,
        })
      }
      // 本期（還在刷）：下次結帳日後的繳費日，金額照目前刷的算
      if (summary.current_period_spend > 0.01) {
        const closing = nextMonthlyAfter(addDays(start, -1), summary.billing_day)
        const due = nextMonthlyAfter(closing, dueDay)
        if (due <= end) {
          events.push({
            date: due, kind: 'bill', title: `${bank} 卡費`, detail: `本期到目前刷的，${format(closing, 'M/d')} 結帳`,
            amount: -Math.round(summary.current_period_spend), estimated: true,
          })
        }
      }
    } else {
      // 沒設結帳日：用卡片上手動填的「應繳金額」
      const dueAmount = bankCards.reduce((s, c) => s + (c.dueAmount ?? 0), 0)
      const due = nextMonthlyAfter(addDays(start, -1), dueDay)
      if (dueAmount > 0 && due <= end) {
        events.push({ date: due, kind: 'bill', title: `${bank} 卡費`, detail: '卡片上填的應繳金額', amount: -Math.round(dueAmount), estimated: false })
      }
    }
  }

  // ── 固定支出 ──
  for (const r of input.recurring) {
    for (const date of monthlyBetween(start, end, r.day)) {
      if (date < parseISO(r.next_date)) continue
      events.push({ date, kind: 'recurring', title: r.name, detail: `每月 ${r.day} 號`, amount: -Math.round(r.amount), estimated: false })
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime() || b.amount - a.amount)

  // ── 提醒：帳單在下一次發薪之前就要繳 ──
  const warnings: CashflowWarning[] = []
  const firstPayday = events.find(e => e.kind === 'payday' && e.amount > 0)
  const beforePay = events.filter(e => e.kind === 'bill' && (!firstPayday || e.date < firstPayday.date))
  if (beforePay.length > 0) {
    const total = -beforePay.reduce((s, e) => s + e.amount, 0)
    const names = [...new Set(beforePay.map(e => e.title.replace(/ 卡費$/, '')))].join('、')
    warnings.push({
      text: firstPayday
        ? `${names}的卡費在 ${format(firstPayday.date, 'M/d')} 發薪之前就要繳，先留 $${total.toLocaleString()}`
        : `接下來要繳 ${names}的卡費共 $${total.toLocaleString()}，這段期間沒有發薪`,
    })
  }
  const overdue = events.filter(e => e.overdue)
  if (overdue.length > 0) {
    warnings.push({ text: `${overdue.map(e => e.title).join('、')}已經過了繳費日，繳了記得到「帳單」標記繳清` })
  }

  return {
    start, end, events,
    income: events.filter(e => e.amount > 0).reduce((s, e) => s + e.amount, 0),
    outflow: -events.filter(e => e.amount < 0).reduce((s, e) => s + e.amount, 0),
    warnings,
  }
}

export function daysFromToday(date: Date, today = new Date()): number {
  return differenceInCalendarDays(date, today)
}
