'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { AlertTriangleIcon, ChevronLeftIcon, CreditCardIcon, RepeatIcon, WalletIcon, CalendarClockIcon } from 'lucide-react'
import { useCashflow } from '@/hooks/use-cashflow'
import { daysFromToday, type CashflowEvent } from '@/lib/cashflow'
import { formatCurrency } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'
import { PageSkeleton } from '@/components/wallet/page-skeleton'
import { EmptyState } from '@/components/wallet/empty-state'

const KIND_STYLE = {
  payday:    { icon: WalletIcon,     tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10' },
  bill:      { icon: CreditCardIcon, tint: 'bg-rose-50 text-rose-500 dark:bg-rose-400/10' },
  recurring: { icon: RepeatIcon,     tint: 'bg-muted text-muted-foreground' },
} as const

function whenLabel(date: Date): string {
  const d = daysFromToday(date)
  if (d < 0) return `過了 ${-d} 天`
  if (d === 0) return '今天'
  if (d === 1) return '明天'
  return `${d} 天後`
}

// 現金流：接下來 45 天，發薪、卡費、固定支出照日期排，右邊是「到那天為止累計」——
// 累計變負的那段就是要先存錢撐過去的地方。
export default function CashflowPage() {
  const { cashflow, loading } = useCashflow(45)

  if (loading || !cashflow) return <PageSkeleton />

  const net = cashflow.income - cashflow.outflow
  const groups: { date: Date; items: CashflowEvent[] }[] = []
  for (const e of cashflow.events) {
    const last = groups[groups.length - 1]
    if (last && last.date.getTime() === e.date.getTime()) last.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  }
  let running = 0

  return (
    <div className="flex flex-col gap-4 p-4 lg:mx-auto lg:w-full lg:max-w-5xl lg:px-1 lg:py-8">
      <div>
        <Link href="/stats" className="mb-2 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground">
          <ChevronLeftIcon className="size-3.5" />收支分析
        </Link>
        <h1 className="text-xl font-bold">現金流</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          接下來 45 天（到 {format(cashflow.end, 'M/d')}）會進來、會出去的錢
        </p>
      </div>

      {cashflow.events.length === 0 ? (
        <EmptyState
          icon={CalendarClockIcon}
          title="接下來沒有排到的進出"
          hint="到設定新增工作（填發薪日）、在信用卡填繳費日，這裡就會排出發薪跟卡費"
          className="rounded-2xl bg-white py-12 shadow-sm dark:bg-card"
        />
      ) : (
        // 電腦版：左邊總覽和提醒（固定在畫面上），右邊照日期排的進出
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="animate-rise rounded-2xl bg-white p-5 shadow-sm dark:bg-card">
            <p className="text-xs text-muted-foreground">扣掉卡費跟固定支出，還能自由花</p>
            <p className={cn('mt-1 text-3xl font-bold tabular-nums', net >= 0 ? 'text-foreground' : 'text-rose-500')}>
              {formatCurrency(net)}
            </p>
            <div className="mt-3 flex gap-6 border-t pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">預計進帳</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-emerald-600">{formatCurrency(cashflow.income)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">要付出去</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-rose-500">{formatCurrency(cashflow.outflow)}</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">薪水照班表預估、本期卡費照目前刷的算，之後還會變動</p>
          </div>

          {cashflow.warnings.map(w => (
            <div key={w.text} className="flex gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-soft-foreground">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
              <p>{w.text}</p>
            </div>
          ))}
          </div>

          <div className="stagger flex flex-col gap-2">
            {groups.map(({ date, items }) => (
              <div key={date.getTime()} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                <div className="flex items-center justify-between border-b px-4 py-2 text-xs">
                  <span className="font-medium">{format(date, 'M/d EEEE', { locale: zhTW })}</span>
                  <span className={cn('text-muted-foreground', daysFromToday(date) < 0 && 'font-medium text-rose-500')}>{whenLabel(date)}</span>
                </div>
                {items.map((e, idx) => {
                  running += e.amount
                  const { icon: Icon, tint } = KIND_STYLE[e.kind]
                  return (
                    <div key={`${e.title}-${idx}`} className={cn('flex items-center gap-3 px-4 py-3', idx > 0 && 'border-t')}>
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', tint)}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {e.title}
                          {e.estimated && <span className="ml-1.5 rounded bg-muted px-1 py-px align-middle text-[10px] font-normal text-muted-foreground">預估</span>}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{e.detail}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('text-sm font-semibold tabular-nums', e.amount >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
                          {e.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(e.amount))}
                        </p>
                        <p className={cn('text-[11px] tabular-nums', running < 0 ? 'text-rose-500' : 'text-muted-foreground')}>
                          累計 {formatCurrency(running)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="h-6" />
    </div>
  )
}
