'use client'

import { useState, useCallback, useEffect } from 'react'
import { XIcon, DeleteIcon } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { useIsDesktop } from '@/hooks/use-is-desktop'
import { useCards } from '@/hooks/use-cards'
import { CATEGORIES, type Transaction, type TransactionType } from '@/lib/types'
import { todayString } from '@/lib/finance-utils'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'

// 新增交易時預選上次用的分類（收入、支出各記一個），常記同一類的不用每次重選
const LAST_CATEGORY_KEY = 'yiwallet_last_category'

function lastCategory(type: TransactionType): string {
  try { return JSON.parse(localStorage.getItem(LAST_CATEGORY_KEY) ?? '{}')[type] ?? '' } catch { return '' }
}

function rememberCategory(type: TransactionType, category: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_CATEGORY_KEY) ?? '{}')
    localStorage.setItem(LAST_CATEGORY_KEY, JSON.stringify({ ...saved, [type]: category }))
  } catch {}
}

interface AddTransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>, isCash: boolean) => Promise<unknown> | void
  initialData?: Transaction
}

// 右邊一欄放 + − 讓使用者直接算「120+35」，金額會即時算出結果，儲存時用結果
const PAD_KEYS = [
  '1','2','3','⌫',
  '4','5','6','+',
  '7','8','9','−',
  '.','0','00','✓',
] as const

const OPERATORS = ['+', '−']

// "120+35−5" → 150；結尾是運算子的話先忽略那個運算子
function evaluateAmount(expr: string): number {
  const trimmed = expr.replace(/[+−]$/, '')
  if (!trimmed) return 0
  let total = 0
  for (const m of trimmed.matchAll(/([+−]?)([\d.]+)/g)) {
    const n = parseFloat(m[2]) || 0
    total += m[1] === '−' ? -n : n
  }
  return Math.round(total * 100) / 100
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AddTransactionSheetProps) {
  const isDesktop = useIsDesktop()
  const { cards, defaultCard } = useCards()

  const [type,       setType]       = useState<TransactionType>(initialData?.type     ?? 'expense')
  const [category,   setCategory]   = useState(() =>
    initialData ? initialData.category : (typeof window !== 'undefined' ? lastCategory('expense') : ''))
  const [amount,     setAmount]     = useState(initialData ? String(initialData.amount) : '')
  const [note,       setNote]       = useState(() => {
    if (initialData?.category === 'transfer' && initialData.note) {
      const idx = initialData.note.indexOf('|')
      return idx === -1 ? '' : initialData.note.slice(idx + 1)
    }
    return initialData?.note ?? ''
  })
  const [transferTo, setTransferTo] = useState(() => {
    if (initialData?.category === 'transfer' && initialData.note) {
      const idx = initialData.note.indexOf('|')
      return idx === -1 ? initialData.note : initialData.note.slice(0, idx)
    }
    return ''
  })
  const [date,     setDate]     = useState(initialData?.date     ?? todayString())
  const [cardId,        setCardId]        = useState<string | undefined>(
    initialData ? initialData.cardId : (defaultCard?.id ?? cards[0]?.id)
  )
  const [isExplicitCash, setIsExplicitCash] = useState(!!initialData?.isCash && !initialData.cardId)
  const [saving, setSaving] = useState(false)

  const selectedCard = cards.find(c => c.id === cardId)
  const isDebitCard = selectedCard?.type === 'debit'

  const categories = CATEGORIES.filter(c => {
    if (c.id === 'transfer') return isDebitCard
    return c.type === type
  })

  // 當 cards 載入完成後，若是新增模式且尚未選卡，自動帶入 defaultCard
  useEffect(() => {
    if (!initialData && cardId === undefined && !isExplicitCash) {
      const preferred = defaultCard?.id ?? cards[0]?.id
      if (preferred) setCardId(preferred)
    }
  }, [defaultCard?.id, cards.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // 切換離開金融卡時，重置轉帳分類
  useEffect(() => {
    if (category === 'transfer' && !isDebitCard) {
      setCategory('')
      setTransferTo('')
    }
  }, [isDebitCard]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTypeChange(t: TransactionType) {
    setType(t)
    setCategory(initialData ? '' : lastCategory(t))
    setTransferTo('')
  }

  const handleSave = useCallback(async () => {
    const parsed = evaluateAmount(amount)
    if (!amount || isNaN(parsed) || parsed <= 0 || !category || saving) return
    // 沒有任何卡片的人一律是現金；有卡片的人要明確點「現金」才算，不然就是還沒指定
    const isCash = !cardId && (cards.length === 0 || isExplicitCash)
    const savedNote = category === 'transfer'
      ? (transferTo ? (note ? `${transferTo}|${note}` : transferTo) : note)
      : note
    setSaving(true)
    try {
      await onSubmit({ type, amount: parsed, category, note: savedNote, date, cardId, isCash }, isCash)
    } catch {
      toast(initialData ? '儲存失敗，請再試一次' : '記帳失敗，請再試一次', 'error')
      return
    } finally {
      setSaving(false)
    }
    toast(initialData ? '已更新' : '已記帳')
    if (!initialData) rememberCategory(type, category)
    setAmount(''); setNote(''); setTransferTo(''); setDate(todayString()); setType('expense')
    setCategory(initialData ? '' : lastCategory('expense'))
    setIsExplicitCash(false)
    setCardId(defaultCard?.id ?? cards[0]?.id)
    onOpenChange(false)
  }, [amount, category, type, note, transferTo, date, cardId, isExplicitCash, cards.length, onSubmit, onOpenChange, defaultCard?.id, saving, initialData])

  const handleKey = useCallback((key: string) => {
    if (key === '✓') { handleSave(); return }
    if (key === '⌫') { setAmount(prev => prev.slice(0, -1)); return }
    if (key === '=') {
      const result = evaluateAmount(amount)
      setAmount(result > 0 ? String(result) : '')
      return
    }
    if (key === '')   return
    const lastChar = amount.slice(-1)
    if (OPERATORS.includes(key)) {
      if (!amount) return
      // 連按兩個運算子就換成後按的那個
      setAmount(prev => (OPERATORS.includes(prev.slice(-1)) ? prev.slice(0, -1) : prev) + key)
      return
    }
    const current = amount.split(/[+−]/).pop() ?? ''
    if (key === '.' && current.includes('.')) return
    if (key === '00' && (current === '' || OPERATORS.includes(lastChar))) return
    if (current.replace('.', '').length >= 8) return
    setAmount(prev => prev + key)
  }, [amount, handleSave])

  // 電腦上直接用實體鍵盤輸入金額：數字、小數點、+ -、Backspace、Enter 存檔。
  // 正在備註欄這類輸入框打字時不攔截。
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      let key: string | null = null
      if (/^[0-9]$/.test(e.key)) key = e.key
      else if (e.key === '.') key = '.'
      else if (e.key === '+') key = '+'
      else if (e.key === '-') key = '−'
      else if (e.key === '=') key = '='
      else if (e.key === 'Backspace') key = '⌫'
      else if (e.key === 'Enter') key = '✓'
      if (key === null) return
      e.preventDefault()
      handleKey(key)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleKey])

  const evaluated = evaluateAmount(amount)
  const hasExpression = /[+−]/.test(amount)
  const displayAmount = amount
    ? new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(evaluated)
    : '0'

  const isValid = evaluated > 0 && !!category

  // 已經輸入金額卻按 ✕／點外面關掉，先確認，避免誤觸把剛打的內容丟掉
  const initialAmount = initialData ? String(initialData.amount) : ''
  function requestClose() {
    if (amount && amount !== initialAmount && !confirm('金額還沒儲存，確定要關閉嗎？')) return
    onOpenChange(false)
  }
  function handleOpenChange(next: boolean) {
    if (next) onOpenChange(true)
    else requestClose()
  }

  const inner = (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={requestClose}
          aria-label="關閉"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <XIcon className="size-4" />
        </button>
        <span className="text-base font-semibold">{initialData ? '編輯紀錄' : '新增紀錄'}</span>
        <div className="size-8" />
      </div>

      {/* Type toggle */}
      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => handleTypeChange('expense')}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
            type === 'expense' ? 'bg-rose-500 text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          支出
        </button>
        <button
          onClick={() => handleTypeChange('income')}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
            type === 'income' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
          )}
        >
          收入
        </button>
      </div>

      {!category && (
        <p className="px-4 pb-1 text-xs text-muted-foreground">選一個分類 <span className="text-rose-500">*</span></p>
      )}
      {/* Category grid — 2 rows, horizontal scroll if overflow */}
      <div className="grid grid-rows-2 grid-flow-col auto-cols-[72px] gap-3 overflow-x-auto px-4 pb-3 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            aria-pressed={category === cat.id}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all',
              category === cat.id
                ? (type === 'expense' ? 'bg-rose-50 ring-2 ring-rose-400 dark:bg-rose-400/10' : 'bg-emerald-50 ring-2 ring-emerald-400 dark:bg-emerald-400/10')
                : category && 'opacity-50'
            )}
          >
            <span
              className="flex size-12 items-center justify-center rounded-full text-2xl"
              style={{ backgroundColor: cat.color }}
            >
              {cat.emoji}
            </span>
            <span className={cn('text-xs', category === cat.id ? 'font-bold' : 'font-medium')}>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Amount display */}
      <div className="flex flex-col items-end px-6 pb-2">
        {hasExpression && (
          <span className="text-sm tabular-nums text-muted-foreground">{amount}</span>
        )}
        <span className={cn(
          'text-4xl font-bold tabular-nums',
          type === 'expense' ? 'text-rose-500' : 'text-emerald-500'
        )}>
          ${displayAmount}
        </span>
      </div>

      {/* Date + note/transfer-to */}
      <div className="flex items-center gap-2 border-t px-4 py-2.5">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="rounded-lg border bg-muted/50 px-2 py-1.5 text-sm outline-none focus:border-ring"
        />
        {category === 'transfer' ? (
          <input
            placeholder="轉帳對象（選填）"
            value={transferTo}
            onChange={e => setTransferTo(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border bg-muted/50 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        ) : (
          <input
            placeholder="新增備註"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border bg-muted/50 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        )}
      </div>
      {/* Transfer extra note row */}
      {category === 'transfer' && (
        <div className="flex items-center border-t px-4 py-2.5">
          <input
            placeholder="備註（選填）"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-lg border bg-muted/50 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
          />
        </div>
      )}

      {/* Card selector — only shown when cards exist */}
      {cards.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t px-4 py-2.5 scrollbar-none">
          {/* 現金 option */}
          <button
            onClick={() => { setCardId(undefined); setIsExplicitCash(true) }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              !cardId && isExplicitCash
                ? 'bg-emerald-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            💵 現金
          </button>
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => { setCardId(card.id); setIsExplicitCash(false) }}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                cardId === card.id ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
              style={cardId === card.id ? { backgroundColor: card.color } : undefined}
            >
              {card.type === 'credit' ? '💳' : card.type === 'easycard' ? '🚌' : '🏧'}
              {card.type === 'credit' ? '信用卡' : card.type === 'easycard' ? '悠遊卡' : '金融卡'}
              {(() => {
                const last4 = card.lastFour ?? (/^\d{4,}$/.test(card.name) ? card.name.slice(-4) : undefined)
                return last4 ? <span className="opacity-70"> ···· {last4}</span> : null
              })()}
            </button>
          ))}
        </div>
      )}

      {/* Number pad——固定在面板底部，小螢幕不用往下捲才看得到「儲存」 */}
      <div className="sticky bottom-0 grid grid-cols-4 border-t bg-background">
        {PAD_KEYS.map((key, idx) => {
          if (key === '✓') {
            return (
              <button
                key={idx}
                onClick={handleSave}
                className={cn(
                  'flex items-center justify-center py-4 text-base font-bold text-white transition-opacity',
                  isValid ? 'bg-amber-400 active:opacity-70' : 'bg-amber-400/50 cursor-not-allowed'
                )}
              >
                儲存
              </button>
            )
          }
          return (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              aria-label={key === '⌫' ? '刪除' : key === '+' ? '加' : key === '−' ? '減' : undefined}
              className={cn(
                'flex items-center justify-center py-4 text-lg font-medium hover:bg-muted active:bg-muted transition-colors',
                OPERATORS.includes(key) && 'text-amber-600',
              )}
            >
              {key === '⌫' ? <DeleteIcon className="size-5 text-muted-foreground" /> : key}
            </button>
          )
        })}
      </div>
    </div>
  )

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogTitle className="sr-only">{initialData ? '編輯紀錄' : '新增紀錄'}</DialogTitle>
          {inner}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0 max-h-[92dvh] overflow-y-auto">
        <SheetTitle className="sr-only">{initialData ? '編輯紀錄' : '新增紀錄'}</SheetTitle>
        {inner}
      </SheetContent>
    </Sheet>
  )
}
