'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/finance-utils'
import * as api from '@/lib/api'
import type { Job, Shift } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { useTransactions } from '@/hooks/use-transactions'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function SchedulePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [jobs, setJobs] = useState<Job[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [addingJob, setAddingJob] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<Set<string>>(new Set())
  const isDesktop = useIsDesktop()
  const { transactions, addTransaction, deleteTransaction } = useTransactions()

  const loadData = useCallback(async () => {
    setLoading(true)
    const [j, s] = await Promise.all([
      api.fetchJobs().catch(() => [] as Job[]),
      api.fetchShifts(year, month).catch(() => [] as Shift[]),
    ])
    setJobs(j)
    setShifts(s)
    setLoading(false)
  }, [year, month])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`)
      .then(r => r.json())
      .then((data: { date: string; isHoliday: boolean; description: string }[]) => {
        setHolidays(new Set(
          data.filter(d => d.isHoliday && d.description !== '').map(d => `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`)
        ))
      })
      .catch(() => {})
  }, [year])

  function salaryNote(job: Job) { return `${job.name} ${year}年${month}月薪資` }
  function advancePrefix(job: Job) { return `${job.name} ${year}年${month}月領現` }

  function isSalaryAdded(job: Job) {
    return transactions.some(t => t.type === 'income' && t.note === salaryNote(job))
  }

  function getTotalAdvance(job: Job) {
    return transactions
      .filter(t => t.type === 'income' && t.note.startsWith(advancePrefix(job)))
      .reduce((sum, t) => sum + t.amount, 0)
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {}
    for (const s of shifts) {
      const d = s.date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(s)
    }
    return map
  }, [shifts])

  const advanceDates = useMemo(() => {
    const set = new Set<string>()
    for (const t of transactions) {
      const match = t.note.match(/領現 (\d{4}-\d{2}-\d{2})$/)
      if (match) set.add(match[1])
    }
    return set
  }, [transactions])

  const selectedShifts = useMemo(
    () => (selectedDate ? (shiftsByDate[selectedDate] ?? []) : []),
    [selectedDate, shiftsByDate]
  )

  async function handleAddSalary(job: Job, net: number) {
    if (addingJob) return
    const remaining = Math.round(net) - getTotalAdvance(job)
    if (remaining <= 0) return
    setAddingJob(job.id)
    try {
      const payday = Math.min(job.payday, daysInMonth)
      const date = `${year}-${String(month).padStart(2, '0')}-${String(payday).padStart(2, '0')}`
      await addTransaction({
        type: 'income',
        amount: remaining,
        category: 'salary',
        note: salaryNote(job),
        date,
      })
    } finally {
      setAddingJob(null)
    }
  }

  function advanceNoteForDate(job: Job, date: string) {
    return `${advancePrefix(job)} ${date}`
  }

  function getAdvanceTx(job: Job, date: string) {
    return transactions.find(t => t.type === 'income' && t.note === advanceNoteForDate(job, date))
  }

  function shiftAmount(job: Job, date: string) {
    if (job.pay_type === 'hourly') {
      const multiplier = holidays.has(date) ? 2 : 1
      return Math.round(job.rate * 8 * multiplier)
    }
    return Math.round(job.rate / 30)
  }

  async function handleToggleAdvance(job: Job, date: string) {
    if (addingJob) return
    setAddingJob(job.id)
    try {
      const existing = getAdvanceTx(job, date)
      if (existing) {
        await deleteTransaction(existing.id)
      } else {
        await addTransaction({
          type: 'income',
          amount: shiftAmount(job, date),
          category: 'salary',
          note: advanceNoteForDate(job, date),
          date,
        })
      }
    } finally {
      setAddingJob(null)
    }
  }

  async function handleToggleShift(jobId: string, shiftType: 'morning' | 'evening') {
    if (!selectedDate || saving) return
    setSaving(true)
    try {
      const existing = selectedShifts.find(s => s.job_id === jobId && s.shift_type === shiftType)
      if (existing) {
        await api.deleteShift(existing.id)
        setShifts(prev => prev.filter(s => s.id !== existing.id))
      } else {
        const other = selectedShifts.find(s => s.job_id === jobId)
        if (other) {
          await api.deleteShift(other.id)
          setShifts(prev => prev.filter(s => s.id !== other.id))
        }
        const newShift = await api.upsertShift({ job_id: jobId, date: selectedDate, shift_type: shiftType })
        setShifts(prev => [...prev, newShift])
      }
    } finally {
      setSaving(false)
    }
  }

  const dialogContent = selectedDate && (() => {
    const dateAdvances = transactions.filter(t => t.note.endsWith(`領現 ${selectedDate}`))
    return (
      <div className="flex flex-col max-h-[80vh] overflow-y-auto">
        <div className="border-b px-4 py-3 sticky top-0 bg-white dark:bg-card z-10">
          <p className="text-center text-base font-semibold">
            {year}年{parseInt(selectedDate.slice(5, 7))}月{parseInt(selectedDate.slice(8, 10))}日
          </p>
          {holidays.has(selectedDate) && (
            <p className="mt-1 text-center text-xs font-medium text-rose-500">國定假日・時薪雙倍</p>
          )}
        </div>
        <div className="flex flex-col gap-3 p-4">
          {jobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">請先在設定中新增工作</p>
          ) : (
            jobs.map(job => {
              const morningOn = selectedShifts.some(s => s.job_id === job.id && s.shift_type === 'morning')
              const eveningOn = selectedShifts.some(s => s.job_id === job.id && s.shift_type === 'evening')
              const hasShift  = morningOn || eveningOn
              const advanceTx = getAdvanceTx(job, selectedDate)
              return (
                <div key={job.id} className="rounded-2xl border p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: job.color }} />
                    <span className="text-sm font-semibold">{job.name}</span>
                    {advanceTx && (
                      <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        已領現 {formatCurrency(advanceTx.amount)}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={saving}
                      onClick={() => handleToggleShift(job.id, 'morning')}
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
                        morningOn ? 'text-white' : 'bg-muted text-muted-foreground'
                      )}
                      style={morningOn ? { backgroundColor: job.color } : undefined}
                    >
                      早班 07:00–15:00
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => handleToggleShift(job.id, 'evening')}
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
                        eveningOn ? 'text-white' : 'bg-muted text-muted-foreground'
                      )}
                      style={eveningOn ? { backgroundColor: job.color } : undefined}
                    >
                      晚班 15:00–23:00
                    </button>
                  </div>
                  {hasShift && (
                    <button
                      disabled={!!addingJob}
                      onClick={() => handleToggleAdvance(job, selectedDate)}
                      className={cn(
                        'mt-2 w-full rounded-xl py-2 text-xs font-medium transition-colors',
                        advanceTx
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:text-rose-500 dark:bg-emerald-400/10'
                          : 'bg-muted text-muted-foreground hover:bg-amber-50 hover:text-amber-600'
                      )}
                    >
                      {advanceTx ? '✓ 已領現　點擊取消' : `+ 領現　${formatCurrency(shiftAmount(job, selectedDate))}`}
                    </button>
                  )}
                </div>
              )
            })
          )}

          {/* 當日領現紀錄 */}
          {dateAdvances.length > 0 && (
            <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-400/10">
              <p className="mb-2 text-xs font-semibold text-emerald-700">當日領現紀錄</p>
              {dateAdvances.map(t => (
                <div key={t.id} className="flex items-center justify-between py-1">
                  <span className="text-xs text-emerald-800">{t.note.split(' ')[0]}</span>
                  <span className="text-xs font-semibold text-emerald-700">+{formatCurrency(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  })()

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 pt-10 pb-4 lg:pt-8">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">{year} / {String(month).padStart(2, '0')}</span>
          <div className="flex gap-0.5 text-muted-foreground">
            <button onClick={prevMonth} className="px-1 hover:text-foreground">‹</button>
            <button onClick={nextMonth} className="px-1 hover:text-foreground">›</button>
          </div>
        </div>
        {/* Job legend */}
        <div className="flex gap-2">
          {jobs.map(job => (
            <div key={job.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: job.color }} />
              <span className="text-xs text-muted-foreground">{job.name}</span>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
      ) : (
        <div className="px-4 lg:px-6">
          {/* Calendar */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
            <div className="grid grid-cols-7 border-b">
              {WEEKDAYS.map((d, i) => (
                <div key={d} className={cn(
                  'py-2 text-center text-xs font-semibold',
                  i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'
                )}>
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`e${i}`} className="min-h-16 border-b border-r p-1" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayShifts = shiftsByDate[dateStr] ?? []
                const isToday = dateStr === todayStr
                const col = (firstDayOfWeek + day - 1) % 7
                const isHolidayDate = holidays.has(dateStr)
                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    className="min-h-16 cursor-pointer border-b border-r p-1 transition-colors hover:bg-muted/30"
                  >
                    <span className={cn(
                      'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-amber-400 text-white',
                      !isToday && col === 0 && 'text-rose-500',
                      !isToday && col === 6 && 'text-blue-500',
                    )}>
                      {day}
                    </span>
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      {isHolidayDate && (
                        <span className="rounded bg-orange-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-orange-600 dark:bg-orange-400/20 dark:text-orange-400">
                          假
                        </span>
                      )}
                      {dayShifts.map(s => (
                        <span
                          key={s.id}
                          className="truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-none text-white"
                          style={{ backgroundColor: s.job_color }}
                        >
                          {s.shift_type === 'morning' ? '早' : '晚'}
                        </span>
                      ))}
                      {advanceDates.has(dateStr) && (
                        <span className="rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-emerald-700">
                          現
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Salary preview */}
          {jobs.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm font-semibold">本月薪資預估</p>
              {jobs.map(job => {
                const jobShifts = shifts.filter(s => s.job_id === job.id)
                const gross = job.pay_type === 'hourly'
                  ? jobShifts.reduce((sum, s) => {
                      const multiplier = holidays.has(s.date.slice(0, 10)) ? 2 : 1
                      return sum + job.rate * 8 * multiplier
                    }, 0)
                  : job.rate
                const deduction = job.labor_insurance + job.health_insurance
                const net = gross - deduction
                return (
                  <div key={job.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                      <span className="size-3 rounded-full" style={{ backgroundColor: job.color }} />
                      <span className="text-sm font-semibold">{job.name}</span>
                      {job.pay_type === 'hourly' && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          {jobShifts.length} 班 · {jobShifts.length * 8} 小時
                        </span>
                      )}
                    </div>
                    <div className="flex justify-around px-4 py-3">
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-muted-foreground">應領</p>
                        <p className="text-base font-bold">{formatCurrency(gross)}</p>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-muted-foreground">勞健保</p>
                        <p className="text-base font-semibold text-rose-500">
                          -{formatCurrency(deduction)}
                        </p>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="flex flex-col items-center">
                        <p className="text-xs text-muted-foreground">實領</p>
                        <p className="text-base font-bold text-emerald-600">{formatCurrency(net)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 border-t px-4 py-3">
                      {getTotalAdvance(job) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          已領現：<span className="font-medium text-emerald-600">{formatCurrency(getTotalAdvance(job))}</span>
                          　剩餘：<span className="font-medium">{formatCurrency(Math.max(0, Math.round(net) - getTotalAdvance(job)))}</span>
                        </p>
                      )}
                      {(() => {
                        const remaining = Math.round(net) - getTotalAdvance(job)
                        const added = isSalaryAdded(job)
                        const allReceived = !added && remaining <= 0
                        return (
                          <button
                            onClick={() => handleAddSalary(job, net)}
                            disabled={!!addingJob || added || allReceived}
                            className={cn(
                              'w-full rounded-xl py-2.5 text-sm font-semibold transition-colors',
                              added || allReceived
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10'
                                : 'bg-amber-400 text-white hover:bg-amber-500 disabled:opacity-50'
                            )}
                          >
                            {addingJob === job.id ? '新增中…'
                              : added ? '✓ 已新增到收入'
                              : allReceived ? '✓ 已全數領現'
                              : remaining < Math.round(net) ? `新增剩餘薪資 ${formatCurrency(remaining)}`
                              : '新增薪資到收入'}
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="h-6" />
        </div>
      )}

      {isDesktop ? (
        <Dialog open={!!selectedDate} onOpenChange={o => !o && setSelectedDate(null)}>
          <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
            <DialogTitle className="sr-only">班表設定</DialogTitle>
            {dialogContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={!!selectedDate} onOpenChange={o => !o && setSelectedDate(null)}>
          <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0">
            <SheetTitle className="sr-only">班表設定</SheetTitle>
            {dialogContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
