import { guessCategory } from './invoice-utils'
import { todayString } from './finance-utils'

export type PaymentType = 'cash' | 'debit' | 'credit'

export interface ParsedPayment {
  amount: number
  merchant: string
  note: string
  date: string   // YYYY-MM-DD
  suggestedCategory: string
  paymentType?: PaymentType  // undefined = not specified
}

// 偵測付款方式關鍵字，並從文字中移除
const PAYMENT_PATTERNS: [RegExp, PaymentType][] = [
  [/現金/g, 'cash'],
  [/金融卡/g, 'debit'],
  [/信用卡|刷卡/g, 'credit'],
]

function detectAndStripPayment(text: string): { paymentType?: PaymentType; clean: string } {
  for (const [re, type] of PAYMENT_PATTERNS) {
    if (re.test(text)) {
      const clean = text.replace(re, ' ').replace(/\s{2,}/g, ' ').trim()
      return { paymentType: type, clean }
    }
  }
  return { clean: text }
}

// 解析銀行/LINE Pay 消費通知（結構化格式）
export function parseLineNotification(text: string): ParsedPayment | null {
  const amountMatch =
    text.match(/NT[＄$]\s*([\d,]+)/) ??
    text.match(/(?:消費|刷卡|交易)金額[：:]\s*(?:NT)?[＄$]?\s*([\d,]+)/)

  if (!amountMatch) return null
  const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10)
  if (!amount || isNaN(amount)) return null

  const merchantMatch = text.match(
    /(?:商店名稱|消費地點|消費商店|特約商店|商家)[：:]\s*(.+)/,
  )
  if (!merchantMatch) return null
  const merchant = merchantMatch[1].replace(/\u3000/g, ' ').trim()

  let date = todayString()
  const dateMatch = text.match(
    /(?:交易|消費|刷卡)時間[：:]\s*(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
  )
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
  }

  // 銀行通知通常是刷卡
  return { amount, merchant, note: merchant, date, suggestedCategory: guessCategory(merchant), paymentType: 'credit' }
}

// 解析快速手動輸入
// 範例：「全家 茶葉蛋 10」「捷運28」「全家 金融卡 10」「星巴克 信用卡 165」
export function parseQuickEntry(text: string): ParsedPayment | null {
  const { paymentType, clean } = detectAndStripPayment(text)
  const trimmed = clean.trim()

  const endMatch = trimmed.match(/^(.+?)\s*(\d+\.?\d*)\s*[元$＄]?\s*$/)
  const startMatch = trimmed.match(/^[＄$]?(\d+\.?\d*)\s*[元$＄]?\s+(.+)$/)

  let amount: number
  let textPart: string

  if (endMatch) {
    amount = parseFloat(endMatch[2])
    textPart = endMatch[1].trim()
  } else if (startMatch) {
    amount = parseFloat(startMatch[1])
    textPart = startMatch[2].trim()
  } else {
    return null
  }

  if (!amount || isNaN(amount) || amount <= 0 || !textPart) return null

  const parts = textPart.split(/[\s　]+/).filter(Boolean)
  const merchant = parts[0]
  const note = parts.length > 1 ? parts.slice(1).join(' ') : merchant

  return {
    amount,
    merchant,
    note,
    date: todayString(),
    suggestedCategory: guessCategory(merchant),
    paymentType,
  }
}

export function parseAny(text: string): ParsedPayment | null {
  return parseLineNotification(text) ?? parseQuickEntry(text)
}
