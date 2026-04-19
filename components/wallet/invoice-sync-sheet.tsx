'use client'

import { useState, useEffect, useCallback } from 'react'
import { XIcon, CheckIcon, Loader2Icon, RefreshCwIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { useTransactions } from '@/hooks/use-transactions'
import { CATEGORIES } from '@/lib/types'
import { formatCurrency } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'
import type { InvoiceItem } from '@/lib/invoice-utils'

interface SelectableInvoice extends InvoiceItem {
  selected: boolean
  category: string
  alreadyImported: boolean
}

type Status = 'idle' | 'loading' | 'loaded' | 'importing' | 'error'

interface InvoiceSyncSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  carrierCode: string
  carrierVerify: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
}

const EXPENSE_CATEGORIES = CATEGORIES.filter(c => c.type === 'expense')

export function InvoiceSyncSheet({
  open,
  onOpenChange,
  carrierCode,
  carrierVerify,
  startDate,
  endDate,
}: InvoiceSyncSheetProps) {
  const isDesktop = useIsDesktop()
  const { transactions, addTransaction } = useTransactions()
  const [status, setStatus] = useState<Status>('idle')
  const [invoices, setInvoices] = useState<SelectableInvoice[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  function isAlreadyImported(inv: InvoiceItem): boolean {
    return transactions.some(
      t => t.date === inv.date && t.note === inv.sellerName && t.amount === inv.amount && t.type === 'expense',
    )
  }

  const fetchInvoices = useCallback(async () => {
    if (!carrierCode) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/invoice/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardNo: carrierCode, cardVerify: carrierVerify, startDate, endDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? '查詢失敗')
        setStatus('error')
        return
      }
      const items: SelectableInvoice[] = (data.invoices as InvoiceItem[]).map(inv => {
        const dup = isAlreadyImported(inv)
        return { ...inv, selected: !dup, category: inv.suggestedCategory, alreadyImported: dup }
      })
      setInvoices(items)
      setStatus('loaded')
    } catch {
      setErrorMsg('網路錯誤，請稍後再試')
      setStatus('error')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierCode, carrierVerify, startDate, endDate])

  useEffect(() => {
    if (open && carrierCode) {
      fetchInvoices()
    }
    if (!open) {
      setStatus('idle')
      setInvoices([])
    }
  }, [open, fetchInvoices, carrierCode])

  function toggleAll(val: boolean) {
    setInvoices(prev => prev.map(inv => inv.alreadyImported ? inv : { ...inv, selected: val }))
  }

  function toggleOne(invoiceNo: string) {
    setInvoices(prev =>
      prev.map(inv => inv.invoiceNo === invoiceNo ? { ...inv, selected: !inv.selected } : inv),
    )
  }

  function setCategory(invoiceNo: string, category: string) {
    setInvoices(prev =>
      prev.map(inv => inv.invoiceNo === invoiceNo ? { ...inv, category } : inv),
    )
  }

  async function handleImport() {
    const selected = invoices.filter(i => i.selected && !i.alreadyImported)
    if (!selected.length) return
    setStatus('importing')
    for (const inv of selected) {
      await addTransaction({
        type: 'expense',
        amount: inv.amount,
        category: inv.category,
        note: inv.sellerName,
        date: inv.date,
      })
    }
    onOpenChange(false)
  }

  const selectedCount = invoices.filter(i => i.selected && !i.alreadyImported).length
  const selectedTotal = invoices
    .filter(i => i.selected && !i.alreadyImported)
    .reduce((s, i) => s + i.amount, 0)
  const allSelected = invoices.filter(i => !i.alreadyImported).every(i => i.selected)

  const inner = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b shrink-0">
        <button
          onClick={() => onOpenChange(false)}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <XIcon className="size-4" />
        </button>
        <span className="text-base font-semibold">匯入電子發票</span>
        <div className="size-8" />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Loader2Icon className="size-8 animate-spin" />
            <p className="text-sm">正在查詢財政部資料…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
            <p className="text-sm text-rose-500">{errorMsg}</p>
            <button
              onClick={fetchInvoices}
              className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
            >
              <RefreshCwIcon className="size-4" />
              重試
            </button>
          </div>
        )}

        {status === 'loaded' && invoices.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <p className="text-sm">此區間沒有發票記錄</p>
          </div>
        )}

        {status === 'loaded' && invoices.length > 0 && (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b">
              <p className="text-xs text-muted-foreground">共找到 {invoices.length} 張發票</p>
              <button
                onClick={() => toggleAll(!allSelected)}
                className="text-xs font-medium text-amber-500 hover:text-amber-600"
              >
                {allSelected ? '全不選' : '全選'}
              </button>
            </div>

            <div className="divide-y">
              {invoices.map(inv => {
                const cat = EXPENSE_CATEGORIES.find(c => c.id === inv.category)
                return (
                  <div
                    key={inv.invoiceNo}
                    className={cn('flex items-start gap-3 px-4 py-3', inv.alreadyImported && 'opacity-50')}
                  >
                    <button
                      onClick={() => !inv.alreadyImported && toggleOne(inv.invoiceNo)}
                      className="mt-0.5 shrink-0"
                      disabled={inv.alreadyImported}
                    >
                      <span className={cn(
                        'flex size-5 items-center justify-center rounded border-2 transition-colors',
                        inv.selected && !inv.alreadyImported
                          ? 'border-amber-400 bg-amber-400'
                          : 'border-muted-foreground/40',
                      )}>
                        {inv.selected && !inv.alreadyImported && <CheckIcon className="size-3 text-white" />}
                      </span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{inv.sellerName}</p>
                        <p className="shrink-0 text-sm font-semibold text-rose-500">
                          -{formatCurrency(inv.amount)}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{inv.date}</p>
                        {inv.alreadyImported ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            已匯入
                          </span>
                        ) : (
                          <select
                            value={inv.category}
                            onChange={e => setCategory(inv.invoiceNo, e.target.value)}
                            className="rounded-lg border bg-muted/30 px-1.5 py-0.5 text-xs outline-none focus:border-ring"
                          >
                            {EXPENSE_CATEGORIES.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.emoji} {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {status === 'loaded' && invoices.length > 0 && (
        <div className="shrink-0 border-t px-4 py-3">
          <div className="mb-2.5 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">已選 {selectedCount} 筆</span>
            <span className="font-semibold text-rose-500">{formatCurrency(selectedTotal)}</span>
          </div>
          <button
            onClick={handleImport}
            disabled={selectedCount === 0 || status === ('importing' as Status)}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white transition-opacity hover:bg-amber-500 disabled:opacity-50"
          >
            {status === ('importing' as Status) ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2Icon className="size-4 animate-spin" />
                匯入中…
              </span>
            ) : (
              `匯入 ${selectedCount} 筆`
            )}
          </button>
        </div>
      )}
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm flex flex-col max-h-[85dvh]">
          <DialogTitle className="sr-only">匯入電子發票</DialogTitle>
          {inner}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0 max-h-[92dvh] flex flex-col">
        <SheetTitle className="sr-only">匯入電子發票</SheetTitle>
        {inner}
      </SheetContent>
    </Sheet>
  )
}
