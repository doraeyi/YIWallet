import { createElement } from 'react'
import { BanknoteIcon, BusFrontIcon, CreditCardIcon, LayersIcon, WalletCardsIcon, type LucideIcon } from 'lucide-react'

export type PaymentKind = 'cash' | 'debit' | 'credit' | 'easycard' | 'all'

// 付款方式的線條圖示，全站統一用這個，不再用 💵💳🏧🚌 這些 emoji
const ICONS: Record<PaymentKind, LucideIcon> = {
  cash: BanknoteIcon,
  debit: WalletCardsIcon,
  credit: CreditCardIcon,
  easycard: BusFrontIcon,
  all: LayersIcon,
}

export const PAYMENT_LABEL: Record<Exclude<PaymentKind, 'all'>, string> = {
  cash: '現金',
  debit: '金融卡',
  credit: '信用卡',
  easycard: '悠遊卡',
}

export function PaymentIcon({ kind, className }: { kind: PaymentKind; className?: string }) {
  return createElement(ICONS[kind], { className, strokeWidth: 2, 'aria-hidden': true })
}
