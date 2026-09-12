'use client'

import { useCallback, useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { Product } from '@/lib/types'

// 常用清單存在後端、綁 user_id——同一台裝置給不同人登入用，也不會把大家
// 的常用混在一起（原本存瀏覽器 localStorage 就會有這個問題）。
export function useProductFavorites() {
  const [favorites, setFavorites] = useState<Product[]>([])

  const reload = useCallback(() => {
    return api.fetchFavoriteProducts().then(setFavorites).catch(() => setFavorites([]))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const isFavorite = useCallback((id: string) => favorites.some(f => f.id === id), [favorites])

  const toggleFavorite = useCallback((product: Product) => {
    setFavorites(prev => {
      const already = prev.some(f => f.id === product.id)
      if (already) {
        api.removeFavoriteProduct(product.id).catch(() => {})
        return prev.filter(f => f.id !== product.id)
      }
      api.addFavoriteProduct(product.id).catch(() => {})
      return [...prev, product]
    })
  }, [])

  return { favorites, isFavorite, toggleFavorite, reload }
}
