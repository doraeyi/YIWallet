import { guessCategory } from './invoice-utils'
import { todayString } from './finance-utils'

export interface ParsedPayment {
  amount: number
  merchant: string
  note: string
  date: string   // YYYY-MM-DD
  suggestedCategory: string
}

// 解析銀行/LINE Pay 消費通知（結構化格式）
export function parseLineNotification(text: string): ParsedPayment | null {
  // 金額：NT$242 / NT＄242 / 消費金額：NT$242 / 刷卡金額：1,234
  const amountMatch =
    text.match(/NT[＄$]\s*([\d,]+)/) ??
    text.match(/(?:消費|刷卡|交易)金額[：:]\s*(?:NT)?[＄$]?\s*([\d,]+)/)

  if (!amountMatch) return null
  const amount = parseInt(amountMatch[1].replace(/,/g, ''), 10)
  if (!amount || isNaN(amount)) return null

  // 商家：商店名稱 / 消費地點 / 消費商店 / 商家 / 特約商店
  const merchantMatch = text.match(
    /(?:商店名稱|消費地點|消費商店|特約商店|商家)[：:]\s*(.+)/,
  )
  if (!merchantMatch) return null
  const merchant = merchantMatch[1].replace(/\u3000/g, ' ').trim()

  // 日期：交易時間 / 消費時間 / 刷卡時間：YYYY/MM/DD 或 YYYY-MM-DD
  let date = todayString()
  const dateMatch = text.match(
    /(?:交易|消費|刷卡)時間[：:]\s*(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
  )
  if (dateMatch) {
    date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`
  }

  return { amount, merchant, note: merchant, date, suggestedCategory: guessCategory(merchant) }
}

// 解析快速手動輸入格式（支援有無空格）
// 格式：「商家[備註]金額」或「金額 商家」，金額可帶 $、元
// 範例：「捷運28」、「全家 茶葉蛋 10」、「28 捷運」、「麥當勞大麥克149元」
export function parseQuickEntry(text: string): ParsedPayment | null {
  const trimmed = text.trim()

  // 金額在結尾（最常見）：任意文字 + 數字 + 可選單位
  const endMatch = trimmed.match(/^(.+?)\s*(\d+\.?\d*)\s*[元$＄]?\s*$/)
  // 金額在開頭：數字 + 可選單位 + 空格 + 文字
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

  // 有空格：第一個詞是商家，其餘是備註；無空格：整串都是商家
  const parts = textPart.split(/[\s　]+/).filter(Boolean)
  const merchant = parts[0]
  const note = parts.length > 1 ? parts.slice(1).join(' ') : merchant

  return {
    amount,
    merchant,
    note,
    date: todayString(),
    suggestedCategory: guessCategory(merchant),
  }
}

// 依序嘗試：銀行通知格式 → 快速輸入格式
export function parseAny(text: string): ParsedPayment | null {
  return parseLineNotification(text) ?? parseQuickEntry(text)
}
