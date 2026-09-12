import { guessCategory } from '@/lib/invoice-utils'

export interface ParsedInvoice {
  invoiceNo: string
  date: string       // YYYY-MM-DD
  merchant: string
  amount: number
  items: string[]
  categoryId: string
}

function cleanMerchant(name: string): string {
  // 移除常見公司後綴和分店資訊
  return name
    .replace(/股份有限公司.*/, '')
    .replace(/有限公司.*/, '')
    .replace(/集團.*/, '')
    .trim()
    .slice(0, 12)
}

function parseDate(raw: string): string {
  // YYYYMMDD → YYYY-MM-DD
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}

export function parseCarrierCsv(text: string): ParsedInvoice[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const header = lines[0].split(',')
  const colIndex = (name: string) => header.indexOf(name)

  const idxDate     = colIndex('發票日期')
  const idxNo       = colIndex('發票號碼')
  const idxAmount   = colIndex('發票金額')
  const idxStatus   = colIndex('發票狀態')
  const idxMerchant = colIndex('賣方名稱')
  const idxItem     = colIndex('消費明細_品名')

  if (idxNo === -1 || idxAmount === -1) return []

  const groups = new Map<string, {
    date: string
    merchant: string
    amount: number
    items: string[]
    status: string
  }>()

  for (const line of lines.slice(1)) {
    // 跳過注意事項等非資料行
    if (line.startsWith('捐贈') || line.startsWith('注意')) continue

    const cols = line.split(',')
    if (cols.length < 4) continue

    const invoiceNo = cols[idxNo]?.trim()
    if (!invoiceNo) continue

    const status = cols[idxStatus]?.trim() ?? ''
    // 只匯入已確認的發票
    if (!status.includes('確認')) continue

    const amount = parseFloat(cols[idxAmount] ?? '0') || 0
    const date = parseDate(cols[idxDate]?.trim() ?? '')
    const merchant = cleanMerchant(cols[idxMerchant]?.trim() ?? '')
    const item = cols[idxItem]?.trim() ?? ''

    if (groups.has(invoiceNo)) {
      const g = groups.get(invoiceNo)!
      g.amount += amount
      if (item && !item.startsWith('小計')) g.items.push(item)
    } else {
      groups.set(invoiceNo, {
        date,
        merchant,
        amount,
        items: item && !item.startsWith('小計') ? [item] : [],
        status,
      })
    }
  }

  return Array.from(groups.entries())
    .filter(([, g]) => g.amount > 0)
    .map(([invoiceNo, g]) => ({
      invoiceNo,
      date: g.date,
      merchant: g.merchant,
      amount: Math.round(g.amount),
      items: g.items,
      categoryId: guessCategory(g.merchant),
    }))
}
