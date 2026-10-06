'use client'

import { useEffect, useRef } from 'react'

// PWA 切到背景再回來時頁面不會重新載入，資料會停在離開前的樣子
// （例如剛用 Apple Pay 付款，自動記的那筆不會出現）。App 回到前景時呼叫 refresh，
// 短時間內來回切換不重複抓（minIntervalMs 內只抓一次）。
export function useRefreshOnResume(refresh: () => void, minIntervalMs = 5000) {
  const refreshRef = useRef(refresh)
  const lastRef = useRef(0)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    lastRef.current = Date.now()
    function onResume() {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastRef.current < minIntervalMs) return
      lastRef.current = now
      refreshRef.current()
    }
    document.addEventListener('visibilitychange', onResume)
    window.addEventListener('focus', onResume)
    return () => {
      document.removeEventListener('visibilitychange', onResume)
      window.removeEventListener('focus', onResume)
    }
  }, [minIntervalMs])
}
