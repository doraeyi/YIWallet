'use client'

import { useRef, useState } from 'react'
import { PlusIcon, Trash2Icon, UploadIcon, PencilLineIcon, ChevronLeftIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import * as api from '@/lib/api'
import type { ProductInput, ProductImportResult } from '@/lib/types'
import { cn } from '@/lib/utils'

interface AddProductSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: () => void
}

type Step = 'choose' | 'manual' | 'csv'

const TYPE_OPTIONS = ['EAN13', 'EAN8', 'CODE128', 'UPCA', 'UPCE']

interface ManualRow {
  itemNo: string
  type: string
  code: string
  name: string
  event: string
}

function emptyRow(): ManualRow {
  return { itemNo: '', type: 'EAN13', code: '', name: '', event: '' }
}

export function AddProductSheet({ open, onOpenChange, onImported }: AddProductSheetProps) {
  const isDesktop = useIsDesktop()
  const [step, setStep] = useState<Step>('choose')
  const [rows, setRows] = useState<ManualRow[]>([emptyRow()])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ProductImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('choose')
    setRows([emptyRow()])
    setCsvFile(null)
    setSubmitting(false)
    setError('')
    setResult(null)
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  function updateRow(i: number, patch: Partial<ManualRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function removeRow(i: number) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  async function submitManual() {
    const complete: ProductInput[] = rows
      .filter(r => r.itemNo.trim() && r.code.trim() && r.name.trim())
      .map(r => ({ itemNo: r.itemNo.trim(), type: r.type, code: r.code.trim(), name: r.name.trim(), event: r.event.trim() || undefined }))

    if (complete.length === 0) {
      setError('至少要有一筆填完品號、條碼、名稱')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const res = await api.createProducts(complete)
      setResult(res)
      onImported?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitCsv() {
    if (!csvFile) return
    setSubmitting(true)
    setError('')
    try {
      const res = await api.importProductsCsv(csvFile)
      setResult(res)
      onImported?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '匯入失敗')
    } finally {
      setSubmitting(false)
    }
  }

  const title = step === 'choose' ? '新增商品' : step === 'manual' ? '手動新增' : 'CSV 匯入'

  const body = (
    <div className="flex flex-col gap-4 p-5">
      {step === 'choose' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setStep('manual')}
            className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 text-left hover:bg-muted/50"
          >
            <PencilLineIcon className="size-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">手動輸入</p>
              <p className="text-xs text-muted-foreground">一次填多筆品號、條碼、名稱</p>
            </div>
          </button>
          <button
            onClick={() => setStep('csv')}
            className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4 text-left hover:bg-muted/50"
          >
            <UploadIcon className="size-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">CSV 匯入</p>
              <p className="text-xs text-muted-foreground">欄位：Type, ID, Name, Event</p>
            </div>
          </button>
        </div>
      )}

      {step === 'manual' && !result && (
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">第 {i + 1} 筆</span>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2Icon className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={row.itemNo}
                  onChange={e => updateRow(i, { itemNo: e.target.value })}
                  placeholder="品號（必填）"
                  className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
                />
                <select
                  value={row.type}
                  onChange={e => updateRow(i, { type: e.target.value })}
                  className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
                >
                  {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <input
                value={row.code}
                onChange={e => updateRow(i, { code: e.target.value })}
                placeholder="條碼（必填）"
                className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
              />
              <input
                value={row.name}
                onChange={e => updateRow(i, { name: e.target.value })}
                placeholder="商品名稱（必填）"
                className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
              />
              <input
                value={row.event}
                onChange={e => updateRow(i, { event: e.target.value })}
                placeholder="備註（選填）"
                className="rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:border-amber-400"
              />
            </div>
          ))}

          <button
            onClick={() => setRows(prev => [...prev, emptyRow()])}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2.5 text-sm text-muted-foreground hover:bg-muted/30"
          >
            <PlusIcon className="size-4" /> 新增一列
          </button>

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>}

          <button
            onClick={submitManual}
            disabled={submitting}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {submitting ? '新增中…' : `儲存${rows.length > 1 ? ` ${rows.length} 筆` : ''}`}
          </button>
        </div>
      )}

      {step === 'csv' && !result && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">CSV 欄位需要是：Type, ID, Name, Event（Name 前面的 6 位數品號會自動拆出來）</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={e => setCsvFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">{error}</p>}
          <button
            onClick={submitCsv}
            disabled={!csvFile || submitting}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {submitting ? '匯入中…' : '上傳並匯入'}
          </button>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm dark:bg-emerald-900/20">
            <p className="font-semibold text-emerald-700 dark:text-emerald-400">✅ 新增 {result.inserted} 筆</p>
            {result.skipped > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                略過 {result.skipped} 筆重複品號
                {result.duplicateItemNos.length > 0 && `（${result.duplicateItemNos.slice(0, 10).join('、')}${result.skipped > 10 ? '…' : ''}）`}
              </p>
            )}
          </div>
          <button
            onClick={close}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white hover:bg-amber-500"
          >
            完成
          </button>
        </div>
      )}
    </div>
  )

  const header = (
    <div className="flex items-center justify-between border-b px-4 py-3">
      {step !== 'choose' && !result ? (
        <button
          onClick={() => setStep('choose')}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
      ) : <div className="size-8" />}
      <span className="text-base font-semibold">{title}</span>
      <div className="size-8" />
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={o => { if (!o) close(); else onOpenChange(o) }}>
        <DialogContent showCloseButton={false} className={cn('p-0 max-w-md overflow-y-auto max-h-[90dvh]')}>
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {header}
          {body}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={o => { if (!o) close(); else onOpenChange(o) }}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl p-0 max-h-[90dvh] overflow-y-auto">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {header}
        {body}
      </SheetContent>
    </Sheet>
  )
}
