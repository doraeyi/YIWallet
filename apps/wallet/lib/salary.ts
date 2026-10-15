import { jobRate, shiftHours } from './finance-utils'
import type { Job, Shift } from './types'

export interface JobPay {
  shiftCount: number
  normalHours: number
  holidayHours: number
  holidayShiftCount: number
  gross: number
  deduction: number
  net: number
}

// 某份工作某個月的薪資預估（班表頁「本月薪資預估」、現金流的發薪都用這個）。
// 國定假日出勤雙倍工資（勞基法）：時薪制當天薪資直接乘 2，月薪制則是全薪之外
// 再加發一天日薪（月薪 ÷ 30）作為假日出勤獎金。時薪制照每班實際時數算。
export function estimateJobPay(job: Job, shifts: Shift[], year: number, month: number, holidays: Set<string>): JobPay {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
  const jobShifts = shifts.filter(s => s.job_id === job.id && s.date.startsWith(monthPrefix))
  const isHoliday = (s: Shift) => holidays.has(s.date.slice(0, 10))
  const rate = jobRate(job)
  const normalHours = jobShifts.filter(s => !isHoliday(s)).reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0)
  const holidayHours = jobShifts.filter(isHoliday).reduce((sum, s) => sum + shiftHours(s.start_time, s.end_time), 0)
  const holidayShiftCount = jobShifts.filter(isHoliday).length
  const gross = job.pay_type === 'hourly'
    ? rate * normalHours + rate * 2 * holidayHours
    : rate + holidayShiftCount * (rate / 30)
  const deduction = job.labor_insurance_fee + job.health_insurance_fee + job.welfare_fee
  return { shiftCount: jobShifts.length, normalHours, holidayHours, holidayShiftCount, gross, deduction, net: gross - deduction }
}

// 台灣國定假日（只算有名稱的假日，一般週末不算）；同一年只抓一次
const holidayCache = new Map<number, Promise<Set<string>>>()
export function fetchHolidaySet(year: number): Promise<Set<string>> {
  let p = holidayCache.get(year)
  if (!p) {
    p = fetch(`https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/${year}.json`)
      .then(r => r.json())
      .then((data: { date: string; isHoliday: boolean; description: string }[]) => new Set(
        data.filter(d => d.isHoliday && d.description !== '').map(d => `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`),
      ))
      .catch(() => { holidayCache.delete(year); return new Set<string>() })
    holidayCache.set(year, p)
  }
  return p
}
