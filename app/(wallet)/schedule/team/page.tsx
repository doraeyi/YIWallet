'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api'
import type { RosterUpload, RosterViewShift } from '@/lib/api'
import { MonthNav } from '@/components/wallet/month-nav'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/use-is-desktop'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function TeamSchedulePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [uploads, setUploads] = useState<RosterUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    api.fetchRosterUploads()
      .then(setUploads)
      .catch(() => setUploads([]))
      .finally(() => setLoading(false))
  }, [])

  // 依 job 分組（同一份工作可能匯入過好幾批不同期間的班表）
  const jobs = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>()
    for (const u of uploads) {
      if (u.job) map.set(u.job.id, u.job)
    }
    return Array.from(map.values())
  }, [uploads])

  useEffect(() => {
    if (!activeJobId && jobs.length > 0) setActiveJobId(jobs[0].id)
  }, [jobs, activeJobId])

  const shiftsByDate = useMemo(() => {
    const map: Record<string, RosterViewShift[]> = {}
    for (const u of uploads) {
      if (u.jobId !== activeJobId) continue
      for (const s of u.shifts) {
        if (!map[s.date]) map[s.date] = []
        map[s.date].push(s)
      }
    }
    return map
  }, [uploads, activeJobId])

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

  // 只列出實際有班的人（start_time 為 null 代表表格上的「-」，休假不列入）
  const workingShifts = useMemo(
    () => (selectedDate ? (shiftsByDate[selectedDate] ?? []) : []).filter(s => s.startTime),
    [selectedDate, shiftsByDate],
  )
  const groupedByShiftType = useMemo(() => {
    const map = new Map<string, RosterViewShift[]>()
    for (const s of workingShifts) {
      const key = s.shiftType ?? (s.startTime && s.endTime ? `${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}` : '其他')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    }
    return Array.from(map.entries())
  }, [workingShifts])

  const dialogContent = selectedDate && (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold">
        {year}年{parseInt(selectedDate.slice(5, 7))}月{parseInt(selectedDate.slice(8, 10))}日
      </p>
      {groupedByShiftType.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">這天沒有排班資料</p>
      ) : (
        groupedByShiftType.map(([label, people]) => (
          <div key={label} className="rounded-xl bg-muted/40 p-3">
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</p>
            <div className="flex flex-wrap gap-1.5">
              {people.map(p => (
                <span key={p.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium shadow-sm dark:bg-card">
                  {p.employeeName}
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-2 lg:pt-8 lg:px-6">
        <Link href="/schedule" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">團隊班表</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-10 text-sm text-muted-foreground">載入中…</div>
      ) : jobs.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground lg:px-6">
          還沒有透過 LINE 匯入過班表。傳排班表照片給 Bot，並在「班表匯入」確認匯入後，就會出現在這裡。
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-4 pb-6 lg:px-6">
          {jobs.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {jobs.map(job => (
                <button
                  key={job.id}
                  onClick={() => setActiveJobId(job.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    activeJobId === job.id ? 'text-white' : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted/40'
                  )}
                  style={activeJobId === job.id ? { backgroundColor: job.color, borderColor: job.color } : undefined}
                >
                  <span className="size-1.5 rounded-full" style={{ backgroundColor: activeJobId === job.id ? '#fff' : job.color }} />
                  {job.name}
                </button>
              ))}
            </div>
          )}

          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />

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
                const working = (shiftsByDate[dateStr] ?? []).filter(s => s.startTime)
                const isToday = dateStr === todayStr
                const col = (firstDayOfWeek + day - 1) % 7
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
                    {working.length > 0 && (
                      <div className="mt-0.5">
                        <span className="rounded bg-blue-100 px-1 py-0.5 text-[10px] font-semibold leading-none text-blue-700 dark:bg-blue-400/20 dark:text-blue-400">
                          {working.length} 人
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {isDesktop ? (
        <Dialog open={!!selectedDate} onOpenChange={o => !o && setSelectedDate(null)}>
          <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
            <DialogTitle className="sr-only">當天排班</DialogTitle>
            {dialogContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={!!selectedDate} onOpenChange={o => !o && setSelectedDate(null)}>
          <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0">
            <SheetTitle className="sr-only">當天排班</SheetTitle>
            {dialogContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
