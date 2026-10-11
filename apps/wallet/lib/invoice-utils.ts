import crypto from 'node:crypto'

export interface InvoiceItem {
  invoiceNo: string
  date: string          // YYYY-MM-DD
  sellerName: string
  amount: number
  suggestedCategory: string
}

// 店名 → 分類。跟後端 routers/auto_record.py 的 _SELLER_RULES 同一套，改一邊要記得改另一邊。
// 'meal' 不是真的分類：吃的（超商、餐廳）再依消費時段分成早餐／午餐／點心／晚餐；
// 不知道時間（電子發票只有日期）就歸舊的「餐飲」
const SELLER_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['星巴克', 'Starbucks', '路易莎', 'Louisa', 'cama', '咖啡', '飲料', '茶', '50嵐', '可不可', '清心', '迷客夏', '麻古', '得正', '烏弄'], category: 'drink' },
  { keywords: ['全家', '7-ELEVEN', '7eleven', '統一超商', '萊爾富', 'OK超商', 'FamilyMart', 'Hi-Life'], category: 'meal' },
  { keywords: ['麥當勞', '肯德基', 'KFC', '摩斯', '漢堡王', '早餐', '便當', '餐廳', '小吃', '飲食', '麵', '拉麵', '壽司', '火鍋', '牛排', '食堂'], category: 'meal' },
  { keywords: ['加油', 'CPC', '台灣中油', '中油', '全國加油', '停車'], category: 'car' },
  { keywords: ['捷運', '台鐵', '高鐵', 'YouBike', '公車', 'Uber', '計程車', '客運'], category: 'transport' },
  { keywords: ['全聯', '家樂福', '大潤發', '愛買', 'Costco', '好市多', '頂好', '美廉社'], category: 'daily' },
  { keywords: ['誠品', '博客來', '金石堂', '文具', '補習班', '學費'], category: 'education' },
  { keywords: ['康是美', '屈臣氏', 'Watsons', '寶雅', '藥妝'], category: 'beauty' },
  { keywords: ['藥局', '診所', '醫院', '藥房'], category: 'health' },
  { keywords: ['電影', '影城', 'KTV', '遊樂', '電競', 'Netflix', 'Spotify', 'Steam'], category: 'entertainment' },
  { keywords: ['水費', '電費', '瓦斯', '台電', '自來水'], category: 'utilities' },
  { keywords: ['中華電信', '台灣大哥大', '遠傳', '台灣之星', '亞太電信'], category: 'phone' },
  { keywords: ['UNIQLO', 'ZARA', 'H&M', '服飾'], category: 'clothing' },
]

// 吃的依時段分：早餐 5–11、午餐 11–15、點心 15–17、晚餐 17–22，其餘是宵夜（點心）
function mealByHour(hour: number): string {
  if (hour >= 5 && hour < 11) return 'breakfast'
  if (hour >= 11 && hour < 15) return 'lunch'
  if (hour >= 17 && hour < 22) return 'dinner'
  return 'snack'
}

// 台灣現在幾點。LINE webhook 跑在 Vercel（UTC），不能直接用 new Date().getHours()
export function taipeiHour(date = new Date()): number {
  return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Taipei' }).format(date)) % 24
}

export function guessCategory(sellerName: string, hour?: number): string {
  const lowered = sellerName.toLowerCase()
  for (const rule of SELLER_RULES) {
    if (rule.keywords.some(k => lowered.includes(k.toLowerCase()))) {
      if (rule.category !== 'meal') return rule.category
      return hour === undefined ? 'food' : mealByHour(hour)
    }
  }
  return 'other-expense'
}

export function parseInvoiceDate(raw: string): string {
  // 財政部格式 20240101 → 2024-01-01
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
}

export function buildSignature(params: Record<string, string>, apiKey: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&')
  return crypto.createHmac('sha256', apiKey).update(sorted).digest('base64')
}

export function encryptCard(cardNo: string, aesKey: string): string {
  // 財政部要求 AES-128-CBC，金鑰為 hex string（16 bytes = 32 hex chars）
  const keyBuf = Buffer.from(aesKey, 'hex')
  const iv = keyBuf.slice(0, 16)
  const cipher = crypto.createCipheriv('aes-128-cbc', keyBuf, iv)
  cipher.setAutoPadding(true)
  return Buffer.concat([cipher.update(cardNo, 'utf8'), cipher.final()]).toString('base64')
}
