'use client'

import type { Card } from '@/lib/types'
import { formatCurrency } from '@/lib/finance-utils'
import { cn, shadeColor } from '@/lib/utils'

const TYPE_LABEL: Record<Card['type'], string> = {
  debit: '金融卡',
  credit: '信用卡',
  easycard: '悠遊卡',
}

const TYPE_EMOJI: Record<Card['type'], string> = {
  debit: '🏧',
  credit: '💳',
  easycard: '🚌',
}

function maskedNumber(card: Card): string {
  if (card.lastFour) return `•••• •••• •••• ${card.lastFour}`
  return '•••• •••• •••• ••••'
}

// 一張可以正反翻面的虛擬卡片：正面顯示 logo／卡號末四碼／卡片名稱，
// 背面顯示餘額（或信用卡的本期消費）。用 CSS 3D transform 做翻轉，
// 不用額外的動畫套件。
export function CardVisual({
  card, flipped, onFlip, balanceLabel, balanceValue, className, overlay,
}: {
  card: Card
  flipped: boolean
  onFlip?: () => void
  balanceLabel: string
  balanceValue: number
  className?: string
  /** 疊在卡片右上角外側的內容，例如月票／帳單鈴鐺，位置跟著卡片走而不是外層容器 */
  overlay?: React.ReactNode
}) {
  const gradient = `linear-gradient(135deg, ${shadeColor(card.color, 18)}, ${shadeColor(card.color, -22)})`
  const backGradient = `linear-gradient(135deg, ${shadeColor(card.color, -8)}, ${shadeColor(card.color, -38)})`

  return (
    <div
      className={cn('relative aspect-[1.586/1] w-full max-w-[320px] [perspective:1200px]', className)}
    >
      {overlay && (
        <div className="absolute -right-1 -top-1 z-10">{overlay}</div>
      )}
      <div
        onClick={onFlip}
        className="relative size-full cursor-pointer transition-transform duration-700 [transform-style:preserve-3d]"
        style={flipped ? { transform: 'rotateY(180deg)' } : undefined}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg [backface-visibility:hidden]"
          style={{ background: gradient }}
        >
          <span className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-12 -left-6 size-28 rounded-full bg-white/10" />

          <div className="flex items-start justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="" className="size-7 rounded-md opacity-95" />
            <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm">
              {TYPE_EMOJI[card.type]} {TYPE_LABEL[card.type]}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="font-mono text-lg tracking-widest drop-shadow-sm">{maskedNumber(card)}</p>
            <p className="truncate text-sm font-semibold opacity-95">{card.name}</p>
          </div>
        </div>

        {/* 背面 */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl text-white shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ background: backGradient }}
        >
          <div className="mt-5 h-9 w-full bg-black/60" />
          <div className="flex flex-1 flex-col items-center justify-center gap-1 px-4">
            <span className="text-xs text-white/70">{balanceLabel}</span>
            <span className="text-2xl font-bold">{formatCurrency(balanceValue)}</span>
          </div>
          <p className="pb-2 text-center text-[10px] text-white/50">輕觸卡片翻回正面</p>
        </div>
      </div>
    </div>
  )
}

