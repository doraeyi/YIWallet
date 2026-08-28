'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import JsBarcode from 'jsbarcode'
import { ChevronLeftIcon, BarcodeIcon, SearchIcon } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'

function barcodeFormat(type: string): string {
  switch (type.toUpperCase()) {
    case 'EAN13': return 'EAN13'
    case 'EAN8': return 'EAN8'
    case 'UPCA': return 'UPC'
    case 'UPCE': return 'UPCE'
    default: return 'CODE128'
  }
}

function ProductBarcode({ product }: { product: Product }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    try {
      JsBarcode(svgRef.current, product.code, {
        format: barcodeFormat(product.type),
        displayValue: true,
        height: 40,
        margin: 0,
        width: 1.5,
        fontSize: 12,
      })
    } catch {
      // 條碼格式跟資料對不起來時安靜失敗，畫面上就是空白
    }
  }, [product.code, product.type])

  return <svg ref={svgRef} className="w-full" />
}

export default function BarcodePage() {
  const { me, loading: meLoading } = useMe()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length === 0) return
    const timer = setTimeout(() => {
      setSearching(true)
      api.searchProducts(keyword)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

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
        <h1 className="flex items-center gap-1.5 text-xl font-bold">
          <BarcodeIcon className="size-5 text-amber-500" />
          條碼查詢
        </h1>
      </div>

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

        {query.trim().length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">輸入關鍵字開始搜尋</p>
        ) : searching ? (
          <p className="py-8 text-center text-sm text-muted-foreground">搜尋中…</p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">查無符合的商品</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {results.map(p => (
              <div key={p.id} className="flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm dark:bg-card">
                <p className="line-clamp-2 text-xs font-medium break-all">{p.name}</p>
                {/* 條碼本身固定白底黑線，深色模式下才掃得到 */}
                <div className="rounded-lg bg-white p-1.5">
                  <ProductBarcode product={p} />
                </div>
              </div>
            ))}
          </div>
        )}

        {results.length === 60 && (
          <p className="text-center text-xs text-muted-foreground">結果過多，僅顯示前 60 筆，請輸入更精確的關鍵字</p>
        )}
      </div>
    </div>
  )
}
