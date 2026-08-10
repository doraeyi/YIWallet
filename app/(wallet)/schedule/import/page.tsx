'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, ImageIcon, RefreshCwIcon, Trash2Icon, XIcon, UsersIcon, CalendarPlusIcon } from 'lucide-react'
import * as api from '@/lib/api'
import type { Job } from '@/lib/types'
import { cn } from '@/lib/utils'
import { preprocessImageForOcr } from '@/lib/image-utils'
import { parseRosterTableFromLines, parseCell } from '@/lib/roster-parser'
import { runRosterOcrClient } from '@/lib/roster-ocr-client'

interface EditableRow {
  employeeName: string
  cells: string[] // "HHmm-HHmm" 自由文字，跟日期欄一一對應
}

// Tesseract.js 第一次跑會先下載語言包，進度訊息翻成中文比較好懂
const OCR_STATUS_LABELS: Record<string, string> = {
  'loading tesseract core': '載入 OCR 核心',
  'initializing tesseract': '初始化 OCR',
  'loading language traineddata': '下載中文語言包',
  'initializing api': '準備辨識',
  'recognizing text': '辨識文字中',
}

export default function RosterImportPage() {
  const [mode, setMode] = useState<'list' | 'review'>('list')
  const [permissionChecking, setPermissionChecking] = useState(true)
  const [hasOcrPermission, setHasOcrPermission] = useState(false)

  const [jobs, setJobs] = useState<Job[]>([])
  const [pending, setPending] = useState<api.PendingRosterPhoto[]>([])
  const [pendingLoading, setPendingLoading] = useState(true)
  const [recognizing, setRecognizing] = useState(false)
  const [recognizeProgress, setRecognizeProgress] = useState<string | null>(null)
  const [listMessage, setListMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 校正頁狀態 ──
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [dates, setDates] = useState<string[]>([])
  const [rows, setRows] = useState<EditableRow[]>([])
  const [rawText, setRawText] = useState('')
  const [showRawText, setShowRawText] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/backend/users/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setHasOcrPermission(!!d?.can_use_ocr))
      .catch(() => setHasOcrPermission(false))
      .finally(() => setPermissionChecking(false))
    api.fetchJobs().then(setJobs).catch(() => {})
    loadPending()
  }, [])

  async function loadPending() {
    setPendingLoading(true)
    try {
      const list = await api.fetchPendingRosterPhotos()
      setPending(list)
    } catch {
      // 沒綁 LINE 或連不上都不影響其他功能，安靜失敗
    } finally {
      setPendingLoading(false)
    }
  }

  function startReview(guess: ReturnType<typeof parseRosterTableFromLines>, raw: string, forPendingId: string | null) {
    const guessDates = guess.dates.length > 0 ? guess.dates : [new Date().toISOString().slice(0, 10)]
    const guessRows: EditableRow[] = guess.rows.length > 0
      ? guess.rows.map(r => ({
          employeeName: r.employeeName,
          cells: guessDates.map((_, i) => r.cells[i] ?? ''),
        }))
      : [{ employeeName: '', cells: guessDates.map(() => '') }]

    setPendingId(forPendingId)
    setDates(guessDates)
    setRows(guessRows)
    setRawText(raw)
    setShowRawText(false)
    setSelectedJobId('')
    setReviewMessage(null)
    setMode('review')
  }

  async function recognizeAndReview(file: File, forPendingId: string | null) {
    setRecognizing(true)
    setRecognizeProgress(null)
    setListMessage(null)
    try {
      const dataUrl = await preprocessImageForOcr(file)
      const { lines, rawText: raw } = await runRosterOcrClient(dataUrl, (status, progress) => {
        setRecognizeProgress(`${OCR_STATUS_LABELS[status] ?? status}${progress > 0 ? `（${Math.round(progress * 100)}%）` : ''}`)
      })
      const guess = parseRosterTableFromLines(lines, raw)
      startReview(guess, raw, forPendingId)
    } catch (e) {
      setListMessage(e instanceof Error ? e.message : '辨識失敗')
    } finally {
      setRecognizing(false)
      setRecognizeProgress(null)
    }
  }

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await recognizeAndReview(file, null)
  }

  async function processPending(item: api.PendingRosterPhoto) {
    setRecognizing(true)
    setListMessage(null)
    try {
      const res = await fetch(api.pendingRosterPhotoImageUrl(item.id))
      if (!res.ok) throw new Error('下載照片失敗')
      const blob = await res.blob()
      const file = new File([blob], `${item.id}.jpg`, { type: blob.type || 'image/jpeg' })
      await recognizeAndReview(file, item.id)
    } catch (e) {
      setRecognizing(false)
      setListMessage(e instanceof Error ? e.message : '下載照片失敗')
    }
  }

  async function deletePending(item: api.PendingRosterPhoto) {
    await api.deletePendingRosterPhoto(item.id)
    await loadPending()
  }

  // ── 校正頁操作 ──

  function addRow() {
    setRows(prev => [...prev, { employeeName: '', cells: dates.map(() => '') }])
  }

  function removeRow(index: number) {
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  function addColumn() {
    const last = dates[dates.length - 1]
    const next = last ? addDays(last, 1) : new Date().toISOString().slice(0, 10)
    setDates(prev => [...prev, next])
    setRows(prev => prev.map(r => ({ ...r, cells: [...r.cells, ''] })))
  }

  function removeColumn(index: number) {
    setDates(prev => prev.filter((_, i) => i !== index))
    setRows(prev => prev.map(r => ({ ...r, cells: r.cells.filter((_, i) => i !== index) })))
  }

  function updateDate(index: number, value: string) {
    setDates(prev => prev.map((d, i) => (i === index ? value : d)))
  }

  function updateName(rowIndex: number, value: string) {
    setRows(prev => prev.map((r, i) => (i === rowIndex ? { ...r, employeeName: value } : r)))
  }

  function updateCell(rowIndex: number, colIndex: number, value: string) {
    setRows(prev => prev.map((r, i) =>
      i === rowIndex ? { ...r, cells: r.cells.map((c, j) => (j === colIndex ? value : c)) } : r
    ))
  }

  async function handleConfirm() {
    const shifts: api.RosterShiftEntry[] = []
    for (const row of rows) {
      const name = row.employeeName.trim()
      if (!name) continue
      dates.forEach((date, i) => {
        const parsed = parseCell(row.cells[i] ?? '')
        shifts.push({ employee_name: name, date, start_time: parsed.start, end_time: parsed.end, note: null })
      })
    }

    if (shifts.length === 0) {
      setReviewMessage('至少要有一位員工的姓名才能匯入')
      return
    }

    setSaving(true)
    setReviewMessage(null)
    try {
      const sortedDates = [...dates].sort()
      await api.confirmRosterImport({
        pendingId: pendingId ?? undefined,
        jobId: selectedJobId || null,
        periodStart: sortedDates[0],
        periodEnd: sortedDates[sortedDates.length - 1],
        shifts,
      })
      setMode('list')
      await loadPending()
    } catch (e) {
      setReviewMessage(e instanceof Error ? e.message : '匯入失敗')
    } finally {
      setSaving(false)
    }
  }

  if (permissionChecking) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
    )
  }

  if (!hasOcrPermission) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-3xl">🔒</p>
        <p className="text-sm text-muted-foreground">這個功能目前需要權限才能使用，請聯絡管理員開通</p>
        <Link href="/schedule" className="mt-2 text-xs text-amber-500 hover:text-amber-600">回排班頁</Link>
      </div>
    )
  }

  if (mode === 'review') {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:pt-8">
          <button onClick={() => setMode('list')} className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
            <ChevronLeftIcon className="size-5" />
          </button>
          <h1 className="text-xl font-bold">校正班表</h1>
        </div>

        <div className="flex flex-col gap-4 px-4 pb-24 lg:px-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">匯入到哪個工作</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-ring"
            >
              <option value="">不指定</option>
              {jobs.map(job => (
                <option key={job.id} value={job.id}>{job.name}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-card">
            <table className="border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 z-10 min-w-24 bg-white px-2 py-2 text-left text-xs font-medium text-muted-foreground dark:bg-card">姓名</th>
                  {dates.map((date, i) => (
                    <th key={i} className="min-w-28 px-1.5 py-2 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={date}
                          onChange={e => updateDate(i, e.target.value)}
                          className="w-full min-w-0 rounded-lg border bg-muted/30 px-1 py-1 text-xs outline-none"
                        />
                        <button onClick={() => removeColumn(i)} className="shrink-0 text-muted-foreground hover:text-rose-500">
                          <XIcon className="size-3.5" />
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-white px-2 py-1.5 dark:bg-card">
                      <input
                        value={row.employeeName}
                        onChange={e => updateName(r, e.target.value)}
                        placeholder="姓名"
                        className="w-24 rounded-lg border bg-muted/30 px-2 py-1.5 text-sm outline-none focus:border-ring"
                      />
                    </td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className="px-1.5 py-1.5">
                        <input
                          value={cell}
                          onChange={e => updateCell(r, i, e.target.value)}
                          placeholder="-"
                          className="w-24 rounded-lg border bg-muted/30 px-2 py-1.5 text-center text-xs outline-none focus:border-ring"
                        />
                      </td>
                    ))}
                    <td className="px-1.5">
                      <button onClick={() => removeRow(r)} className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500">
                        <Trash2Icon className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2">
            <button
              onClick={addRow}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/40"
            >
              <UsersIcon className="size-4" />
              新增員工
            </button>
            <button
              onClick={addColumn}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-medium hover:bg-muted/40"
            >
              <CalendarPlusIcon className="size-4" />
              新增日期
            </button>
          </div>

          {reviewMessage && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{reviewMessage}</p>
          )}

          {rawText && (
            <div>
              <button
                onClick={() => setShowRawText(v => !v)}
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                {showRawText ? '隱藏辨識原文' : '顯示辨識原文'}
              </button>
              {showRawText && (
                <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground">
                  {rawText}
                </pre>
              )}
            </div>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t bg-white p-4 dark:bg-card lg:left-64">
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 hover:bg-amber-500"
          >
            {saving ? '匯入中…' : '確認匯入'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:pt-8">
        <Link href="/schedule" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">班表匯入</h1>
      </div>

      <div className="flex flex-col gap-4 px-4 pb-6 lg:px-6">
        <p className="text-xs text-muted-foreground">
          在 LINE 傳文字「班表」給 Bot，10 分鐘內把排班表照片傳過去就會出現在下面的待處理清單；也可以直接從相簿選照片。辨識完一律會先進到校正畫面，確認沒問題再送出。
        </p>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">待處理照片（LINE 轉傳）</p>
            <button onClick={loadPending} disabled={pendingLoading} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
              <RefreshCwIcon className={cn('size-4', pendingLoading && 'animate-spin')} />
            </button>
          </div>

          {pendingLoading ? (
            <p className="py-3 text-center text-sm text-muted-foreground">載入中…</p>
          ) : pending.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">目前沒有待處理的照片</p>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-card">
                  <span className="text-sm">{formatDateTime(item.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deletePending(item)}
                      disabled={recognizing}
                      className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                    >
                      <Trash2Icon className="size-4" />
                    </button>
                    <button
                      onClick={() => processPending(item)}
                      disabled={recognizing}
                      className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                    >
                      辨識校正
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={recognizing}
          className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/30 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-amber-400 hover:bg-amber-50/50 disabled:opacity-50 dark:hover:bg-amber-950/10"
        >
          <ImageIcon className="size-5" />
          從相簿選擇照片
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickFile} />

        {recognizing && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <div className="size-4 animate-spin rounded-full border-2 border-muted border-t-amber-400" />
            {recognizeProgress ?? '辨識中…'}
          </div>
        )}

        {listMessage && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{listMessage}</p>
        )}
      </div>
    </div>
  )
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
