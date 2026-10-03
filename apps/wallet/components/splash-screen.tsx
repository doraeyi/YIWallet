'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import styles from './splash-screen.module.css'

// 開場動畫：每次開啟 App（同一個分頁工作階段）只播一次；點一下可以跳過。
// 動畫細節（時間軸、keyframes）都在 splash-screen.module.css。
const SESSION_KEY = 'yiwallet_splash_shown'
const SHOW_MS = 1500 // 播到 logo 漣漪結束
const EXIT_MS = 600  // 收成圓消失（跟 CSS 的 transition 一樣長）

type Phase = 'idle' | 'show' | 'exit' | 'done'

function shouldPlay(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  try {
    if (sessionStorage.getItem(SESSION_KEY) === '1') return false
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // 讀寫不了 sessionStorage 就照樣播，最多這次瀏覽多播幾次
  }
  return true
}

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    if (!shouldPlay()) return
    const timers = [
      setTimeout(() => setPhase('show'), 0),
      setTimeout(() => setPhase('exit'), SHOW_MS),
      setTimeout(() => setPhase('done'), SHOW_MS + EXIT_MS),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  function skip() {
    setPhase('exit')
    setTimeout(() => setPhase('done'), EXIT_MS)
  }

  if (phase === 'idle' || phase === 'done') return null

  return (
    <div className={cn(styles.root, phase === 'exit' && styles.exit)} onClick={skip} aria-hidden="true">
      <div className={styles.glow} />
      <div className={styles.glow} />

      <div className={styles.mark}>
        <svg className={styles.ring} viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="68" />
        </svg>
        <span className={styles.ripple} />
        <Image src="/icons/logo.png" alt="" width={112} height={112} priority className={styles.logo} />
      </div>

      <div className={styles.title}>
        <span>易</span>
        <span>記</span>
        <span>帳</span>
      </div>
      <p className={styles.tagline}>記帳・班表・薪水，一次搞定</p>
    </div>
  )
}
