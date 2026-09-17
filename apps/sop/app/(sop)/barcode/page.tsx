'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarcodeIcon, SearchIcon, PlusIcon, StarIcon, TagIcon, RefreshCwIcon, PackageSearchIcon, ScanLineIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMe } from '@/hooks/use-me'
import { useProductFavorites } from '@/hooks/use-product-favorites'
import { useAccessibleJobs } from '@/hooks/use-accessible-jobs'
import { useProductDeals } from '@/hooks/use-product-deals'
import { AddProductSheet } from '@/components/sop/add-product-sheet'
import { ProductCard } from '@/components/sop/product-card'
import { ProductDetailDialog } from '@/components/sop/product-detail-dialog'
import { BarcodeScanDialog } from '@/components/sop/barcode-scan-dialog'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'


// 目前先只開放簡易模式（純文字清單、純前端篩選）。「條碼模式」（卡片+條碼圖+
// 收藏/砍貨）的程式碼都還在，之後要重新開放的話，把 mode 改回可切換、UI 加
// 個切換器就好，不用重寫。
type ViewMode = 'detailed' | 'simple'

// 簡易模式一次把全部商品載進來後純前端篩選，結果一樣先限制筆數避免畫面卡頓
const SIMPLE_MODE_LIMIT = 100

// 檔期標籤原始格式是「YYYYMMDD_說明」，畫面上顯示成「MM/DD 說明」比較好讀
function formatEventLabel(label: string): string {
  const match = label.match(/^(\d{4})(\d{2})(\d{2})_(.+)$/)
  if (!match) return label
  const [, , mm, dd, rest] = match
  return `${mm}/${dd} ${rest}`
}

// 純數字輸入時，只當品號查，不要因為條碼包含這串數字就一起撈出來
function filterByKeyword(data: Product[], keyword: string): Product[] {
  if (!/^\d+$/.test(keyword)) return data
  return data.filter(p => (p.itemNo && p.itemNo.includes(keyword)) || p.name.includes(keyword))
}

// event 欄位可能用「/」分隔多個標籤、結尾可能帶 _NNN 流水號，比對前先拆乾淨
// （跟後端 routers/products.py 的 _clean_event_labels 邏輯保持一致）
function cleanEventLabels(raw: string | null): string[] {
  if (!raw) return []
  return raw.split('/').filter(Boolean).map(part => part.replace(/_\d{3}$/, ''))
}

// 掃描查詢：拿掃到的條碼直接比對商品的 code 欄位。只有原本手動新增/CSV 匯入
// 那批（有真正條碼的）才查得到，7-11howhowfun 匯入的那批沒有存條碼、掃不到
// 是預期內的正常狀況。UPC-A(12碼) 有時候會補一個前導 0 存成 EAN13(13碼)，
// 兩種都試著比對一下。
function findProductByCode(products: Product[], scanned: string): Product | undefined {
  return products.find(p => p.code && (p.code === scanned || p.code === `0${scanned}` || `0${p.code}` === scanned))
}

// 把符合關鍵字的部分標亮，比對邏輯跟 7-11howhowfun 那個查詢頁一樣快、純前端做
function highlightMatch(text: string, keyword: string) {
  if (!keyword) return text
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-amber-200 px-0.5 text-inherit dark:bg-amber-400/40">{text.slice(idx, idx + keyword.length)}</mark>
      {text.slice(idx + keyword.length)}
    </>
  )
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
  const { jobs, activeJob, activeJobId, setActiveJobId } = useAccessibleJobs()
  const { isDealMarked, toggleDeal } = useProductDeals(activeJob?.id ?? null)
  const [mode] = useState<ViewMode>('simple')
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState<string[]>([])
  const [selectedEvent, setSelectedEvent] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState('')
  const [allProducts, setAllProducts] = useState<Product[] | null>(null)
  const [allProductsLoading, setAllProductsLoading] = useState(false)
  const [scanLookupOpen, setScanLookupOpen] = useState(false)
  const [scanNotFoundCode, setScanNotFoundCode] = useState('')

  const loadAllProducts = useCallback(() => {
    setAllProductsLoading(true)
    return api.fetchAllProducts()
      .then(setAllProducts)
      .catch(() => setAllProducts([]))
      .finally(() => setAllProductsLoading(false))
  }, [])

  // 簡易模式第一次切進來才載入全部商品，載過就快取著、不用每次切換都重抓
  useEffect(() => {
    if (mode === 'simple' && allProducts === null && !allProductsLoading) {
      loadAllProducts()
    }
  }, [mode, allProducts, allProductsLoading, loadAllProducts])

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
      .then(data => setResults(filterByKeyword(data, keyword)))
      .catch(() => setResults([]))
      .finally(() => setSearching(false))
  }, [])

  // 簡易模式不用打 API，純前端在已經載好的全部商品裡篩選，體感速度快很多
  const simpleResults = useMemo(() => {
    if (mode !== 'simple' || !allProducts) return []
    const keyword = query.trim().toLowerCase()
    if (!keyword && !selectedEvent) return []
    return allProducts.filter(p => {
      const matchesKeyword = !keyword || p.name.toLowerCase().includes(keyword) || (p.itemNo?.toLowerCase().includes(keyword) ?? false)
      const matchesEvent = !selectedEvent || cleanEventLabels(p.event).includes(selectedEvent)
      return matchesKeyword && matchesEvent
    })
  }, [mode, allProducts, query, selectedEvent])

  useEffect(() => {
    if (mode !== 'detailed') return
    const keyword = query.trim()
    if (keyword.length === 0 && !selectedEvent) return
    const timer = setTimeout(() => runSearch(keyword, selectedEvent), 250)
    return () => clearTimeout(timer)
  }, [mode, query, selectedEvent, runSearch])

  function handleProductUpdated(updated: Product) {
    setResults(prev => prev.map(p => p.id === updated.id ? updated : p))
    setAllProducts(prev => prev && prev.map(p => p.id === updated.id ? updated : p))
    setZoomProduct(updated)
    reloadFavorites()
  }

  function handleProductDeleted(productId: string) {
    setResults(prev => prev.filter(p => p.id !== productId))
    setAllProducts(prev => prev && prev.filter(p => p.id !== productId))
    reloadFavorites()
  }

  // 掃描查詢：掃到的條碼直接比對現有商品的 code 欄位、找到就打開詳細頁。
  // 只有原本有存真正條碼的商品查得到，這是資料本身的限制，不是掃描沒掃準。
  function handleScanLookup(code: string) {
    setScanNotFoundCode('')
    const matched = allProducts && findProductByCode(allProducts, code)
    if (matched) {
      setZoomProduct(matched)
    } else {
      setScanNotFoundCode(code)
    }
  }

  // 重整 = 重新從 7-11howhowfun 抓一次最新資料，再把畫面上的商品目錄/筆數刷新——
  // 兩件事合成一個按鈕，不用另外多放一個爬蟲圖示。
  async function handleRefresh() {
    setRefreshing(true)
    setRefreshMessage('')
    try {
      const result = await api.triggerSevenElevenScrape()
      setRefreshMessage(`新增 ${result.inserted} 筆、補了 ${result.updated} 筆分類`)
    } catch {
      setRefreshMessage('抓取失敗，稍後再試')
    }

    const keyword = query.trim()
    await Promise.all([
      loadTotalCount(),
      reloadFavorites(),
      mode === 'simple'
        ? loadAllProducts()
        : (keyword || selectedEvent ? api.searchProducts(keyword, selectedEvent).then(data => setResults(filterByKeyword(data, keyword))).catch(() => {}) : Promise.resolve()),
    ])
    setRefreshing(false)
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
        <a href={`${process.env.NEXT_PUBLIC_WALLET_APP_URL}/settings`} className="mt-2 text-xs text-amber-500 hover:text-amber-600">回易記帳設定頁</a>
      </div>
    )
  }

  // 沒有搜尋條件時顯示全部常用；有搜尋條件時只顯示「常用裡也符合這次搜尋」的項目，
  // 不相關的常用不該因為它被收藏就一直出現
  const hasActiveSearch = query.trim().length > 0 || !!selectedEvent
  const matchedIds = new Set(results.map(r => r.id))
  const visibleFavorites = !hasActiveSearch
    ? favorites
    : favorites.filter(f => matchedIds.has(f.id))

  // 已經在「常用」顯示過的就不在搜尋結果裡重複顯示
  const nonFavoriteResults = results.filter(p => !isFavorite(p.id))

  // 放大檢視時左右滑動要能在「畫面上實際看得到的商品」之間切換，順序跟畫面一致
  const swipeList = mode === 'simple' ? simpleResults : [...visibleFavorites, ...nonFavoriteResults]

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-4 pt-6 pb-4 lg:mx-auto lg:w-full lg:max-w-2xl">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-amber-400 to-amber-500 text-white shadow-sm shadow-amber-400/30">
            <BarcodeIcon className="size-5" />
          </span>
          <div className="flex flex-1 flex-col leading-tight">
            <h1 className="text-lg font-bold">條碼查詢</h1>
            {totalCount !== null && (
              <span className="text-xs text-muted-foreground">共 {totalCount.toLocaleString()} 筆商品</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/barcode/deals"
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <TagIcon className="size-4.5" />
            </Link>
            <button
              onClick={() => setAddOpen(true)}
              className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PlusIcon className="size-4.5" />
            </button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={refreshing}
              title="重新從 7-11howhowfun 抓一次商品清單"
              className="size-9 rounded-full text-muted-foreground hover:text-foreground"
            >
              <RefreshCwIcon className={cn('size-4.5', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {refreshMessage && (
          <p className="px-4 pb-3 text-center text-xs text-muted-foreground lg:mx-auto lg:w-full lg:max-w-2xl">{refreshMessage}</p>
        )}

        <div className="flex flex-col gap-2.5 px-4 pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
          {jobs.length > 1 && (
            <Select value={activeJobId ?? activeJob?.id} onValueChange={setActiveJobId}>
              <SelectTrigger className="w-full rounded-2xl">
                <SelectValue placeholder="標記到哪份工作的砍貨專區" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-2">
            <InputGroup className="min-w-0 flex-1 rounded-2xl border-transparent bg-muted/60 shadow-none focus-within:border-ring focus-within:bg-background focus-within:shadow-sm">
              <InputGroupAddon>
                <SearchIcon className="text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="輸入品號或商品名稱搜尋"
              />
            </InputGroup>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setScanLookupOpen(true)}
              title="掃描條碼查詢商品"
              className="shrink-0 rounded-2xl border-transparent bg-muted/60"
            >
              <ScanLineIcon className="size-4.5" />
            </Button>

            {events.length > 0 && (
              <Select
                value={selectedEvent || undefined}
                onValueChange={v => setSelectedEvent(v)}
              >
                <SelectTrigger className="w-28 shrink-0 rounded-2xl border-transparent bg-muted/60">
                  <SelectValue placeholder="檔期" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(ev => (
                    <SelectItem key={ev} value={ev}>{formatEventLabel(ev)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <AddProductSheet
        open={addOpen}
        onOpenChange={setAddOpen}
        onImported={() => mode === 'simple' ? loadAllProducts() : runSearch(query.trim(), selectedEvent)}
      />

      <ProductDetailDialog
        product={zoomProduct}
        list={swipeList}
        onNavigate={setZoomProduct}
        onOpenChange={o => { if (!o) setZoomProduct(null) }}
        onUpdated={handleProductUpdated}
        onDeleted={handleProductDeleted}
      />

      <BarcodeScanDialog
        open={scanLookupOpen}
        onOpenChange={setScanLookupOpen}
        onScanned={handleScanLookup}
      />

      <div className="flex flex-col gap-4 px-4 pt-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        {scanNotFoundCode && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs text-rose-600 dark:bg-rose-900/20">
            查無條碼「{scanNotFoundCode}」對應的商品——可能是這件商品沒有存真正的條碼資料
          </p>
        )}
        {mode === 'simple' ? (
          allProductsLoading && !allProducts ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <PackageSearchIcon className="size-10 animate-pulse text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">載入商品目錄中…</p>
            </div>
          ) : !hasActiveSearch ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <PackageSearchIcon className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">輸入關鍵字或選擇檔期開始搜尋</p>
              {allProducts && <p className="text-xs text-muted-foreground/70">共 {allProducts.length.toLocaleString()} 筆商品可查</p>}
            </div>
          ) : simpleResults.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <PackageSearchIcon className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">查無符合的商品</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-muted-foreground">找到 {simpleResults.length.toLocaleString()} 筆</p>
              <div className="flex flex-col divide-y overflow-hidden rounded-2xl border bg-white shadow-sm dark:divide-border dark:bg-card">
                {simpleResults.slice(0, SIMPLE_MODE_LIMIT).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setZoomProduct(p)}
                    className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-50/60 active:bg-amber-50 dark:hover:bg-amber-400/5 dark:active:bg-amber-400/10"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {p.itemNo && (
                          <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {highlightMatch(p.itemNo, query.trim())}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-medium">{highlightMatch(p.name, query.trim())}</p>
                    </div>
                    {p.event && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                        {p.event}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {simpleResults.length > SIMPLE_MODE_LIMIT && (
                <p className="text-center text-xs text-muted-foreground">結果過多，僅顯示前 {SIMPLE_MODE_LIMIT} 筆，請輸入更精確的關鍵字</p>
              )}
            </>
          )
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  )
}
