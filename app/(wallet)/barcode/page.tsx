'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, BarcodeIcon, SearchIcon, PlusIcon, StarIcon, TagIcon, RefreshCwIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/use-me'
import { useProductFavorites } from '@/hooks/use-product-favorites'
import { useAccessibleJobs } from '@/hooks/use-accessible-jobs'
import { useProductDeals } from '@/hooks/use-product-deals'
import { AddProductSheet } from '@/components/wallet/add-product-sheet'
import { ProductCard } from '@/components/wallet/product-card'
import { ProductDetailDialog } from '@/components/wallet/product-detail-dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

// Radix Select 不支援空字串當選項值，「全部」用這個代稱，對外仍轉回空字串
const ALL_EVENTS = 'all'

// 檔期標籤原始格式是「YYYYMMDD_說明」，畫面上顯示成「MM/DD 說明」比較好讀
function formatEventLabel(label: string): string {
  const match = label.match(/^(\d{4})(\d{2})(\d{2})_(.+)$/)
  if (!match) return label
  const [, , mm, dd, rest] = match
  return `${mm}/${dd} ${rest}`
}

// 已經標到砍貨專區的商品，圖示直接消失（目前先假設一人一份工作，不用再選）
function DealButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  if (!show) return null
  return (
    <button onClick={onToggle} className="text-muted-foreground hover:text-sky-500">
      <TagIcon className="size-4" />
    </button>
  )
}

export default function BarcodePage() {
  const { me, loading: meLoading } = useMe()
  const { favorites, isFavorite, toggleFavorite, reload: reloadFavorites } = useProductFavorites()
  // 目前先假設一個人只會用到一份工作，直接拿第一份（自己的或別人分享給我的）
  // 當砍貨目標，不用另外選
  const { jobs } = useAccessibleJobs()
  const activeJob = jobs[0] ?? null
  const { isDealMarked, toggleDeal } = useProductDeals(activeJob?.id ?? null)
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadTotalCount = useCallback(() => {
    return api.fetchProductCount().then(setTotalCount).catch(() => {})
  }, [])

  useEffect(() => {
    api.fetchProductEvents().then(setEvents).catch(() => setEvents([]))
    loadTotalCount()
  }, [loadTotalCount])

  const runSearch = useCallback((keyword: string, event: string) => {
    if (keyword.length === 0 && !event) return
    setSearching(true)
    api.searchProducts(keyword, event)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [])

  useEffect(() => {
    const keyword = query.trim()
    if (keyword.length === 0 && !selectedEvent) return
    const timer = setTimeout(() => runSearch(keyword, selectedEvent), 250)
    return () => clearTimeout(timer)
  }, [query, selectedEvent, runSearch])

  function handleProductUpdated(updated: Product) {
    setResults(prev => prev.map(p => p.id === updated.id ? updated : p))
    setZoomProduct(updated)
    reloadFavorites()
  }

  function handleProductDeleted(productId: string) {
    setResults(prev => prev.filter(p => p.id !== productId))
    reloadFavorites()
  }

  function handleRefresh() {
    setRefreshing(true)
    const keyword = query.trim()
    Promise.all([
      loadTotalCount(),
      reloadFavorites(),
      keyword || selectedEvent ? api.searchProducts(keyword, selectedEvent).then(setResults).catch(() => {}) : Promise.resolve(),
    ]).finally(() => setRefreshing(false))
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

  // 有輸入關鍵字或選了檔期，都算是「正在搜尋」
  const hasActiveSearch = query.trim().length > 0 || !!selectedEvent

  // 沒有搜尋條件時顯示全部常用；有搜尋條件時只顯示「常用裡也符合這次搜尋」的項目，
  // 不相關的常用不該因為它被收藏就一直出現
  const matchedIds = new Set(results.map(r => r.id))
  const visibleFavorites = !hasActiveSearch
    ? favorites
    : favorites.filter(f => matchedIds.has(f.id))

  // 已經在「常用」顯示過的就不在搜尋結果裡重複顯示
  const nonFavoriteResults = results.filter(p => !isFavorite(p.id))

  // 放大檢視時左右滑動要能在「畫面上實際看得到的商品」之間切換，順序跟畫面一致
  const swipeList = [...visibleFavorites, ...nonFavoriteResults]

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
        {totalCount !== null && (
          <span className="text-xs text-muted-foreground">共 {totalCount} 筆</span>
        )}
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
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-full text-muted-foreground"
        >
          <RefreshCwIcon className={cn('size-4', refreshing && 'animate-spin')} />
        </Button>
      </div>

      <AddProductSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onImported={() => runSearch(query.trim(), selectedEvent)}
      />

      <ProductDetailDialog
        product={zoomProduct}
        list={swipeList}
        onNavigate={setZoomProduct}
        onOpenChange={o => { if (!o) setZoomProduct(null) }}
        onUpdated={handleProductUpdated}
        onDeleted={handleProductDeleted}
      />

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        <div className="flex gap-2">
          <InputGroup className="min-w-0 flex-1">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="輸入品號或商品名稱搜尋"
            />
          </InputGroup>

          {events.length > 0 && (
            <Select
              value={selectedEvent || ALL_EVENTS}
              onValueChange={v => setSelectedEvent(v === ALL_EVENTS ? '' : v)}
            >
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue placeholder="檔期" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_EVENTS}>檔期：全部</SelectItem>
                {events.map(ev => (
                  <SelectItem key={ev} value={ev}>{formatEventLabel(ev)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {visibleFavorites.length > 0 && (
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
                  dealButton={<DealButton show={!!activeJob && !isDealMarked(p.id)} onToggle={() => toggleDeal(p)} />}
                  onZoom={() => setZoomProduct(p)}
                />
              ))}
            </div>
          </div>
        )}

        {!hasActiveSearch ? (
          visibleFavorites.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">輸入關鍵字或選擇檔期開始搜尋</p>
          )
        ) : searching ? (
          <p className="py-8 text-center text-sm text-muted-foreground">搜尋中…</p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">查無符合的商品</p>
        ) : nonFavoriteResults.length > 0 && (
          <div className="flex flex-col gap-2">
            {visibleFavorites.length > 0 && <p className="text-xs font-medium text-muted-foreground">搜尋結果</p>}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {nonFavoriteResults.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  favorite={false}
                  onToggleFavorite={() => toggleFavorite(p)}
                  dealButton={<DealButton show={!!activeJob && !isDealMarked(p.id)} onToggle={() => toggleDeal(p)} />}
                  onZoom={() => setZoomProduct(p)}
                />
              ))}
            </div>
          </div>
        )}

        {results.length === 60 && (
          <p className="text-center text-xs text-muted-foreground">結果過多，僅顯示前 60 筆，請輸入更精確的關鍵字</p>
        )}
      </div>
    </div>
  )
}
