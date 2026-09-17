'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraOffIcon, XIcon } from 'lucide-react'

const SCANNER_ELEMENT_ID = 'sop-barcode-scan-region'

interface BarcodeScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: (code: string) => void
}

// 用手機鏡頭掃實體商品上的條碼。全螢幕呈現（不是塞在小彈窗裡）＋對焦框依
// 螢幕實際尺寸動態計算，是為了解決「一直要橋角度、掃不到」的問題——畫面
// 越小、對焦框用固定像素算，手機螢幕尺寸一多就會對不準。
//
// 只負責「掃到什麼」，不負責判斷這個條碼對應哪個商品——那件事沒有現成的
// 對照表可以自動猜，呼叫端要嘛拿掃到的值去比對現有商品、要嘛填進表單。
export function BarcodeScanDialog({ open, onOpenChange, onScanned }: BarcodeScanDialogProps) {
  const [error, setError] = useState('')
  // 除錯用：顯示鏡頭到底有沒有真的在嘗試解碼，還是根本沒在跑——不然每次
  // 「掃不到」都只能靠猜，看不到中間發生什麼事。之後穩定了可以拿掉。
  const [debugInfo, setDebugInfo] = useState('')
  const onScannedRef = useRef(onScanned)
  const onOpenChangeRef = useRef(onOpenChange)

  useEffect(() => {
    onScannedRef.current = onScanned
    onOpenChangeRef.current = onOpenChange
  }, [onScanned, onOpenChange])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChangeRef.current(false)
    }
    window.addEventListener('keydown', onKeyDown)

    let cancelled = false
    let hasScanned = false
    let failCount = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null
    setError('')
    setDebugInfo('準備中…')

    // 保險：正常情況鏡頭幾秒內就會回應（成功或失敗），真的卡住的話 8 秒後
    // 直接顯示錯誤，不要讓使用者對著黑畫面一直等、以為程式當掉。
    const startTimeoutId = setTimeout(() => {
      if (!cancelled && !hasScanned) {
        setError('相機一直沒有回應，請關閉後重新整理頁面再試一次')
      }
    }, 8000)

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (cancelled) return

      // fps 8、aspectRatio 1.5 是從另一個「掃得到」的參考網站（fantasy871014
      // 的 barcode-app）扒出來的實際設定，不是憑感覺調的。qrbox 那邊沒有照抄
      // 對方的固定 {width:280,height:140}——html5-qrcode 給固定物件時內部會
      // 取兩者較小值，框會被夾成正方形；改用函式寫法自己算寬扁矩形，才不會
      // 被這個內部行為吃掉。
      const scanConfig = {
        fps: 8,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.round(Math.min(viewfinderWidth * 0.85, 320))
          const height = Math.round(width * 0.45)
          return { width, height }
        },
        aspectRatio: 1.5,
      }
      const onDecoded = (decodedText: string) => {
        if (hasScanned) return
        hasScanned = true
        clearTimeout(startTimeoutId)
        onScannedRef.current(decodedText)
        onOpenChangeRef.current(false)
      }
      const onDecodeFail = (message: string) => {
        // 單一 frame 沒掃到東西很正常，不用當錯誤處理——但記下來方便除錯，
        // 用來確認鏡頭到底有沒有真的在跑解碼迴圈。
        failCount += 1
        if (!cancelled) setDebugInfo(`解碼中…已嘗試 ${failCount} 次，最近一次：${message}`)
      }

      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)

      // 不強制指定解析度——實測過要求 1920x1080 反而讓同一支手機、同一個
      // 條碼掃不出來（可能是相機為了滿足高解析度犧牲了對焦/更新頻率），
      // 讓瀏覽器自己挑鏡頭覺得合適的畫質，成功率明顯比較好。失敗的話重建
      // 一個全新的 instance 再試一次（同一個 instance 失敗一次後內部狀態
      // 不保證乾淨，重試可能卡在不上不下的黑畫面）。
      scanner
        .start({ facingMode: 'environment' }, scanConfig, onDecoded, onDecodeFail)
        .then(() => {
          clearTimeout(startTimeoutId)
          if (!cancelled) setDebugInfo('鏡頭已開啟，等待解碼中…')
        })
        .catch((firstErr: unknown) => {
          if (cancelled) return
          scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
          return scanner.start({ facingMode: 'environment' }, scanConfig, onDecoded, onDecodeFail)
            .then(() => {
              clearTimeout(startTimeoutId)
              if (!cancelled) setDebugInfo('鏡頭已開啟（重試成功），等待解碼中…')
            })
            .catch((retryErr: unknown) => {
              clearTimeout(startTimeoutId)
              if (cancelled) return
              const detail = retryErr instanceof Error ? retryErr.message : String(retryErr)
              console.error('[barcode-scan] camera start failed', { firstErr, retryErr })
              setError(`無法開啟相機，請確認瀏覽器已允許鏡頭權限（${detail}）`)
            })
        })
    })

    return () => {
      cancelled = true
      clearTimeout(startTimeoutId)
      window.removeEventListener('keydown', onKeyDown)
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-medium text-white">把商品上的條碼對準框內</p>
        <button
          onClick={() => onOpenChange(false)}
          className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <XIcon className="size-5" />
        </button>
      </div>
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <CameraOffIcon className="size-10 text-white/60" />
          <p className="text-sm text-white/80">{error}</p>
        </div>
      ) : (
        <div id={SCANNER_ELEMENT_ID} className="min-h-0 flex-1" />
      )}
      {debugInfo && !error && (
        <p className="break-all px-4 py-2 text-center text-[11px] text-white/50">{debugInfo}</p>
      )}
    </div>
  )
}
