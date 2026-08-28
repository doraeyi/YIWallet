'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, BarcodeIcon, SearchIcon, PlusIcon, StarIcon, TagIcon } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useProductFavorites } from '@/hooks/use-product-favorites'
import { useProductGroups } from '@/hooks/use-product-groups'
import { AddProductSheet } from '@/components/wallet/add-product-sheet'
import { ProductCard } from '@/components/wallet/product-card'
import { ProductDetailDialog } from '@/components/wallet/product-detail-dialog'
import { GroupPickerButton } from '@/components/wallet/group-picker-button'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'

export default function BarcodePage() {
  const { me, loading: meLoading } = useMe()
  const { favorites, isFavorite, toggleFavorite, reload: reloadFavorites } = useProductFavorites()
  const { groups } = useProductGroups()
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

  function handleProductUpdated(updated: Product) {
    setResults(prev => prev.map(p => p.id === updated.id ? updated : p))
    setZoomProduct(updated)
    reloadFavorites()
  }

  function handleProductDeleted(productId: string) {
    setResults(prev => prev.filter(p => p.id !== productId))
    reloadFavorites()
  }

  function addToGroup(product: Product, groupId: string) {
    api.addDealProduct(product.id, groupId).catch(() => {})
  }

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
        <Link
          href="/barcode/deals"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <TagIcon className="size-5" />
        </Link>
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

      <ProductDetailDialog
        product={zoomProduct}
        onOpenChange={o => { if (!o) setZoomProduct(null) }}
        onUpdated={handleProductUpdated}
        onDeleted={handleProductDeleted}
      />

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

        {(() => {
          // 沒有搜尋字串時顯示全部常用；有搜尋字串時只顯示「常用裡也符合這次搜尋」的項目，
          // 不相關的常用不該因為它被收藏就一直出現
          const matchedIds = new Set(results.map(r => r.id))
          const visibleFavorites = query.trim().length === 0
            ? favorites
            : favorites.filter(f => matchedIds.has(f.id))

          if (visibleFavorites.length === 0) return null
          return (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <StarIcon className="size-3.5 fill-amber-400 text-amber-400" /> 常用
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleFavorites.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    favorite
                    onToggleFavorite={() => toggleFavorite(p)}
                    dealButton={<GroupPickerButton groups={groups} onAddToGroup={groupId => addToGroup(p, groupId)} />}
                    onZoom={() => setZoomProduct(p)}
                  />
                ))}
              </div>
            </div>
          )
        })()}

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
                      dealButton={<GroupPickerButton groups={groups} onAddToGroup={groupId => addToGroup(p, groupId)} />}
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
