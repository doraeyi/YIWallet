'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, TagIcon, RefreshCwIcon, UsersIcon } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { useProductFavorites } from '@/hooks/use-product-favorites'
import { useAccessibleJobs } from '@/hooks/use-accessible-jobs'
import { useProductDeals } from '@/hooks/use-product-deals'
import { ProductCard } from '@/components/wallet/product-card'
import { ProductDetailDialog } from '@/components/wallet/product-detail-dialog'
import { JobCoworkersDialog } from '@/components/wallet/job-coworkers-dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as api from '@/lib/api'
import type { Product, JobShare, Friendship } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function BarcodeDealsPage() {
  const { me, loading: meLoading } = useMe()
  const { isFavorite, toggleFavorite, reload: reloadFavorites } = useProductFavorites()
  // 有多份工作（自己的 + 別人分享的）時讓使用者自己選要看哪份的砍貨專區
  const { jobs, loading: jobsLoading, activeJob, activeJobId, setActiveJobId } = useAccessibleJobs()
  // 自己擁有的工作一定能管理同事名單；被分享的工作要看有沒有被授權 can_manage
  const canManageCoworkers = !!activeJob && (activeJob.userId === me?.id || activeJob.canManage)

  const { deals, toggleDeal, reload: reloadDeals } = useProductDeals(activeJob?.id ?? null)
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [jobShares, setJobShares] = useState<JobShare[]>([])
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [coworkersOpen, setCoworkersOpen] = useState(false)

  const loadJobShares = useCallback(() => {
    if (!activeJob) return
    api.fetchJobShares(activeJob.id).then(setJobShares).catch(() => setJobShares([]))
  }, [activeJob])

  useEffect(() => {
    loadJobShares()
  }, [loadJobShares])

  useEffect(() => {
    api.fetchFriendships().then(list => setFriendships(list.filter(f => f.status === 'accepted'))).catch(() => {})
  }, [])

  function handleRefresh() {
    setRefreshing(true)
    Promise.all([reloadDeals(), reloadFavorites()]).finally(() => setRefreshing(false))
  }

  function handleProductUpdated() {
    reloadDeals()
    reloadFavorites()
  }

  function handleProductDeleted() {
    reloadDeals()
    reloadFavorites()
  }

  if (meLoading || jobsLoading) {
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
        {!jobsLoading && activeJob && (
          <span className="text-xs text-muted-foreground">共 {deals.length} 筆</span>
        )}
        {canManageCoworkers && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCoworkersOpen(true)}
            className="rounded-full text-muted-foreground"
          >
            <UsersIcon className="size-4" />
          </Button>
        )}
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

      <ProductDetailDialog
        product={zoomProduct}
        list={deals}
        onNavigate={setZoomProduct}
        onOpenChange={o => { if (!o) setZoomProduct(null) }}
        onUpdated={handleProductUpdated}
        onDeleted={handleProductDeleted}
      />

      <JobCoworkersDialog
        job={coworkersOpen ? activeJob : null}
        shares={jobShares}
        friends={friendships}
        onOpenChange={setCoworkersOpen}
        onChanged={loadJobShares}
        canGrantManage={!!activeJob && activeJob.userId === me?.id}
      />

      <div className="flex flex-col gap-4 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        <p className="text-xs text-muted-foreground">
          跟這份工作的同事共用（工作擁有者 + 有分享班表的人），只要有條碼查詢權限就看得到彼此標的商品。
        </p>

        {jobs.length > 1 && (
          <Select value={activeJobId ?? activeJob?.id} onValueChange={setActiveJobId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="選擇工作" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map(job => <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {!activeJob ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">你還沒有工作可以用來共用砍貨專區</p>
            <Link href="/settings" className="text-xs text-amber-500 underline hover:text-amber-600">
              去設定頁新增工作，或請同事分享班表給你
            </Link>
          </div>
        ) : deals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            這份工作還沒有人標記商品，去條碼查詢頁點商品卡片上的標籤圖示加入吧
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
      </div>
    </div>
  )
}
