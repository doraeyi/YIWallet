import { getCategoryById, type Card, type Transaction } from './types'

// 把全部交易匯出成 CSV 下載（Excel 開得起來：加 BOM 才不會中文亂碼）。
// 純前端產生，不經過後端，資料就是畫面上已經載入的那些。
export function exportTransactionsCsv(transactions: Transaction[], cards: Card[]) {
  const cardName = new Map(cards.map(c => [c.id, c.name]))
  const header = ['日期', '類型', '金額', '分類', '商家／品名', '備註', '付款方式']
  const rows = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(t => [
      t.date,
      t.type === 'income' ? '收入' : '支出',
      String(t.amount),
      getCategoryById(t.category)?.name ?? t.category,
      t.description && t.description !== t.note ? t.description : '',
      t.note,
      t.cardId ? (cardName.get(t.cardId) ?? '') : t.isCash ? '現金' : '',
    ])
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `易記帳-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
