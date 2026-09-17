'use client'

import { useEffect, useRef, useState } from 'react'
import { CameraOffIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const SCANNER_ELEMENT_ID = 'sop-barcode-scan-region'

interface BarcodeScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: (code: string) => void
}

// 用手機鏡頭掃實體商品上的條碼，掃到後把值丟給呼叫端（目前用來自動填「編輯
// 商品」的條碼欄位，取代手動打 13 位數）。只負責「掃到什麼」，不負責判斷
// 這個條碼對應哪個商品——那件事沒有現成的對照表可以自動猜，還是要先手動
// 選好商品才知道要把條碼填去哪一筆。
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

    let cancelled = false
    let hasScanned = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let scanner: any = null
    setError('')

    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (cancelled) return
      scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      })

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 160 } },
        (decodedText: string) => {
          if (hasScanned) return
          hasScanned = true
          onScannedRef.current(decodedText)
          onOpenChangeRef.current(false)
        },
        () => {
          // 單一 frame 沒掃到東西很正常，不用當錯誤處理
        },
      ).catch(() => {
        if (!cancelled) setError('無法開啟相機，請確認瀏覽器已允許鏡頭權限')
      })
    })

    return () => {
      cancelled = true
      if (scanner) {
        scanner.stop().then(() => scanner.clear()).catch(() => {})
      }
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogTitle className="text-base font-semibold">掃描條碼</DialogTitle>
        {error ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CameraOffIcon className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div id={SCANNER_ELEMENT_ID} className="aspect-4/3 w-full overflow-hidden rounded-xl bg-black" />
        )}
        <p className="text-center text-xs text-muted-foreground">把商品上的條碼對準框內</p>
      </DialogContent>
    </Dialog>
  )
}
