'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

const SESSION_KEY = 'yiwallet_splash_shown'
const HOLD_MS = 500   // logo 淡入、門關著停留
const OPEN_MS = 700   // 開門動畫時間
const EXIT_MS = 300   // 開完後整層淡出移除

type Phase = 'idle' | 'hold' | 'opening' | 'done'

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    let alreadyShown = false
    try {
      alreadyShown = sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      // 讀不到 sessionStorage 就當作沒顯示過，還是跑一次動畫
    }
    if (alreadyShown) {
      setPhase('done')
      return
    }

    try {
      sessionStorage.setItem(SESSION_KEY, '1')
    } catch {
      // 存不進去也沒關係，最多這次瀏覽多跑幾次動畫
    }

    setPhase('hold')
    const openTimer = setTimeout(() => setPhase('opening'), HOLD_MS)
    const doneTimer = setTimeout(() => setPhase('done'), HOLD_MS + OPEN_MS + EXIT_MS)
    return () => {
      clearTimeout(openTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  if (phase === 'idle' || phase === 'done') return null

  const opening = phase === 'opening'

  return (
    <div
      className={cn(
        'fixed inset-0 z-100 overflow-hidden transition-opacity ease-in-out',
        opening ? 'pointer-events-none' : '',
      )}
      style={{ transitionDuration: `${EXIT_MS}ms`, transitionDelay: opening ? `${OPEN_MS - EXIT_MS}ms` : '0ms', opacity: opening ? 0 : 1 }}
      aria-hidden="true"
    >
      {/* 左門 */}
      <div
        className="absolute inset-y-0 left-0 w-1/2 bg-[#0f2942] transition-transform ease-in-out"
        style={{ transitionDuration: `${OPEN_MS}ms`, transform: opening ? 'translateX(-100%)' : 'translateX(0)' }}
      />
      {/* 右門 */}
      <div
        className="absolute inset-y-0 right-0 w-1/2 bg-[#0f2942] transition-transform ease-in-out"
        style={{ transitionDuration: `${OPEN_MS}ms`, transform: opening ? 'translateX(100%)' : 'translateX(0)' }}
      />
      {/* Logo：固定在正中間，門打開時跟著淡出、縮小 */}
      <div
        className="absolute top-1/2 left-1/2 flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-all ease-in-out"
        style={{
          transitionDuration: `${OPEN_MS}ms`,
          opacity: opening ? 0 : 1,
          transform: `translate(-50%, -50%) scale(${opening ? 0.85 : 1})`,
        }}
      >
        <Image src="/icons/logo.png" alt="易記帳" width={96} height={96} priority className="drop-shadow-lg" />
      </div>
    </div>
  )
}
