'use client'

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import { StarIcon } from 'lucide-react'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

function barcodeFormat(type: string): string {
  switch (type.toUpperCase()) {
    case 'EAN13': return 'EAN13'
    case 'EAN8': return 'EAN8'
    case 'UPCA': return 'UPC'
    case 'UPCE': return 'UPCE'
    default: return 'CODE128'
  }
}

interface ProductBarcodeProps {
  product: Product
  height?: number
  width?: number
  fontSize?: number
}

export function ProductBarcode({ product, height = 40, width = 1.5, fontSize = 12 }: ProductBarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    try {
      JsBarcode(svgRef.current, product.code, {
        format: barcodeFormat(product.type),
        displayValue: true,
        height,
        margin: 0,
        width,
        fontSize,
      })
    } catch {
      // 條碼格式跟資料對不起來時安靜失敗，畫面上就是空白
    }
  }, [product.code, product.type, height, width, fontSize])

  return <svg ref={svgRef} className="w-full" />
}

interface ProductCardProps {
  product: Product
  favorite: boolean
  onToggleFavorite: () => void
  onZoom: () => void
  badge?: React.ReactNode
  /** 砍貨相關的按鈕：搜尋頁放「加到群組」的選單，砍貨專區頁放「移除/加入這個群組」的按鈕 */
  dealButton?: React.ReactNode
}

export function ProductCard({ product, favorite, onToggleFavorite, onZoom, badge, dealButton }: ProductCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-card">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          {product.itemNo && <p className="text-[10px] text-muted-foreground">品號 {product.itemNo}</p>}
          <p className="line-clamp-2 text-xs font-medium break-all">{product.name}</p>
          {badge}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {dealButton}
          <button onClick={onToggleFavorite} className="text-muted-foreground hover:text-amber-500">
            <StarIcon className={cn('size-4', favorite && 'fill-amber-400 text-amber-400')} />
          </button>
        </div>
      </div>
      {/* 條碼本身固定白底黑線，深色模式下才掃得到；點下去可以放大方便結帳掃描 */}
      <button onClick={onZoom} className="rounded-lg bg-white p-1.5">
        <ProductBarcode product={product} />
      </button>
    </div>
  )
}
