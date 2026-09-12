'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { UserPlusIcon, LockIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, jobRate, shiftTypeLabel } from '@/lib/finance-utils'
import * as api from '@/lib/api'
import type { Job, Shift, ShiftPreset, Friendship, JobShare, FriendShift } from '@/lib/types'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { MonthNav } from '@/components/wallet/month-nav'
import { RosterShiftPill } from '@/components/wallet/roster-shift-pill'
import { AvatarStack } from '@/components/wallet/avatar-stack'
import { JobCoworkersDialog } from '@/components/wallet/job-coworkers-dialog'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { useTransactions } from '@/hooks/use-transactions'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

type TeamShiftPerson =
  | { isMe: true; id: string; employeeName: string }
  | { isMe: false; id: string; employeeName: string; shift: api.RosterViewShift }

export default function SchedulePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [ownJobs, setOwnJobs] = useState<Job[]>([])
  const [sharedJobs, setSharedJobs] = useState<Job[]>([])
  const [jobShares, setJobShares] = useState<Record<string, JobShare[]>>({})
  const [shifts, setShifts] = useState<Shift[]>([])
  // 別人分享給我、我目前選中在看的那份工作的班表——唯讀，不是我自己的 Shift 資料
  const [sharedShifts, setSharedShifts] = useState<FriendShift[]>([])
  // 同一份被分享工作的團隊班表（同事名字），不限於自己上傳的批次
  const [sharedTeamShifts, setSharedTeamShifts] = useState<api.RosterViewShift[]>([])
  const [rosterUploads, setRosterUploads] = useState<api.RosterUpload[]>([])
  const [matchedShifts, setMatchedShifts] = useState<api.MatchedRosterShift[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [addingJob, setAddingJob] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [myName, setMyName] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friendship[]>([])
  const [holidays, setHolidays] = useState<Set<string>>(new Set())
  // 工作切換器：預設每個工作的班表/薪資分開顯示，只有使用者主動切成「全部」才合併顯示
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [showAllJobs, setShowAllJobs] = useState(false)
  const [coworkersDialogOpen, setCoworkersDialogOpen] = useState(false)
  const isDesktop = useIsDesktop()
  const { transactions, addTransaction, deleteTransaction } = useTransactions()
  const touchStartX = useRef<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    // /schedule 一次回傳使用者所有班表（後端不支援年月篩選），月份切換只是前端換篩選範圍，不用重打 API
    const [j, sj, s, r] = await Promise.all([
      api.fetchJobs().catch(() => [] as Job[]),
      api.fetchSharedJobs().catch(() => [] as Job[]),
      api.fetchShifts().catch(() => [] as Shift[]),
      api.fetchRosterUploads().catch(() => [] as api.RosterUpload[]),
    ])
    setOwnJobs(j)
    setSharedJobs(sj)
    setShifts(s)
    setRosterUploads(r)
    setLoading(false)

    // 自己的工作一定看得到共享名單；別人分享給我的工作，只有被授權管理
    // 才看得到——沒授權打了也只會拿到 403，直接跳過不打。
    const shareableJobs = [...j, ...sj.filter(job => job.canManage)]
    const shareEntries = await Promise.all(
      shareableJobs.map(job => api.fetchJobShares(job.id).then(shares => [job.id, shares] as const).catch(() => [job.id, []] as const))
    )
    setJobShares(Object.fromEntries(shareEntries))
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    fetch('/api/backend/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.id != null) setMyUserId(String(d.id))
        if (d?.name) setMyName(d.name)
      })
      .catch(() => {})
    api.fetchFriendships().then(list => setFriends(list.filter(f => f.status === 'accepted'))).catch(() => {})
  }, [])

  useEffect(() => {
    const lastDay = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    api.fetchMatchedRosterShifts(start, end).then(setMatchedShifts).catch(() => setMatchedShifts([]))
  }, [year, month])

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
  const advancePrefix = useCallback((job: Job) => `${job.name} ${year}年${month}月領現`, [year, month])

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

  // 工作切換器混合「自己的工作」跟「別人分享給我的工作」，自己的排前面。
  // 分享來的只能唯讀查看，不能排班/算薪資，跟自己的工作區分開來。
  const jobs = useMemo(() => [...ownJobs, ...sharedJobs], [ownJobs, sharedJobs])
  const ownJobIds = useMemo(() => new Set(ownJobs.map(j => j.id)), [ownJobs])

  // 手機版拿掉工作切換 tab，改左右滑動；「全部」也算序列裡的一格，跟桌機版 tab 順序一致
  const jobViewSequence = useMemo(
    () => [{ kind: 'all' as const }, ...jobs.map(job => ({ kind: 'job' as const, job }))],
    [jobs],
  )
  const currentJobViewIndex = showAllJobs || jobs.length === 0
    ? 0
    : jobViewSequence.findIndex(v => v.kind === 'job' && v.job.id === (activeJobId ?? jobs[0]?.id))
  const activeJob = jobs.find(j => j.id === (activeJobId ?? jobs[0]?.id)) ?? null
  const isOwnActiveJob = !!activeJob && ownJobIds.has(activeJob.id)
  const canManageActiveJobCoworkers = !!activeJob && (isOwnActiveJob || activeJob.canManage)
  const activeJobCoworkers = activeJob ? (jobShares[activeJob.id] ?? []) : []

  // 加人/踢人/切換管理權限只影響目前這份工作的共享名單，不用整頁重載
  // （工作列表、班表、團隊班表都跟這件事無關），減少不必要的重新抓取
  const reloadActiveJobShares = useCallback(() => {
    if (!activeJob) return
    api.fetchJobShares(activeJob.id)
      .then(shares => setJobShares(prev => ({ ...prev, [activeJob.id]: shares })))
      .catch(() => {})
  }, [activeJob])

  function goToJobView(index: number) {
    const total = jobViewSequence.length
    const view = jobViewSequence[(index + total) % total]
    if (view.kind === 'all') setShowAllJobs(true)
    else { setActiveJobId(view.job.id); setShowAllJobs(false) }
  }

  function handleJobTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleJobTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || jobViewSequence.length <= 1) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 48) {
      goToJobView(currentJobViewIndex + (delta > 0 ? 1 : -1))
    }
    touchStartX.current = null
  }

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 未過濾版本：日期點擊面板要看得到「所有工作」當天有沒有排班，才能正確顯示每個工作各自的早/晚班切換狀態
  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {}
    for (const s of shifts) {
      const d = s.date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push(s)
    }
    return map
  }, [shifts])

  // 別人分享給我的工作，班表資料來源不是我自己的 shifts（我在那份工作底下
  // 根本沒有自己的 Shift 紀錄），要另外拿對方的唯讀班表；切到自己的工作/全部
  // 就不用抓。
  useEffect(() => {
    if (!activeJob || isOwnActiveJob) return
    api.fetchFriendShifts(activeJob.userId).then(setSharedShifts).catch(() => setSharedShifts([]))
  }, [activeJob, isOwnActiveJob])

  // 別人分享給我的工作，團隊班表（同事名字）也要看整份工作的，不限於自己
  // 上傳的批次，這樣才看得到其他同事，不只自己被標記到的那幾筆
  const reloadSharedTeamShifts = useCallback(() => {
    if (!activeJob || isOwnActiveJob) return
    const lastDay = new Date(year, month, 0).getDate()
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    api.fetchTeamShiftsForJob(activeJob.id, start, end).then(setSharedTeamShifts).catch(() => setSharedTeamShifts([]))
  }, [activeJob, isOwnActiveJob, year, month])

  useEffect(() => {
    reloadSharedTeamShifts()
  }, [reloadSharedTeamShifts])

  const sharedShiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {}
    for (const s of sharedShifts) {
      if (activeJob && s.job?.id !== activeJob.id) continue
      const d = s.date.slice(0, 10)
      if (!map[d]) map[d] = []
      map[d].push({
        id: s.id,
        job_id: s.job?.id ?? null,
        job_name: s.job?.name ?? null,
        job_color: s.job?.color ?? null,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        shift_type: s.shift_type,
        note: s.note,
      })
    }
    return map
  }, [sharedShifts, activeJob])

  // 月曆格子顯示用：預設只顯示目前選中工作的班表，切到「全部」才顯示合併結果；
  // 選到別人分享給我的工作則改顯示對方的唯讀班表。
  const visibleShiftsByDate = useMemo(() => {
    if (activeJob && !isOwnActiveJob && !showAllJobs) return sharedShiftsByDate
    if (showAllJobs || jobs.length <= 1) return shiftsByDate
    const jobId = activeJobId ?? jobs[0]?.id
    const map: Record<string, Shift[]> = {}
    for (const [date, list] of Object.entries(shiftsByDate)) {
      const filtered = list.filter(s => s.job_id === jobId)
      if (filtered.length) map[date] = filtered
    }
    return map
  }, [shiftsByDate, sharedShiftsByDate, showAllJobs, activeJobId, activeJob, isOwnActiveJob, jobs])

  // 領現的月曆標記要照目前選的工作分開顯示，不然切到別的工作 tab 也會看到
  // 這個月其他工作領過現的日期（note 判斷只看「領現 日期」結尾，沒有分工作）
  const advanceDates = useMemo(() => {
    const set = new Set<string>()
    const relevantJobs = showAllJobs || jobs.length <= 1 ? jobs : jobs.filter(j => j.id === (activeJobId ?? jobs[0]?.id))
    for (const job of relevantJobs) {
      const prefix = advancePrefix(job)
      for (const t of transactions) {
        if (t.type !== 'income' || !t.note.startsWith(prefix)) continue
        const match = t.note.match(/領現 (\d{4}-\d{2}-\d{2})$/)
        if (match) set.add(match[1])
      }
    }
    return set
  }, [transactions, jobs, showAllJobs, activeJobId, advancePrefix])

  // 好友幫我上傳班表、標成「這是我本人」的班——切到「全部」才混在一起看，
  // 選單一個工作 tab 時只顯示屬於那份工作的，不會每個 tab 都看到同一筆提示
  const matchedShiftsByDate = useMemo(() => {
    const map: Record<string, api.MatchedRosterShift[]> = {}
    const relevant = showAllJobs || !activeJob ? matchedShifts : matchedShifts.filter(s => s.jobId === activeJob.id)
    for (const s of relevant) {
      if (!map[s.date]) map[s.date] = []
      map[s.date].push(s)
    }
    return map
  }, [matchedShifts, showAllJobs, activeJob])

  const selectedShifts = useMemo(
    () => (selectedDate ? (shiftsByDate[selectedDate] ?? []) : []),
    [selectedDate, shiftsByDate]
  )
  const selectedSharedShifts = useMemo(
    () => (selectedDate ? (sharedShiftsByDate[selectedDate] ?? []) : []),
    [selectedDate, sharedShiftsByDate]
  )

  // 從 LINE 傳照片匯入的團隊班表（同事名字，非本 App 使用者），依 job_id 分組給日期詳情用；
  // 別人分享給我的工作另外併入該工作整批的團隊班表（不限於自己上傳的批次）
  const rosterShiftsByJob = useMemo(() => {
    const map: Record<string, api.RosterViewShift[]> = {}
    for (const u of rosterUploads) {
      if (!u.jobId) continue
      if (!map[u.jobId]) map[u.jobId] = []
      map[u.jobId].push(...u.shifts)
    }
    if (activeJob && !isOwnActiveJob && sharedTeamShifts.length > 0) {
      map[activeJob.id] = [...(map[activeJob.id] ?? []), ...sharedTeamShifts]
    }
    return map
  }, [rosterUploads, activeJob, isOwnActiveJob, sharedTeamShifts])

  function teamShiftsFor(jobId: string, date: string): [string, TeamShiftPerson[]][] {
    const shiftsForJob = rosterShiftsByJob[jobId] ?? []
    // 匯入時已經標成自己的那幾列（matchedUserId === 我），改用下面「自己的班表」
    // 這筆資料顯示，這裡排除掉避免同一個人重複出現兩次。
    const working = shiftsForJob.filter(s => s.date === date && s.startTime && s.matchedUserId !== myUserId)
    const grouped = new Map<string, TeamShiftPerson[]>()
    for (const s of working) {
      const key = s.shiftType ?? (s.startTime && s.endTime ? `${s.startTime.slice(0, 5)}-${s.endTime.slice(0, 5)}` : '其他')
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ isMe: false, id: s.id, employeeName: s.employeeName, shift: s })
    }

    // 自己的班表（不管是匯入時標本人自動建立的，還是自己手動按早/晚班），
    // 只要有就直接顯示在團隊班表裡，跟著早/晚班按鈕自動同步，不用另外認領。
    const mine = selectedShifts.find(s => s.job_id === jobId)
    if (mine) {
      const key = mine.shift_type ?? `${mine.start_time.slice(0, 5)}-${mine.end_time.slice(0, 5)}`
      if (!grouped.has(key)) grouped.set(key, [])
      grouped.get(key)!.push({ isMe: true, id: `me-${mine.id}`, employeeName: myName ?? '我' })
    }

    return Array.from(grouped.entries())
  }

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
    const rate = jobRate(job)
    if (job.pay_type === 'hourly') {
      const multiplier = holidays.has(date) ? 2 : 1
      return Math.round(rate * 8 * multiplier)
    }
    return Math.round(rate / 30)
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

  async function handleToggleShift(jobId: string, preset: ShiftPreset) {
    if (!selectedDate || saving) return
    setSaving(true)
    try {
      const existing = selectedShifts.find(s => s.job_id === jobId && s.shift_type === preset.label)
      if (existing) {
        await api.deleteShift(existing.id)
        setShifts(prev => prev.filter(s => s.id !== existing.id))
      } else {
        const other = selectedShifts.find(s => s.job_id === jobId)
        if (other) {
          await api.deleteShift(other.id)
          setShifts(prev => prev.filter(s => s.id !== other.id))
        }
        const newShift = await api.upsertShift({
          job_id: jobId, date: selectedDate,
          label: preset.label, start_time: preset.start_time, end_time: preset.end_time,
        })
        setShifts(prev => [...prev, newShift])
      }
    } finally {
      setSaving(false)
    }
  }

  const dialogContent = selectedDate && (() => {
    // 選到別人分享給我的工作（不是自己的）：只顯示唯讀的班次資訊，不能排班/領現
    if (activeJob && !isOwnActiveJob && !showAllJobs) {
      return (
        <div className="flex flex-col max-h-[80vh] overflow-y-auto">
          <div className="border-b px-4 py-3 sticky top-0 bg-white dark:bg-card z-10">
            <p className="text-center text-base font-semibold">
              {year}年{parseInt(selectedDate.slice(5, 7))}月{parseInt(selectedDate.slice(8, 10))}日・{activeJob.name}
            </p>
          </div>
          <div className="flex flex-col gap-2 p-4">
            {selectedSharedShifts.length === 0 && (matchedShiftsByDate[selectedDate] ?? []).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">這天沒有排班</p>
            ) : (
              selectedSharedShifts.map(s => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5">
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: activeJob.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</p>
                  </div>
                  {s.shift_type && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {shiftTypeLabel(s.shift_type)}
                    </span>
                  )}
                </div>
              ))
            )}

            {/* 我自己在這份工作的排班（來自好友幫我上傳、標成本人的班表），這是我自己的資料，唯讀也看得到 */}
            {(matchedShiftsByDate[selectedDate] ?? []).map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 dark:border-violet-400/20 dark:bg-violet-400/10">
                <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: activeJob.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {shiftTypeLabel(s.shiftType) ?? (s.startTime ? s.startTime.slice(0, 5) : '')}
                    {s.startTime && s.endTime && ` ${s.startTime.slice(0, 5)} - ${s.endTime.slice(0, 5)}`}
                  </p>
                  <p className="text-xs text-violet-700 dark:text-violet-400">我的班</p>
                </div>
              </div>
            ))}

            {/* 團隊班表：這份工作當天還有誰上班，不限於自己上傳的批次 */}
            {teamShiftsFor(activeJob.id, selectedDate).length > 0 && (
              <div className="mt-1 flex flex-col gap-2 border-t pt-3">
                {teamShiftsFor(activeJob.id, selectedDate).map(([label, people]) => (
                  <div key={label} className="flex items-start gap-2">
                    <span className="mt-1 shrink-0 text-[10px] font-semibold text-muted-foreground">{label}</span>
                    <div className="flex flex-wrap gap-1">
                      {people.filter(p => !p.isMe).map(p => (
                        <RosterShiftPill
                          key={p.id}
                          shift={p.shift}
                          friends={friends}
                          myUserId={myUserId}
                          onChanged={reloadSharedTeamShifts}
                          onDateChanged={setSelectedDate}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

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
          {ownJobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">請先在設定中新增工作</p>
          ) : (
            (showAllJobs ? ownJobs : ownJobs.filter(j => j.id === (activeJobId ?? ownJobs[0].id))).map(job => {
              const hasShift = selectedShifts.some(s => s.job_id === job.id)
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
                  {job.presets.length === 0 ? (
                    <Link
                      href="/settings"
                      className="block rounded-xl bg-muted px-3 py-2.5 text-center text-xs text-muted-foreground hover:bg-muted/70"
                    >
                      尚未設定班別，點此到工作管理新增
                    </Link>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {job.presets.map(preset => {
                        const on = selectedShifts.some(s => s.job_id === job.id && s.shift_type === preset.label)
                        return (
                          <button
                            key={preset.id}
                            disabled={saving}
                            onClick={() => handleToggleShift(job.id, preset)}
                            className={cn(
                              'flex-1 min-w-[45%] rounded-xl py-2.5 text-sm font-medium transition-colors',
                              on ? 'text-white' : 'bg-muted text-muted-foreground'
                            )}
                            style={on ? { backgroundColor: job.color } : undefined}
                          >
                            {preset.label} {preset.start_time.slice(0, 5)}–{preset.end_time.slice(0, 5)}
                          </button>
                        )
                      })}
                    </div>
                  )}
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
                  {/* 團隊班表：從 LINE 匯入的整份排班表裡，這個工作當天有誰上班 */}
                  {teamShiftsFor(job.id, selectedDate).length > 0 && (
                    <div className="mt-3 flex flex-col gap-2 border-t pt-3">
                      {teamShiftsFor(job.id, selectedDate).map(([label, people]) => (
                        <div key={label} className="flex items-start gap-2">
                          <span className="mt-1 shrink-0 text-[10px] font-semibold text-muted-foreground">{label}</span>
                          <div className="flex flex-wrap gap-1">
                            {people.map(p => p.isMe ? (
                              <span
                                key={p.id}
                                className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-400/20 dark:text-amber-400"
                              >
                                {p.employeeName}
                              </span>
                            ) : (
                              <RosterShiftPill
                                key={p.id}
                                shift={p.shift}
                                friends={friends}
                                myUserId={myUserId}
                                onChanged={loadData}
                                onDateChanged={setSelectedDate}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}

          {/* 好友幫我上傳班表、標成「這是我本人」的班——跟目前選的工作 tab 無關 */}
          {(matchedShiftsByDate[selectedDate] ?? []).length > 0 && (
            <div className="rounded-2xl bg-violet-50 p-3 dark:bg-violet-400/10">
              <p className="mb-2 text-xs font-semibold text-violet-700 dark:text-violet-400">好友幫你排的班</p>
              <div className="flex flex-wrap gap-1.5">
                {(matchedShiftsByDate[selectedDate] ?? []).map(s => (
                  <span key={s.id} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium shadow-sm dark:bg-card">
                    {shiftTypeLabel(s.shiftType) ?? (s.startTime ? s.startTime.slice(0, 5) : '')}
                    {s.startTime && s.endTime && ` ${s.startTime.slice(0, 5)}–${s.endTime.slice(0, 5)}`}
                  </span>
                ))}
              </div>
            </div>
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
      <div className="flex items-center justify-between px-5 pt-4 pb-4 lg:pt-8">
        <div className="flex items-center gap-2">
          <MonthNav year={year} month={month} onPrev={prevMonth} onNext={nextMonth} />
        </div>
        <div className="flex items-center gap-3">
          {/* 工作切換器（桌機）：預設分開顯示各自班表/薪資，「全部」才合併。手機版拿掉 tab，改左右滑動 */}
          {jobs.length > 1 && (
            <div className="hidden gap-1.5 overflow-x-auto scrollbar-none lg:flex">
              <button
                onClick={() => setShowAllJobs(true)}
                className={cn(
                  'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                  showAllJobs ? 'border-foreground bg-foreground text-background' : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted/40'
                )}
              >
                全部
              </button>
              {jobs.map(job => {
                const selected = !showAllJobs && (activeJobId ?? jobs[0].id) === job.id
                return (
                  <button
                    key={job.id}
                    onClick={() => { setActiveJobId(job.id); setShowAllJobs(false) }}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      selected ? 'text-white' : 'border-muted-foreground/20 text-muted-foreground hover:bg-muted/40'
                    )}
                    style={selected ? { backgroundColor: job.color, borderColor: job.color } : undefined}
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: selected ? '#fff' : job.color }} />
                    {job.name}
                    {!ownJobIds.has(job.id) && <LockIcon className="size-2.5" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
      ) : (
        <div className="px-4 lg:px-6" onTouchStart={handleJobTouchStart} onTouchEnd={handleJobTouchEnd}>
          {/* 目前選中工作的公司名稱 + 同事頭像堆疊，取代原本擠在薪資卡片裡的公司名稱；
              點頭像堆疊可以打開視窗看有誰、新增或移除同事 */}
          {activeJob && (
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: activeJob.color }} />
                <span className="text-sm font-semibold">{activeJob.name}</span>
                {!isOwnActiveJob && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                    <LockIcon className="size-3" />唯讀
                  </span>
                )}
              </div>
              {canManageActiveJobCoworkers && (
                activeJobCoworkers.length > 0 ? (
                  <AvatarStack
                    people={activeJobCoworkers.map(share => ({ id: share.sharedWith.id, displayName: share.sharedWith.displayName }))}
                    onClick={() => setCoworkersDialogOpen(true)}
                  />
                ) : (
                  <button
                    onClick={() => setCoworkersDialogOpen(true)}
                    className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
                  >
                    <UserPlusIcon className="size-4" />
                  </button>
                )
              )}
            </div>
          )}

          <JobCoworkersDialog
            job={coworkersDialogOpen ? activeJob : null}
            shares={activeJobCoworkers}
            friends={friends}
            onOpenChange={setCoworkersDialogOpen}
            onChanged={reloadActiveJobShares}
            canGrantManage={isOwnActiveJob}
          />

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
                const dayShifts = visibleShiftsByDate[dateStr] ?? []
                const dayMatchedShifts = matchedShiftsByDate[dateStr] ?? []
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
                          style={{ backgroundColor: s.job_color ?? '#9CA3AF' }}
                        >
                          {shiftTypeLabel(s.shift_type) ?? s.start_time.slice(0, 5)}
                        </span>
                      ))}
                      {dayMatchedShifts.length > 0 && (
                        <span
                          className="truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-none text-white"
                          style={{ backgroundColor: jobs.find(j => j.id === dayMatchedShifts[0].jobId)?.color ?? '#9CA3AF' }}
                        >
                          {shiftTypeLabel(dayMatchedShifts[0].shiftType) ?? dayMatchedShifts[0].startTime?.slice(0, 5)}
                        </span>
                      )}
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

          {/* 手機版目前檢視指示（可左右滑動切換），只在有多個工作時顯示 */}
          {jobs.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2 lg:hidden">
              {jobViewSequence.map((view, i) => (
                <span
                  key={view.kind === 'all' ? 'all' : view.job.id}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === currentJobViewIndex ? 'w-4 bg-foreground' : 'w-1.5 bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>
          )}

          {/* Salary preview——別人分享給我的工作看不到薪資，那是對方的薪資不是我的 */}
          {isOwnActiveJob && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm font-semibold">本月薪資預估</p>

              {(() => {
                // 薪資一律只顯示目前切換器選中的那個工作，不受「全部」合併顯示影響——每份工作的薪資本來就該分開算
                const job = activeJob
                if (!job) return null
                const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
                const jobShifts = shifts.filter(s => s.job_id === job.id && s.date.startsWith(monthPrefix))
                const holidayShiftCount = jobShifts.filter(s => holidays.has(s.date.slice(0, 10))).length
                const rate = jobRate(job)
                // 國定假日出勤雙倍工資（勞基法）：時薪制當天薪資直接乘 2，月薪制則是全薪之外
                // 再加發一天日薪（月薪 ÷ 30）作為假日出勤獎金
                const gross = job.pay_type === 'hourly'
                  ? jobShifts.reduce((sum, s) => {
                      const multiplier = holidays.has(s.date.slice(0, 10)) ? 2 : 1
                      return sum + rate * 8 * multiplier
                    }, 0)
                  : rate + holidayShiftCount * (rate / 30)
                const deduction = job.labor_insurance_fee + job.health_insurance_fee + job.welfare_fee
                const net = gross - deduction
                return (
                  <div key={job.id} className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
                    <div className="flex items-center gap-2 border-b px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {job.pay_type === 'hourly'
                          ? `${jobShifts.length} 班 · ${jobShifts.length * 8} 小時`
                          : `${jobShifts.length} 班`}
                        {holidayShiftCount > 0 && `・${holidayShiftCount} 天假日加成`}
                      </span>
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
              })()}
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
