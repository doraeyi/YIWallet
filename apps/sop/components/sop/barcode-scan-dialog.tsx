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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null
    setError('')

    // 保險：正常情況鏡頭幾秒內就會回應（成功或失敗），真的卡住的話 8 秒後
    // 直接顯示錯誤，不要讓使用者對著黑畫面一直等、以為程式當掉。
    const startTimeoutId = setTimeout(() => {
      if (!cancelled && !hasScanned) {
        setError('相機一直沒有回應，請關閉後重新整理頁面再試一次')
      }
    }, 8000)

    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (cancelled) return

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
      ]
      const scanConfig = {
        fps: 20,
        // 對焦框依實際畫面寬高算，不用固定像素：手機螢幕尺寸差很多，固定
        // 像素在小螢幕會塞不下、大螢幕又太小。框故意放大、放寬鬆一點——
        // 條碼實際印刷高度常常比想像中高（含下面那排數字），框太扁太小
        // 的話邊緣很容易被切到，明明看起來對準了還是掃不到。
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.round(viewfinderWidth * 0.92)
          const height = Math.round(viewfinderHeight * 0.38)
          return { width, height }
        },
      }
      const onDecoded = (decodedText: string) => {
        if (hasScanned) return
        hasScanned = true
        clearTimeout(startTimeoutId)
        onScannedRef.current(decodedText)
        onOpenChangeRef.current(false)
      }
      const onDecodeFail = () => {
        // 單一 frame 沒掃到東西很正常，不用當錯誤處理
      }

      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { formatsToSupport, verbose: false })

      // 不強制指定解析度——實測過要求 1920x1080 反而讓同一支手機、同一個
      // 條碼掃不出來（可能是相機為了滿足高解析度犧牲了對焦/更新頻率），
      // 讓瀏覽器自己挑鏡頭覺得合適的畫質，成功率明顯比較好。失敗的話重建
      // 一個全新的 instance 再試一次（同一個 instance 失敗一次後內部狀態
      // 不保證乾淨，重試可能卡在不上不下的黑畫面）。
      scanner
        .start({ facingMode: 'environment' }, scanConfig, onDecoded, onDecodeFail)
        .then(() => clearTimeout(startTimeoutId))
        .catch((firstErr: unknown) => {
          if (cancelled) return
          scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { formatsToSupport, verbose: false })
          return scanner.start({ facingMode: 'environment' }, scanConfig, onDecoded, onDecodeFail)
            .then(() => clearTimeout(startTimeoutId))
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
    </div>
  )
}
