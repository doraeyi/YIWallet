'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, XIcon, ImageIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/finance-utils'
import { useCards } from '@/hooks/use-cards'
import * as api from '@/lib/api'
import type { PendingBankScreenshot } from '@/lib/api'

type Tab = 'bank' | 'roster'

function formatDateTime(iso: string): string {
  // 後端回傳的是沒有時區標記的 UTC 時間字串（例如 "2026-08-17T05:12:17"），
  // 瀏覽器解析時如果沒看到 'Z' 會誤判成本地時間，導致顯示少 8 小時——
  // 這裡明確補上 'Z' 讓 Date 正確當成 UTC 解析，toLocaleString 才會轉對時區。
  const d = new Date(iso.endsWith('Z') ? iso : `${iso}Z`)
  return d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function BankScreenshotCard({
  item, cards, dismissing, importing, onDismiss, onImport,
}: {
  item: PendingBankScreenshot
  cards: { id: string; name: string }[]
  dismissing: boolean
  importing: boolean
  onDismiss: () => void
  onImport: (data: { amount: number; cardId: string | null; note: string | null; date: string | null }) => void
}) {
  const recognized = item.ocrProcessed && item.parsedAmount != null
  const [amount, setAmount] = useState(item.parsedAmount != null ? String(item.parsedAmount) : '')
  const [cardId, setCardId] = useState(item.matchedCardId ?? '')
  const [note, setNote] = useState(item.parsedMerchant ?? '')

  const amountValue = parseFloat(amount)
  const canImport = !isNaN(amountValue) && amountValue > 0

  function handleImportClick() {
    if (!canImport) return
    onImport({
      amount: amountValue,
      cardId: cardId || null,
      note: note.trim() || null,
      date: item.parsedTransactionAt ? item.parsedTransactionAt.slice(0, 10) : null,
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-card">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <span className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
        <button
          onClick={onDismiss}
          disabled={dismissing || importing}
          className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/70 disabled:opacity-50"
        >
          <XIcon className="size-3" />
          {dismissing ? '處理中…' : '略過'}
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={api.bankScreenshotImageUrl(item.id)}
        alt="銀行通知截圖"
        className="max-h-96 w-full object-contain bg-muted/20"
      />
      <div className="flex flex-col gap-2.5 p-4">
        {recognized && (
          <p className="text-xs text-emerald-600">
            ✓ 已自動辨識{item.matchedCardName ? `，卡片對到「${item.matchedCardName}」` : item.parsedLastFour ? `（卡末四碼 ${item.parsedLastFour} 沒有對到已登記的卡片）` : ''}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">金額</label>
            <input
              type="number" min="0" value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">卡片</label>
            <select
              value={cardId}
              onChange={e => setCardId(e.target.value)}
              className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
            >
              <option value="">現金／不指定</option>
              {cards.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">備註（商店名稱）</label>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="例：統一超商"
            className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-ring"
          />
        </div>
        <button
          onClick={handleImportClick}
          disabled={!canImport || importing || dismissing}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
        >
          <CheckIcon className="size-4" />
          {importing ? '匯入中…' : `匯入${canImport ? `　-${formatCurrency(amountValue)}` : ''}`}
        </button>
      </div>
    </div>
  )
}

export default function BankNotifyPage() {
  const [tab, setTab] = useState<Tab>('bank')
  const { cards } = useCards()

  const [bankItems, setBankItems] = useState<PendingBankScreenshot[]>([])
  const [bankLoading, setBankLoading] = useState(true)
  const [dismissingId, setDismissingId] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)

  const [rosterItems, setRosterItems] = useState<api.PendingRosterPhoto[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)

  async function loadBank() {
    setBankLoading(true)
    try {
      setBankItems(await api.fetchPendingBankScreenshots())
    } catch {
      setBankItems([])
    } finally {
      setBankLoading(false)
    }
  }

  async function loadRoster() {
    setRosterLoading(true)
    try {
      setRosterItems(await api.fetchPendingRosterPhotos())
    } catch {
      setRosterItems([])
    } finally {
      setRosterLoading(false)
    }
  }

  useEffect(() => { loadBank(); loadRoster() }, [])

  async function handleDismiss(id: string) {
    setDismissingId(id)
    try {
      await api.dismissBankScreenshot(id)
      setBankItems(prev => prev.filter(i => i.id !== id))
    } finally {
      setDismissingId(null)
    }
  }

  async function handleImport(id: string, data: { amount: number; cardId: string | null; note: string | null; date: string | null }) {
    setImportingId(id)
    try {
      await api.importPendingScreenshot(id, data)
      setBankItems(prev => prev.filter(i => i.id !== id))
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-lg lg:pt-8">
        <Link href="/dashboard" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="text-xl font-bold">待確認記帳</h1>
      </div>

      <div className="px-4 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
        <div className="flex gap-1.5">
          {([
            { key: 'bank' as const, label: '消費紀錄', count: bankItems.length },
            { key: 'roster' as const, label: '班表', count: rosterItems.length },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-foreground text-background' : 'bg-white text-muted-foreground shadow-sm dark:bg-card hover:bg-muted'
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className={cn(
                  'flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4',
                  tab === t.key ? 'bg-background/20' : 'bg-rose-500 text-white'
                )}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === 'bank' ? (
        <div className="flex flex-col gap-3 px-4 py-4 pb-6 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
          <p className="text-xs text-muted-foreground">
            從 LINE 傳截圖給 Bot 後會先出現在這裡，收到時後端就會自動辨識金額/卡片/商店名稱；辨識不出來的話手動填一下再匯入即可。
          </p>

          {bankLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">載入中…</div>
          ) : bankItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              目前沒有待確認的銀行通知
            </div>
          ) : (
            bankItems.map(item => (
              <BankScreenshotCard
                key={item.id}
                item={item}
                cards={cards}
                dismissing={dismissingId === item.id}
                importing={importingId === item.id}
                onDismiss={() => handleDismiss(item.id)}
                onImport={data => handleImport(item.id, data)}
              />
            ))
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 py-4 pb-6 lg:mx-auto lg:w-full lg:max-w-lg lg:px-6">
          <p className="text-xs text-muted-foreground">
            從 LINE 傳班表照片給 Bot 後會先出現在這裡，點下去可以辨識、校正表格，確認沒問題就能匯入。
          </p>

          {rosterLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">載入中…</div>
          ) : rosterItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              目前沒有待確認的班表照片
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                {rosterItems.map(item => (
                  <Link
                    key={item.id}
                    href="/schedule/import"
                    className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-muted/40"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={api.pendingRosterPhotoImageUrl(item.id)}
                      alt="班表照片"
                      className="size-full object-cover transition-transform group-hover:scale-105"
                    />
                  </Link>
                ))}
              </div>
              <Link
                href="/schedule/import"
                className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-2.5 text-sm font-semibold text-white hover:bg-amber-500"
              >
                <ImageIcon className="size-4" />
                前往辨識與確認匯入
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
