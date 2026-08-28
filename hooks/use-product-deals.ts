'use client'

import { useCallback, useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { Product, ProductDeal } from '@/lib/types'

// 砍貨專區：某份工作底下大家標的商品混在一起看（工作擁有者 + 被分享班表
// 的人）。isDealMarked／toggleDeal 只看「自己」在這份工作裡有沒有標過這
// 個商品，跟其他人有沒有標無關。
export function useProductDeals(jobId: string | null) {
  const [deals, setDeals] = useState<ProductDeal[]>([])

  const reload = useCallback(() => {
    if (!jobId) return
    api.fetchDealProducts(jobId).then(setDeals).catch(() => setDeals([]))
  }, [jobId])

  useEffect(() => {
    reload()
  }, [reload])

  const isDealMarked = useCallback((productId: string) => deals.some(d => d.id === productId && d.mine), [deals])

  const toggleDeal = useCallback((product: Product) => {
    if (!jobId) return
    const mine = deals.find(d => d.id === product.id && d.mine)
    if (mine) {
      // 自己的標記可以直接樂觀移除；失敗的話重新載入校正回來
      setDeals(prev => prev.filter(d => d.dealId !== mine.dealId))
      api.removeDealProduct(product.id, jobId).catch(reload)
    } else {
      // 新增這筆不知道伺服器會給的 deal_id，直接重新載入拿正確資料
      api.addDealProduct(product.id, jobId).then(reload).catch(() => {})
    }
  }, [deals, jobId, reload])

  return { deals, isDealMarked, toggleDeal, reload }
}
