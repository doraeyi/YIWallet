'use client'

import { useCallback, useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { Product, ProductDeal } from '@/lib/types'

// 砍貨專區：某個群組裡大家標的商品混在一起看。isDealMarked／toggleDeal
// 只看「自己」在這個群組裡有沒有標過這個商品，跟其他成員有沒有標無關。
export function useProductDeals(groupId: string | null) {
  const [deals, setDeals] = useState<ProductDeal[]>([])

  const reload = useCallback(() => {
    if (!groupId) return
    api.fetchDealProducts(groupId).then(setDeals).catch(() => setDeals([]))
  }, [groupId])

  useEffect(() => {
    reload()
  }, [reload])

  const isDealMarked = useCallback((productId: string) => deals.some(d => d.id === productId && d.mine), [deals])

  const toggleDeal = useCallback((product: Product) => {
    if (!groupId) return
    const mine = deals.find(d => d.id === product.id && d.mine)
    if (mine) {
      // 自己的標記可以直接樂觀移除；失敗的話重新載入校正回來
      setDeals(prev => prev.filter(d => d.dealId !== mine.dealId))
      api.removeDealProduct(product.id, groupId).catch(reload)
    } else {
      // 新增這筆不知道伺服器會給的 deal_id，直接重新載入拿正確資料
      api.addDealProduct(product.id, groupId).then(reload).catch(() => {})
    }
  }, [deals, groupId, reload])

  return { deals, isDealMarked, toggleDeal, reload }
}
