'use client'

import { useState, useCallback } from 'react'
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

interface AddTransactionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => void
  initialData?: Transaction
}

const PAD_KEYS = [
  '1','2','3','⌫',
  '4','5','6','',
  '7','8','9','',
  '.','0','00','✓',
] as const

export function AddTransactionSheet({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: AddTransactionSheetProps) {
  const isDesktop = useIsDesktop()
  const { cards } = useCards()

  const [type,     setType]     = useState<TransactionType>(initialData?.type     ?? 'expense')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [amount,   setAmount]   = useState(initialData ? String(initialData.amount) : '')
  const [note,     setNote]     = useState(initialData?.note     ?? '')
  const [date,     setDate]     = useState(initialData?.date     ?? todayString())
  const [cardId,   setCardId]   = useState<string | undefined>(initialData?.cardId)

  const categories = CATEGORIES.filter(c => c.type === type)

  function handleTypeChange(t: TransactionType) {
    setType(t)
    setCategory('')
  }

  const handleSave = useCallback(() => {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0 || !category) return
    onSubmit({ type, amount: parsed, category, note, date, cardId })
    setAmount(''); setNote(''); setDate(todayString()); setCategory(''); setType('expense'); setCardId(undefined)
    onOpenChange(false)
  }, [amount, category, type, note, date, cardId, onSubmit, onOpenChange])

  const handleKey = useCallback((key: string) => {
    if (key === '✓') { handleSave(); return }
    if (key === '⌫') { setAmount(prev => prev.slice(0, -1)); return }
    if (key === '')   return
    if (key === '.' && amount.includes('.')) return
    if (key === '00' && amount === '') return
    if (amount.replace('.', '').length >= 8) return
    setAmount(prev => prev + key)
  }, [amount, handleSave])

  const displayAmount = amount
    ? new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(parseFloat(amount) || 0)
    : '0'

  const isValid = !!amount && parseFloat(amount) > 0 && !!category

  const inner = (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => onOpenChange(false)}
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

      {/* Category grid */}
      <div className="grid grid-cols-4 gap-3 px-4 pb-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all',
              category === cat.id && (type === 'expense' ? 'ring-2 ring-rose-400 ring-offset-1' : 'ring-2 ring-emerald-400 ring-offset-1')
            )}
          >
            <span
              className="flex size-12 items-center justify-center rounded-full text-2xl"
              style={{ backgroundColor: cat.color }}
            >
              {cat.emoji}
            </span>
            <span className="text-xs font-medium">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Amount display */}
      <div className="flex items-center justify-end px-6 pb-2">
        <span className={cn(
          'text-4xl font-bold tabular-nums',
          type === 'expense' ? 'text-rose-500' : 'text-emerald-500'
        )}>
          ${displayAmount}
        </span>
      </div>

      {/* Date + note */}
      <div className="flex items-center gap-2 border-t px-4 py-2.5">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="rounded-lg border bg-muted/50 px-2 py-1.5 text-sm outline-none focus:border-ring"
        />
        <input
          placeholder="新增備註"
          value={note}
          onChange={e => setNote(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border bg-muted/50 px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
        />
      </div>

      {/* Card selector — only shown when cards exist */}
      {cards.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t px-4 py-2.5 scrollbar-none">
          {/* 現金 option */}
          <button
            onClick={() => setCardId(undefined)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              !cardId
                ? 'bg-emerald-500 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            💵 現金
          </button>
          {cards.map(card => (
            <button
              key={card.id}
              onClick={() => setCardId(card.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                cardId === card.id ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
              style={cardId === card.id ? { backgroundColor: card.color } : undefined}
            >
              {card.type === 'credit' ? '💳' : '🏧'}
              {card.name}
              {card.lastFour && <span className="opacity-70">···· {card.lastFour}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-4 border-t bg-muted/20">
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
          if (key === '') return <div key={idx} className="py-4 bg-background/30" />
          return (
            <button
              key={idx}
              onClick={() => handleKey(key)}
              className="flex items-center justify-center py-4 text-lg font-medium hover:bg-muted active:bg-muted transition-colors"
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogTitle className="sr-only">{initialData ? '編輯紀錄' : '新增紀錄'}</DialogTitle>
          {inner}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-2xl p-0 max-h-[92dvh] overflow-y-auto">
        <SheetTitle className="sr-only">{initialData ? '編輯紀錄' : '新增紀錄'}</SheetTitle>
        {inner}
      </SheetContent>
    </Sheet>
  )
}
