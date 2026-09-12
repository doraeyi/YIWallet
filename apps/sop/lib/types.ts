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

export interface ShiftPreset {
  id: string
  label: string
  start_time: string
  end_time: string
}

// 只有砍貨專區的工作選單/協作者管理用得到，跟 wallet app 的排班功能共用同一個後端型別，
// 但這裡只當唯讀資料用（不會顯示薪資等欄位）。
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
  canManage: boolean
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

/** 手順查詢的一個步驟（爬自 xuhan.app），image_url 可能是空字串代表沒有圖 */
export interface XuhanStep {
  text: string
  imageUrl: string
}

/** 手順查詢裡的一張步驟卡（一台機器/一個作法），可能有好幾張同屬一個商品 */
export interface XuhanKeywordItem {
  id: string
  machineName: string | null
  steps: XuhanStep[]
  imageUrl: string | null
  sortOrder: number
}

/** 手順查詢的商品，items 是按順序排好的步驟卡 */
export interface XuhanKeyword {
  id: string
  title: string
  tags: string | null
  imageUrl: string | null
  pinned: boolean
  hidden: boolean
  items: XuhanKeywordItem[]
}
