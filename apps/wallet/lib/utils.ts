export { cn } from '@yiwallet/ui/lib/utils'

// 把 hex 顏色調亮/調暗，percent 為負數變暗、正數變亮（例如卡片正面到背面的漸層）
export function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const r = Math.min(255, Math.max(0, (num >> 16) + amt))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`
}

// 信用卡繳費截止日以前存完整日期 YYYY-MM-DD（網頁 date picker），現在改存「每月幾號」的純數字；
// 兩種都取出幾號，後端到期提醒也只看幾號
export function dayOfMonth(raw: string | null | undefined): number | null {
  if (!raw) return null
  const m = raw.match(/^(?:\d{4}-\d{2}-)?(\d{1,2})$/)
  const day = m ? Number(m[1]) : NaN
  return day >= 1 && day <= 31 ? day : null
}
