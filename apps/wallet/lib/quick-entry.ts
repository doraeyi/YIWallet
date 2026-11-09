import { getCategoryById, type Transaction, type TransactionType } from './types'

// 記帳捷徑共用的判斷：依時間猜餐別、從備註學分類、找出常記的項目

// 依現在幾點猜是哪一餐：早上早餐、中午午餐、傍晚晚餐
export const MEALS = ['breakfast', 'lunch', 'dinner']
export function guessMeal(now = new Date()): string {
  const h = now.getHours()
  if (h >= 5 && h < 10) return 'breakfast'
  if (h >= 11 && h < 14) return 'lunch'
  if (h >= 17 && h < 21) return 'dinner'
  return ''
}

// 「其他」學了也沒幫助，轉帳的備註是對象不是品項，已下架的分類不該再選到
const canLearn = (category: string) => {
  const cat = getCategoryById(category)
  return !!cat && !cat.hidden && category !== 'transfer' && !category.startsWith('other-')
}

/** 這個備註以前最常記在哪個分類；一樣多就取最近記的，沒記過回傳空字串 */
export function learnedCategory(transactions: Transaction[], note: string, type: TransactionType): string {
  const target = note.trim().toLowerCase()
  if (!target) return ''
  const counts = new Map<string, number>()
  // 交易由新到舊，Map 會保留第一次出現的順序，下面 sort 又是穩定排序，所以平手時最近的在前面
  for (const t of transactions) {
    if (t.type === type && t.note?.trim().toLowerCase() === target && canLearn(t.category)) {
      counts.set(t.category, (counts.get(t.category) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

export interface QuickItem {
  key: string
  category: string
  note: string
  amount: number
  cardId?: string
  isCash?: boolean
}

const RECENT_DAYS = 90
const MIN_TIMES = 2
const SYSTEM_NOTE = /領現|薪資|現金對帳|期初/

/** 最近三個月手動記過至少兩次、內容一模一樣的支出，現在這一餐的排前面、別餐的排後面 */
export function frequentItems(transactions: Transaction[], now = new Date(), limit = 5): QuickItem[] {
  const since = new Date(now.getTime() - RECENT_DAYS * 86400000).toISOString().slice(0, 10)
  const meal = guessMeal(now)
  const groups = new Map<string, QuickItem & { times: number }>()
  for (const t of transactions) {
    // Apple Pay、LINE 這些本來就自動記了，不需要捷徑
    if (t.type !== 'expense' || t.date < since || (t.source && t.source !== 'manual')) continue
    if (t.category === 'transfer' || SYSTEM_NOTE.test(t.note ?? '') || getCategoryById(t.category)?.hidden) continue
    const note = t.note?.trim() ?? ''
    const key = [t.category, note, t.amount, t.cardId ?? (t.isCash ? 'cash' : '')].join('|')
    const hit = groups.get(key)
    if (hit) hit.times++
    else groups.set(key, { key, category: t.category, note, amount: t.amount, cardId: t.cardId, isCash: t.isCash, times: 1 })
  }
  const score = (g: { category: string; times: number }) => {
    if (!meal || !MEALS.includes(g.category)) return g.times
    return g.category === meal ? g.times * 2 : g.times / 2
  }
  return [...groups.values()]
    .filter(g => g.times >= MIN_TIMES)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit)
}
