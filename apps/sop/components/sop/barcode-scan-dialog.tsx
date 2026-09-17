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
        fps: 15,
        // 對焦框依實際畫面寬高算，不用固定像素：手機螢幕尺寸差很多，固定
        // 像素在小螢幕會塞不下、大螢幕又太小。條碼是橫向長方形，框故意做
        // 成寬扁形狀比較好對準。
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.round(viewfinderWidth * 0.85)
          const height = Math.round(Math.min(viewfinderHeight * 0.5, width * 0.45))
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

      // 先跟鏡頭要高解析度畫面——解析度太低，密集的條碼線在正常閱讀距離下
      // 會糊成一團解不出來。但有些手機/瀏覽器不支援指定的解析度組合，硬要
      // 的話 getUserMedia 會直接失敗連鏡頭都開不了，所以失敗時退回最基本的
      // 「後鏡頭」設定再試一次。這裡刻意用「全新的」Html5Qrcode instance 重
      // 試，不重用剛剛失敗那個——同一個 instance 失敗一次之後內部狀態不保證
      // 乾淨，之前拿同一個 instance 重試會卡在不上不下的黑畫面、既不成功也
      // 不報錯。
      scanner
        .start({ facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, scanConfig, onDecoded, onDecodeFail)
        .then(() => clearTimeout(startTimeoutId))
        .catch((highResErr: unknown) => {
          if (cancelled) return
          scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { formatsToSupport, verbose: false })
          return scanner.start({ facingMode: 'environment' }, scanConfig, onDecoded, onDecodeFail)
            .then(() => clearTimeout(startTimeoutId))
            .catch((fallbackErr: unknown) => {
              clearTimeout(startTimeoutId)
              if (cancelled) return
              const detail = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)
              console.error('[barcode-scan] camera start failed', { highResErr, fallbackErr })
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
