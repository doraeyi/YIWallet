import crypto from 'node:crypto'

export interface InvoiceItem {
  invoiceNo: string
  date: string          // YYYY-MM-DD
  sellerName: string
  amount: number
  suggestedCategory: string
}

const SELLER_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['全家', '7-ELEVEN', '7eleven', '萊爾富', 'OK超商', '統一超商', 'FamilyMart', 'Hi-Life'], category: 'food' },
  { keywords: ['麥當勞', '肯德基', 'KFC', '摩斯', '漢堡王', '星巴克', '路易莎', '便當', '餐廳', '小吃', '飲食', '飲料', '拉麵', '壽司', '火鍋', '咖啡'], category: 'food' },
  { keywords: ['捷運', '台鐵', '高鐵', 'YouBike', '公車', 'Uber', '計程車', '停車', '加油', 'CPC', '台灣中油', '中油'], category: 'transport' },
  { keywords: ['全聯', '家樂福', '大潤發', '愛買', 'Costco', '好市多', '頂好', '惠康', '美廉社'], category: 'shopping' },
  { keywords: ['誠品', '博客來', '金石堂', '文具', '補習班', '學費'], category: 'education' },
  { keywords: ['藥局', '藥妝', 'Watsons', '屈臣氏', '康是美', '診所', '醫院', '藥房'], category: 'health' },
  { keywords: ['電影', 'KTV', '遊樂', '電競', 'Netflix', 'Spotify'], category: 'entertainment' },
  { keywords: ['水費', '電費', '瓦斯', '台電', '自來水'], category: 'daily' },
]

export function guessCategory(sellerName: string): string {
  for (const rule of SELLER_RULES) {
    if (rule.keywords.some(k => sellerName.includes(k))) return rule.category
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
