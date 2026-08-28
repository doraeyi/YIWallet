'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, TagIcon, UsersIcon } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useProductFavorites } from '@/hooks/use-product-favorites'
import { useProductGroups } from '@/hooks/use-product-groups'
import { useProductDeals } from '@/hooks/use-product-deals'
import { ProductCard } from '@/components/wallet/product-card'
import { ProductDetailDialog } from '@/components/wallet/product-detail-dialog'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function BarcodeDealsPage() {
  const { me, loading: meLoading } = useMe()
  const { isFavorite, toggleFavorite, reload: reloadFavorites } = useProductFavorites()
  const { groups, loading: groupsLoading } = useProductGroups()
  const acceptedGroups = groups.filter(g => g.myStatus === 'accepted')

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const activeGroupId = selectedGroupId ?? acceptedGroups[0]?.id ?? null

  const { deals, toggleDeal, reload: reloadDeals } = useProductDeals(activeGroupId)
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null)

  function handleProductUpdated() {
    reloadDeals()
    reloadFavorites()
  }

  function handleProductDeleted() {
    reloadDeals()
    reloadFavorites()
  }

  if (meLoading || groupsLoading) {
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
        <Link href="/barcode" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="flex flex-1 items-center gap-1.5 text-xl font-bold">
          <TagIcon className="size-5 text-sky-500" />
          砍貨專區
        </h1>
        <Link
          href="/barcode/groups"
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <UsersIcon className="size-5" />
        </Link>
      </div>

      <ProductDetailDialog
        product={zoomProduct}
        onOpenChange={o => { if (!o) setZoomProduct(null) }}
        onUpdated={handleProductUpdated}
        onDeleted={handleProductDeleted}
      />

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        {acceptedGroups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">你還沒有加入任何砍貨群組</p>
            <Link href="/barcode/groups" className="text-xs text-amber-500 underline hover:text-amber-600">
              去建立或加入群組
            </Link>
          </div>
        ) : (
          <>
            <select
              value={activeGroupId ?? ''}
              onChange={e => setSelectedGroupId(e.target.value)}
              className="rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-400 dark:bg-card"
            >
              {acceptedGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            {deals.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                這個群組還沒有人標記商品，去條碼查詢頁點商品卡片上的標籤圖示加入吧
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {deals.map(deal => (
                  <ProductCard
                    key={deal.dealId}
                    product={deal}
                    favorite={isFavorite(deal.id)}
                    onToggleFavorite={() => toggleFavorite(deal)}
                    dealButton={
                      <button onClick={() => toggleDeal(deal)} className="text-sky-500 hover:text-sky-600">
                        <TagIcon className={cn('size-4', deal.mine && 'fill-sky-400')} />
                      </button>
                    }
                    onZoom={() => setZoomProduct(deal)}
                    badge={
                      <p className="text-[10px] text-sky-600 dark:text-sky-400">
                        {deal.mine ? '我加入的' : `${deal.addedByName} 加入的`}
                      </p>
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
