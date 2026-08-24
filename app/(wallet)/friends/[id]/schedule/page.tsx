'use client'

import { useState, useEffect, useMemo, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeftIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { shiftTypeLabel } from '@/lib/finance-utils'
import * as api from '@/lib/api'
import type { FriendShift } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MonthNav } from '@/components/wallet/month-nav'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/use-is-desktop'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function FriendSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: friendId } = use(params)
  const searchParams = useSearchParams()
  const friendName = searchParams.get('name') ?? '好友'

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [shifts, setShifts] = useState<FriendShift[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const isDesktop = useIsDesktop()

  useEffect(() => {
    api.fetchFriendShifts(friendId)
      .then(setShifts)
      .catch(() => setShifts([]))
      .finally(() => setLoading(false))
  }, [friendId])

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
    const map: Record<string, FriendShift[]> = {}
    for (const s of shifts) {
      const d = s.date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(s)
    }
    return map
  }, [shifts])

  const selectedShifts = useMemo(
    () => (selectedDate ? (shiftsByDate[selectedDate] ?? []) : []),
    [selectedDate, shiftsByDate]
  )

  const dialogContent = selectedDate && (
    <div className="flex flex-col max-h-[80vh] overflow-y-auto">
      <div className="border-b px-4 py-3 sticky top-0 bg-white dark:bg-card z-10">
        <p className="text-center text-base font-semibold">
          {parseInt(selectedDate.slice(5, 7))}/{parseInt(selectedDate.slice(8, 10))}・{friendName}
        </p>
      </div>
      <div className="flex flex-col gap-2 p-4">
        {selectedShifts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">這天沒有排班</p>
        ) : (
          selectedShifts.map(s => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
              <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: s.job?.color ?? '#9CA3AF' }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</p>
                {s.job && <p className="truncate text-xs text-muted-foreground">{s.job.name}</p>}
              </div>
              {s.shift_type && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {shiftTypeLabel(s.shift_type)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:pt-8">
        <Link href="/friends" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">{friendName} 的班表</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
      ) : shifts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 px-8 text-center">
          <p className="text-sm text-muted-foreground">對方目前沒有分享任何班表給你</p>
          <p className="text-xs text-muted-foreground/70">
            請對方到「設定」→「工作管理」，點選要分享的工作，把你加入共享名單
          </p>
        </div>
      ) : (
        <div className="px-4 lg:px-6">
          <div className="mb-3 flex justify-center">
            <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
          </div>

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
                      {dayShifts.slice(0, 2).map(s => (
                        <span
                          key={s.id}
                          className="truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-none text-white"
                          style={{ backgroundColor: s.job?.color ?? '#9CA3AF' }}
                        >
                          {shiftTypeLabel(s.shift_type) ?? s.start_time.slice(0, 5)}
                        </span>
                      ))}
                      {dayShifts.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{dayShifts.length - 2}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="mt-2 px-1 text-xs text-muted-foreground">點日期查看當天班次</p>
          <div className="h-6" />
        </div>
      )}

      {isDesktop ? (
        <Dialog open={!!selectedDate} onOpenChange={o => !o && setSelectedDate(null)}>
          <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
            <DialogTitle className="sr-only">當天班次</DialogTitle>
            {dialogContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Sheet open={!!selectedDate} onOpenChange={o => !o && setSelectedDate(null)}>
          <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0">
            <SheetTitle className="sr-only">當天班次</SheetTitle>
            {dialogContent}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
