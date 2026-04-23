export type TransactionType = 'income' | 'expense'

export type Period = 'week' | 'month' | 'year'

export interface Category {
  id: string
  name: string
  type: TransactionType | 'both'
  emoji: string
  color: string   // icon background color (hex)
  text: string    // icon foreground color
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  category: string
  note: string
  date: string      // YYYY-MM-DD
  createdAt: string // ISO datetime
  cardId?: string
}

export interface ChartDataPoint {
  label: string
  income: number
  expense: number
}

export const CATEGORIES: Category[] = [
  // Expense
  { id: 'food',          name: '餐飲', type: 'expense', emoji: '🍜', color: '#FECACA', text: '#DC2626' },
  { id: 'daily',         name: '日常', type: 'expense', emoji: '🏠', color: '#BBF7D0', text: '#16A34A' },
  { id: 'transport',     name: '交通', type: 'expense', emoji: '🚌', color: '#BFDBFE', text: '#2563EB' },
  { id: 'entertainment', name: '娛樂', type: 'expense', emoji: '🎮', color: '#DDD6FE', text: '#7C3AED' },
  { id: 'health',        name: '醫療', type: 'expense', emoji: '🏥', color: '#FDE68A', text: '#D97706' },
  { id: 'education',     name: '教育', type: 'expense', emoji: '📚', color: '#FBCFE8', text: '#DB2777' },
  { id: 'shopping',      name: '購物', type: 'expense', emoji: '🛍️', color: '#A5F3FC', text: '#0891B2' },
  { id: 'other-expense', name: '其他', type: 'expense', emoji: '📦', color: '#E5E7EB', text: '#6B7280' },
  // Income
  { id: 'salary',        name: '薪水', type: 'income',  emoji: '💼', color: '#BBF7D0', text: '#16A34A' },
  { id: 'bonus',         name: '獎金', type: 'income',  emoji: '🎁', color: '#FDE68A', text: '#D97706' },
  { id: 'investment',    name: '投資', type: 'income',  emoji: '📈', color: '#BFDBFE', text: '#2563EB' },
  { id: 'other-income',  name: '其他', type: 'income',  emoji: '💰', color: '#E5E7EB', text: '#6B7280' },
]

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id)
}

export interface Card {
  id: string
  name: string
  type: 'debit' | 'credit' | 'easycard'
  color: string
  lastFour?: string
  bankCode?: string
  bank?: string
  balance?: number           // debit/easycard 餘額
  passExpiryDate?: string    // 悠遊卡月票到期日 YYYY-MM-DD
  paymentDueDate?: string    // 信用卡繳費截止日 YYYY-MM-DD
  notifyDaysBefore?: number  // 提前幾天通知（預設 1）
  notifyTime?: string        // 通知時間 HH:MM（預設 09:00）
}

export interface Job {
  id: string
  name: string
  color: string
  pay_type: 'hourly' | 'monthly'
  rate: number
  payday: number
  labor_insurance: number
  health_insurance: number
  created_at: string
}

export interface Shift {
  id: string
  job_id: string
  job_name: string
  job_color: string
  date: string
  shift_type: 'morning' | 'evening'
}
