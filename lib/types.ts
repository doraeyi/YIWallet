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
  { id: 'transfer',      name: '轉帳', type: 'expense', emoji: '💸', color: '#BFDBFE', text: '#1D4ED8' },
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
  bank?: string
  balance?: number           // debit/easycard 餘額
  dueAmount?: number         // 信用卡目前應繳金額
  creditLimit?: number       // 信用額度
  passExpiryDate?: string    // 悠遊卡月票到期日 YYYY-MM-DD
  paymentDueDate?: string    // 信用卡繳費截止日 YYYY-MM-DD
  reminderDay?: number       // 每月固定幾號提醒（不是提前幾天）
}

export interface ShiftPreset {
  id: string
  label: string
  start_time: string
  end_time: string
}

export interface Job {
  id: string
  name: string
  color: string
  pay_type: 'hourly' | 'monthly'
  hourly_rate: number | null
  monthly_salary: number | null
  payday: number
  labor_insurance_fee: number
  health_insurance_fee: number
  welfare_fee: number
  created_at: string
  presets: ShiftPreset[]
}

export interface Shift {
  id: string
  job_id: string | null
  job_name: string | null
  job_color: string | null
  date: string
  start_time: string
  end_time: string
  shift_type: string | null
  note: string | null
}

export interface FriendUser {
  id: string
  email: string
  displayName: string
  picture?: string
}

export interface Friendship {
  id: string
  status: 'pending' | 'accepted'
  friend: FriendUser
  incoming: boolean
}

export interface JobShare {
  id: string
  sharedWith: FriendUser
}

/** 好友分享出來的班表，唯讀，只帶顯示需要的欄位（沒有薪資等敏感資料） */
export interface FriendShift {
  id: string
  date: string
  start_time: string
  end_time: string
  shift_type: string | null
  note: string | null
  job: { id: string; name: string; color: string } | null
}

/** 管理後台用的使用者清單項目 */
export interface AdminUser {
  id: string
  email: string
  displayName: string
  canUseOcr: boolean
  canUseBarcode: boolean
  createdAt: string
}

/** LINE Bot 這個月的推播訊息用量（reply 訊息不計費，這裡只算 push） */
export interface LineQuota {
  type: 'limited' | 'none'
  limit: number | null
  used: number
}

/** 目前登入使用者的個人資料，含各項功能權限旗標 */
export interface MeProfile {
  id: string
  email: string | null
  name: string | null
  picture: string | null
  canUseOcr: boolean
  canUseBarcode: boolean
  autoAcceptSharedShifts: boolean
  dashboardOrder: string | null
}

/** 條碼查詢頁用的商品資料 */
export interface Product {
  id: string
  itemNo: string | null
  type: string
  code: string
  name: string
  event: string | null
}

/** 新增商品時單筆的輸入內容（品號為必填，用來擋重複） */
export interface ProductInput {
  itemNo: string
  type: string
  code: string
  name: string
  event?: string
}

/** 手動新增／CSV 匯入商品後的結果摘要 */
export interface ProductImportResult {
  inserted: number
  skipped: number
  updated: number
  duplicateItemNos: string[]
  invalid: number
  invalidNames: string[]
}

/** 砍貨專區裡的一筆——跟同一份工作（Job）的擁有者/被分享班表的人共用，
 * 同一件商品被不同人標會各自出現一筆 */
export interface ProductDeal extends Product {
  dealId: string
  addedById: string
  addedByName: string
  mine: boolean
}
