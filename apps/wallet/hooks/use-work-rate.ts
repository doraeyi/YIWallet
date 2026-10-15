'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import { hourlyEquivalent } from '@/lib/salary'

// 「這筆等於上班多久」用的時薪：自己的工作（不含別人分享的）換算成時薪後取平均。
// 沒有工作或沒填薪資就是 null，畫面上就不顯示換算。整個 App 共用同一次請求。
let cached: Promise<number | null> | null = null

function load(): Promise<number | null> {
  cached ??= api.fetchJobs()
    .then(jobs => {
      const rates = jobs.map(hourlyEquivalent).filter(r => r > 0)
      return rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null
    })
    .catch(() => { cached = null; return null })
  return cached
}

/** 工作設定改了（設定頁新增／修改工作）之後呼叫，下次重新算 */
export function invalidateWorkRate() {
  cached = null
}

export function useWorkRate(): number | null {
  const [rate, setRate] = useState<number | null>(null)
  useEffect(() => {
    let alive = true
    load().then(r => { if (alive) setRate(r) })
    return () => { alive = false }
  }, [])
  return rate
}
