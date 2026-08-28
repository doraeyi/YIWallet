'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import JsBarcode from 'jsbarcode'
import { ChevronLeftIcon, BarcodeIcon, SearchIcon, PlusIcon, StarIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useMe } from '@/hooks/use-me'
import { useProductFavorites } from '@/hooks/use-product-favorites'
import { AddProductSheet } from '@/components/wallet/add-product-sheet'
import * as api from '@/lib/api'
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

function ProductBarcode({ product, height = 40, width = 1.5, fontSize = 12 }: ProductBarcodeProps) {
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
}

function ProductCard({ product, favorite, onToggleFavorite, onZoom }: ProductCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-card">
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0">
          {product.itemNo && <p className="text-[10px] text-muted-foreground">品號 {product.itemNo}</p>}
          <p className="line-clamp-2 text-xs font-medium break-all">{product.name}</p>
        </div>
        <button onClick={onToggleFavorite} className="shrink-0 text-muted-foreground hover:text-amber-500">
          <StarIcon className={cn('size-4', favorite && 'fill-amber-400 text-amber-400')} />
        </button>
      </div>
      {/* 條碼本身固定白底黑線，深色模式下才掃得到；點下去可以放大方便結帳掃描 */}
      <button onClick={onZoom} className="rounded-lg bg-white p-1.5">
        <ProductBarcode product={product} />
      </button>
    </div>
  )
}

export default function BarcodePage() {
  const { me, loading: meLoading } = useMe()
  const { favorites, isFavorite, toggleFavorite } = useProductFavorites()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null)

  const runSearch = useCallback((keyword: string) => {
    if (keyword.length === 0) return
    setSearching(true)
    api.searchProducts(keyword)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length === 0) return
    const timer = setTimeout(() => runSearch(keyword), 250)
    return () => clearTimeout(timer)
  }, [query, runSearch])

  if (meLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
    )
  }

  if (!me?.canUseBarcode) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-3xl">🔒</p>
        <p className="text-sm text-muted-foreground">你沒有條碼查詢功能的使用權限</p>
        <Link href="/settings" className="mt-2 text-xs text-amber-500 hover:text-amber-600">回設定頁</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:pt-8">
        <Link href="/settings" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="flex flex-1 items-center gap-1.5 text-xl font-bold">
          <BarcodeIcon className="size-5 text-amber-500" />
          條碼查詢
        </h1>
        <button
          onClick={() => setAddOpen(true)}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <PlusIcon className="size-5" />
        </button>
      </div>

      <AddProductSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onImported={() => runSearch(query.trim())}
      />

      <Dialog open={!!zoomProduct} onOpenChange={o => { if (!o) setZoomProduct(null) }}>
        <DialogContent className="max-w-xs">
          <DialogTitle className="sr-only">條碼放大</DialogTitle>
          {zoomProduct && (
            <div className="flex flex-col items-center gap-2 py-4">
              {zoomProduct.itemNo && <p className="text-xs text-muted-foreground">品號 {zoomProduct.itemNo}</p>}
              <p className="text-center text-sm font-medium">{zoomProduct.name}</p>
              <div className="mt-2 w-full rounded-lg bg-white p-3">
                <ProductBarcode product={zoomProduct} height={90} width={2.5} fontSize={16} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="輸入品號或商品名稱搜尋"
            className="w-full rounded-xl border bg-white py-2.5 pr-3 pl-9 text-sm outline-none focus:border-amber-400 dark:bg-card"
          />
        </div>

        {favorites.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <StarIcon className="size-3.5 fill-amber-400 text-amber-400" /> 常用
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {favorites.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  favorite
                  onToggleFavorite={() => toggleFavorite(p)}
                  onZoom={() => setZoomProduct(p)}
                />
              ))}
            </div>
          </div>
        )}

        {query.trim().length === 0 ? (
          favorites.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">輸入關鍵字開始搜尋</p>
          )
        ) : searching ? (
          <p className="py-8 text-center text-sm text-muted-foreground">搜尋中…</p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">查無符合的商品</p>
        ) : (
          // 已經在「常用」顯示過的就不在搜尋結果裡重複顯示
          (() => {
            const nonFavoriteResults = results.filter(p => !isFavorite(p.id))
            if (nonFavoriteResults.length === 0) return null
            return (
              <div className="flex flex-col gap-2">
                {favorites.length > 0 && <p className="text-xs font-medium text-muted-foreground">搜尋結果</p>}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {nonFavoriteResults.map(p => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      favorite={false}
                      onToggleFavorite={() => toggleFavorite(p)}
                      onZoom={() => setZoomProduct(p)}
                    />
                  ))}
                </div>
              </div>
            )
          })()
        )}

        {results.length === 60 && (
          <p className="text-center text-xs text-muted-foreground">結果過多，僅顯示前 60 筆，請輸入更精確的關鍵字</p>
        )}
      </div>
    </div>
  )
}
