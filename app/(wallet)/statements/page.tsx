'use client'

import { useState, useRef } from 'react'
import { UploadIcon, CheckIcon, AlertCircleIcon, FileTextIcon } from 'lucide-react'
import { parseCarrierCsv, type ParsedInvoice } from '@/lib/csv-parser'
import { useTransactions } from '@/hooks/use-transactions'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api'

interface InvoiceItem extends ParsedInvoice {
  selected: boolean
  duplicate: boolean
}

export default function StatementsPage() {
  const { transactions, refetch } = useTransactions()
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCarrierCsv(text)

      // 重複偵測：同日期 + 同金額視為可能重複
      const result: InvoiceItem[] = parsed.map(inv => {
        const duplicate = transactions.some(
          tx => tx.date === inv.date && tx.amount === inv.amount
        )
        return { ...inv, selected: !duplicate, duplicate }
      })
      setItems(result)
      setImported(0)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function toggleAll(checked: boolean) {
    setItems(prev => prev.map(i => ({ ...i, selected: i.duplicate ? false : checked })))
  }

  function toggleItem(invoiceNo: string) {
    setItems(prev => prev.map(i =>
      i.invoiceNo === invoiceNo ? { ...i, selected: !i.selected } : i
    ))
  }

  async function handleImport() {
    const toImport = items.filter(i => i.selected)
    if (!toImport.length) return
    setImporting(true)
    let count = 0
    for (const inv of toImport) {
      try {
        await api.createTransaction({
          type: 'expense',
          amount: inv.amount,
          category: inv.categoryId,
          note: inv.items.join('、') || inv.merchant,
          date: inv.date,
        })
        count++
      } catch {}
    }
    await refetch()
    setImported(count)
    setItems(prev => prev.map(i => i.selected ? { ...i, selected: false, duplicate: true } : i))
    setImporting(false)
  }

  const selectedCount = items.filter(i => i.selected).length
  const allSelected = items.filter(i => !i.duplicate).every(i => i.selected)

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold">載具發票匯入</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">從財政部電子發票平台下載 CSV，上傳後批次建立支出記錄</p>
      </div>

      {/* 上傳區 */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-muted-foreground/30 py-12 transition-colors hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/10"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <UploadIcon className="size-5 text-muted-foreground" />
        </span>
        <div className="text-center">
          <p className="text-sm font-medium">點擊或拖曳 CSV 檔案</p>
          <p className="mt-0.5 text-xs text-muted-foreground">財政部電子發票平台 → 載具發票查詢 → 下載</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* 匯入成功提示 */}
      {imported > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:text-green-400">
          <CheckIcon className="size-4 shrink-0" />
          已匯入 {imported} 筆記錄
        </div>
      )}

      {/* 預覽列表 */}
      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={e => toggleAll(e.target.checked)}
                className="size-4 rounded accent-amber-400"
              />
              <span className="text-sm font-medium">全選（{items.length} 張發票）</span>
            </div>
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
            >
              {importing ? '匯入中…' : `匯入 ${selectedCount} 筆`}
            </button>
          </div>

          <div className="flex flex-col divide-y overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
            {items.map(item => (
              <div
                key={item.invoiceNo}
                className={cn('flex items-start gap-3 px-4 py-3', item.duplicate && 'opacity-50')}
              >
                <input
                  type="checkbox"
                  checked={item.selected}
                  disabled={item.duplicate}
                  onChange={() => toggleItem(item.invoiceNo)}
                  className="mt-0.5 size-4 rounded accent-amber-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{item.merchant}</p>
                    <p className="shrink-0 text-sm font-semibold">${item.amount}</p>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                    {item.items.length > 0 && (
                      <p className="truncate text-xs text-muted-foreground">
                        {item.items.slice(0, 2).join('、')}{item.items.length > 2 ? `…等 ${item.items.length} 項` : ''}
                      </p>
                    )}
                  </div>
                </div>
                {item.duplicate && (
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    <AlertCircleIcon className="size-3" />
                    可能重複
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {items.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileTextIcon className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">上傳 CSV 後，發票明細會顯示在這裡</p>
        </div>
      )}
    </div>
  )
}
