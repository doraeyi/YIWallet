'use client'

import { useState } from 'react'
import { XIcon, CheckCircle2Icon } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useCards } from '@/hooks/use-cards'
import { lookupBank } from '@/lib/bank-codes'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  '#1E293B', '#1D4ED8', '#0891B2', '#7C3AED',
  '#DC2626', '#D97706', '#059669', '#DB2777',
]

type CardType = 'debit' | 'credit' | 'easycard'

interface AddCardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TYPE_OPTIONS: { value: CardType; label: string; emoji: string }[] = [
  { value: 'debit',    label: '金融卡', emoji: '🏧' },
  { value: 'credit',   label: '信用卡', emoji: '💳' },
  { value: 'easycard', label: '悠遊卡', emoji: '🚌' },
]

export function AddCardSheet({ open, onOpenChange }: AddCardSheetProps) {
  const { addCard } = useCards()
  const [type,     setType]     = useState<CardType>('debit')
  const [bankCode, setBankCode] = useState('')
  const [name,     setName]     = useState('')
  const [color,    setColor]    = useState(PRESET_COLORS[0])
  const [lastFour, setLastFour] = useState('')
  // 悠遊卡專用
  const [balance,         setBalance]         = useState('')
  const [passExpiryDate,  setPassExpiryDate]  = useState('')
  const [paymentDueDate,  setPaymentDueDate]  = useState('')

  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState('')

  const bankName = bankCode.length >= 3 ? lookupBank(bankCode) : undefined
  const isEasycard = type === 'easycard'

  function handleBankCodeChange(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 3)
    setBankCode(digits)
    const found = digits.length >= 3 ? lookupBank(digits) : undefined
    if (found && !name) {
      setName(found + (type === 'debit' ? '金融卡' : '信用卡'))
    }
  }

  function handleTypeChange(t: CardType) {
    setType(t)
    if (bankName && (name === bankName + '金融卡' || name === bankName + '信用卡')) {
      if (t === 'easycard') setName('悠遊卡')
      else setName(bankName + (t === 'debit' ? '金融卡' : '信用卡'))
    }
  }

  function reset() {
    setBankCode(''); setName(''); setType('debit')
    setColor(PRESET_COLORS[0]); setLastFour('')
    setBalance(''); setPassExpiryDate(''); setPaymentDueDate('')
    setSubmitError('')
  }

  async function handleSubmit() {
    const trimmed = name.trim() || (
      isEasycard ? '悠遊卡'
        : bankName ? `${bankName}${type === 'debit' ? '金融卡' : '信用卡'}`
        : ''
    )
    if (!trimmed) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await addCard({
        name: trimmed,
        type,
        color,
        lastFour: lastFour.trim() || undefined,
        bankCode: !isEasycard ? (bankCode || undefined) : undefined,
        bank: !isEasycard ? bankName : undefined,
        balance: (type === 'debit' || type === 'easycard') && balance ? Number(balance) : undefined,
        passExpiryDate: isEasycard && passExpiryDate ? passExpiryDate : undefined,
        paymentDueDate: type === 'credit' && paymentDueDate ? paymentDueDate : undefined,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '新增失敗，請確認後端已更新')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    reset()
    onOpenChange(false)
  }

  const cardLabel = name.trim() || (
    isEasycard ? '悠遊卡'
      : bankName ? `${bankName}${type === 'debit' ? '金融卡' : '信用卡'}`
      : '卡片名稱'
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl p-0 max-h-[90dvh] overflow-y-auto">
        <SheetTitle className="sr-only">新增卡片</SheetTitle>

        <div className="flex items-center justify-between border-b px-4 py-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <XIcon className="size-4" />
          </button>
          <span className="text-base font-semibold">新增卡片</span>
          <div className="size-8" />
        </div>

        <div className="flex flex-col gap-5 p-5">
          {/* Type */}
          <div className="flex gap-2">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleTypeChange(opt.value)}
                className={cn(
                  'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
                  type === opt.value
                    ? 'bg-amber-400 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>

          {/* Bank code — 金融卡/信用卡 only */}
          {!isEasycard && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">銀行代碼（選填）</label>
              <div className="relative">
                <input
                  value={bankCode}
                  onChange={e => handleBankCodeChange(e.target.value)}
                  placeholder="例：822"
                  inputMode="numeric"
                  maxLength={3}
                  className={cn(
                    'w-full rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none transition-colors',
                    bankCode.length >= 3
                      ? bankName ? 'border-emerald-400' : 'border-rose-400'
                      : 'focus:border-amber-400',
                  )}
                />
                {bankCode.length >= 3 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {bankName ? (
                      <><CheckCircle2Icon className="size-3.5 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600">{bankName}</span></>
                    ) : (
                      <span className="text-xs text-rose-500">查無此代碼</span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">輸入三碼即顯示銀行名稱，如 822 = 中國信託</p>
            </div>
          )}

          {/* Card name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">卡片名稱</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={cardLabel}
              className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
            />
          </div>

          {/* Last four — 金融卡/信用卡 only */}
          {!isEasycard && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">卡片末四碼（選填）</label>
              <input
                value={lastFour}
                onChange={e => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1234"
                inputMode="numeric"
                className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
              />
            </div>
          )}

          {/* 金融卡餘額 */}
          {type === 'debit' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">目前餘額（選填）</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  value={balance}
                  onChange={e => setBalance(e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  inputMode="numeric"
                  className="w-full rounded-xl border bg-muted/30 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-amber-400"
                />
              </div>
            </div>
          )}

          {/* 信用卡繳費截止日 */}
          {type === 'credit' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">繳費截止日（選填）</label>
              <input
                type="date"
                value={paymentDueDate}
                onChange={e => setPaymentDueDate(e.target.value)}
                className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
              />
              <p className="text-[11px] text-muted-foreground">設定後到期前一天 LINE Bot 會提醒你繳費</p>
            </div>
          )}

          {/* 悠遊卡專用欄位 */}
          {isEasycard && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">目前餘額（選填）</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    value={balance}
                    onChange={e => setBalance(e.target.value.replace(/\D/g, ''))}
                    placeholder="0"
                    inputMode="numeric"
                    className="w-full rounded-xl border bg-muted/30 py-2.5 pl-7 pr-3 text-sm outline-none focus:border-amber-400"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">月票到期日（選填）</label>
                <input
                  type="date"
                  value={passExpiryDate}
                  onChange={e => setPassExpiryDate(e.target.value)}
                  className="rounded-xl border bg-muted/30 px-3 py-2.5 text-sm outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-muted-foreground">設定後到期前一天 LINE Bot 會提醒你續卡</p>
              </div>
            </>
          )}

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground">卡片顏色</label>
            <div className="flex flex-wrap gap-2.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn('size-9 rounded-full transition-transform', color === c && 'ring-2 ring-offset-2 ring-amber-400 scale-110')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-2xl text-white shadow"
              style={{ backgroundColor: color }}
            >
              {type === 'easycard' ? '🚌' : type === 'credit' ? '💳' : '🏧'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{cardLabel}</p>
              <p className="text-xs text-muted-foreground">
                {(type === 'debit' || type === 'easycard') && balance ? `餘額 $${balance}` : ''}
                {isEasycard && balance && passExpiryDate ? ' · ' : ''}
                {isEasycard && passExpiryDate ? `月票 ${passExpiryDate}` : ''}
                {type === 'credit' && paymentDueDate ? `繳費截止 ${paymentDueDate}` : ''}
                {!isEasycard && bankCode && bankName && !balance && !paymentDueDate ? `代碼 ${bankCode}` : ''}
                {!isEasycard && bankCode && bankName && lastFour && !balance && !paymentDueDate ? ' · ' : ''}
                {!isEasycard && lastFour && !balance && !paymentDueDate ? `末四碼 ${lastFour}` : ''}
              </p>
            </div>
          </div>

          {submitError && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:bg-rose-900/20">
              ❌ {submitError}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full rounded-xl bg-amber-400 py-3 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {submitting ? '新增中…' : '新增'}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
