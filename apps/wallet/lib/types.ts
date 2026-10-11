export type TransactionType = 'income' | 'expense'

export type Period = 'week' | 'month' | 'year'

export interface Category {
  id: string
  name: string
  type: TransactionType | 'both'
  emoji: string
  color: string   // icon background color (hex)
  text: string    // icon foreground color
  hidden?: boolean // 舊分類：還認得（舊資料要顯示），但不出現在記帳的分類選單裡
  icon?: string    // 圖示 key（見 category-icon.tsx）；內建分類不填，直接用 id
  custom?: boolean // 使用者自訂的分類（id 是 "u{數字}"）
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
  description?: string // 商家／品名（Apple Pay、電子發票、LINE 記帳會帶；手動記帳等於備註）
  source?: string      // manual | einvoice_csv | line_bot | bank_notification | apple_pay
  isCash?: boolean     // 明確選了現金（跟「還沒指定卡片」區分）
}

export interface ChartDataPoint {
  label: string
  income: number
  expense: number
}

// 分類：id 存進資料庫（transactions.category），所以已經用過的 id 不能改、也不能刪，
// 不想再讓人選的舊分類標 hidden（舊資料照樣顯示得出來）。圖示在 components/wallet/category-icon.tsx。
export const CATEGORIES: Category[] = [
  // ── 支出 ──
  { id: 'breakfast',     name: '早餐',     type: 'expense', emoji: '🥐', color: '#FEF3C7', text: '#B45309' },
  { id: 'lunch',         name: '午餐',     type: 'expense', emoji: '🍱', color: '#FFEDD5', text: '#C2410C' },
  { id: 'dinner',        name: '晚餐',     type: 'expense', emoji: '🍽️', color: '#FEE2E2', text: '#DC2626' },
  { id: 'drink',         name: '飲品',     type: 'expense', emoji: '🧋', color: '#F5E8DA', text: '#92400E' },
  { id: 'snack',         name: '點心',     type: 'expense', emoji: '🍪', color: '#FCE7F3', text: '#BE185D' },
  { id: 'alcohol',       name: '酒類',     type: 'expense', emoji: '🍷', color: '#F3E8FF', text: '#7E22CE' },
  { id: 'transport',     name: '交通',     type: 'expense', emoji: '🚌', color: '#DBEAFE', text: '#2563EB' },
  { id: 'car',           name: '汽機車',   type: 'expense', emoji: '🛵', color: '#E0E7FF', text: '#4338CA' },
  { id: 'shopping',      name: '購物',     type: 'expense', emoji: '🛍️', color: '#CFFAFE', text: '#0891B2' },
  { id: 'clothing',      name: '服飾',     type: 'expense', emoji: '👕', color: '#E0F2FE', text: '#0369A1' },
  { id: 'daily',         name: '日用品',   type: 'expense', emoji: '🧻', color: '#DCFCE7', text: '#16A34A' },
  { id: 'entertainment', name: '娛樂',     type: 'expense', emoji: '🎮', color: '#EDE9FE', text: '#7C3AED' },
  { id: 'rent',          name: '房租',     type: 'expense', emoji: '🏠', color: '#ECFCCB', text: '#4D7C0F' },
  { id: 'utilities',     name: '水電瓦斯', type: 'expense', emoji: '💡', color: '#FEF9C3', text: '#A16207' },
  { id: 'phone',         name: '電話網路', type: 'expense', emoji: '📱', color: '#E2E8F0', text: '#475569' },
  { id: 'health',        name: '醫療',     type: 'expense', emoji: '🏥', color: '#FFE4E6', text: '#E11D48' },
  { id: 'education',     name: '教育',     type: 'expense', emoji: '📚', color: '#FBCFE8', text: '#DB2777' },
  { id: 'beauty',        name: '美容',     type: 'expense', emoji: '💄', color: '#FDF2F8', text: '#C026D3' },
  { id: 'pet',           name: '寵物',     type: 'expense', emoji: '🐾', color: '#FFEDD5', text: '#EA580C' },
  { id: 'gift',          name: '禮物',     type: 'expense', emoji: '🎁', color: '#FFE4E6', text: '#BE123C' },
  { id: 'insurance',     name: '保險',     type: 'expense', emoji: '🛡️', color: '#D1FAE5', text: '#047857' },
  { id: 'transfer',      name: '轉帳',     type: 'expense', emoji: '💸', color: '#BFDBFE', text: '#1D4ED8' },
  { id: 'other-expense', name: '其他',     type: 'expense', emoji: '📦', color: '#E5E7EB', text: '#6B7280' },
  // 舊分類：以前的「餐飲」一格包全部吃的，現在拆成早餐／午餐／晚餐…，舊資料還是顯示「餐飲」
  { id: 'food',          name: '餐飲',     type: 'expense', emoji: '🍜', color: '#FECACA', text: '#DC2626', hidden: true },
  // ── 收入 ──
  { id: 'salary',        name: '薪水',     type: 'income',  emoji: '💼', color: '#BBF7D0', text: '#16A34A' },
  { id: 'bonus',         name: '獎金',     type: 'income',  emoji: '🎁', color: '#FDE68A', text: '#D97706' },
  { id: 'cashback',      name: '回饋',     type: 'income',  emoji: '🪙', color: '#FEF3C7', text: '#B45309' },
  { id: 'trade',         name: '二手買賣', type: 'income',  emoji: '🤝', color: '#E0E7FF', text: '#4338CA' },
  { id: 'dividend',      name: '股息',     type: 'income',  emoji: '📊', color: '#DBEAFE', text: '#2563EB' },
  { id: 'rental',        name: '租金',     type: 'income',  emoji: '🏢', color: '#ECFCCB', text: '#4D7C0F' },
  { id: 'investment',    name: '投資',     type: 'income',  emoji: '📈', color: '#CCFBF1', text: '#0F766E' },
  { id: 'other-income',  name: '其他',     type: 'income',  emoji: '💰', color: '#E5E7EB', text: '#6B7280' },
]

// ── 自訂分類 ──
// 存在後端（/categories），登入後由 TransactionsProvider 跟交易一起載入、登記在這裡，
// 所以 getCategoryById 在任何地方都認得自訂分類，不用每個元件自己去抓。
// 要在分類有變動時重新 render 的元件用 hooks/use-custom-categories.ts。
let customCategories: Category[] = []
const customListeners = new Set<() => void>()

export function setCustomCategories(list: Category[]) {
  customCategories = list
  customListeners.forEach(fn => fn())
}

export function getCustomCategories(): Category[] {
  return customCategories
}

export function subscribeCustomCategories(listener: () => void): () => void {
  customListeners.add(listener)
  return () => { customListeners.delete(listener) }
}

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.id === id) ?? customCategories.find(c => c.id === id)
}

// 記帳選單裡可以選的分類：內建＋自訂，不含已下架／已刪除的
export function pickableCategories(type: TransactionType): Category[] {
  return [...CATEGORIES, ...customCategories].filter(c => !c.hidden && c.type === type)
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
  paymentDueDate?: string    // 信用卡繳費截止日：每月幾號（舊資料可能是 YYYY-MM-DD，用 dayOfMonth 取號）
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
  userId: string
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
  /** 只有「別人分享給我」的工作（GET /jobs/shared-with-me）才會實際填這個值 */
  canManage: boolean
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
  canManage: boolean
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

