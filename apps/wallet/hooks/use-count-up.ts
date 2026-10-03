'use client'

import { useEffect, useRef, useState } from 'react'

// 數字從上一個值滾動到新值（金額切換月份、切換卡片時用），系統要求減少動態效果時直接跳到結果
export function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    fromRef.current = target
    if (from === target) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const id = requestAnimationFrame(() => setValue(target))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(from + (target - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return value
}
