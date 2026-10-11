'use client'

import { useCallback, useSyncExternalStore } from 'react'
import * as api from '@/lib/api'
import { getCustomCategories, setCustomCategories, subscribeCustomCategories, type Category } from '@/lib/types'

// 自訂分類的清單＋新增／修改／刪除。資料本身登記在 lib/types.ts（getCategoryById 也查得到），
// 這個 hook 讓元件在分類有變動時重新 render。
export function useCustomCategories() {
  const categories = useSyncExternalStore(subscribeCustomCategories, getCustomCategories, () => [])

  const create = useCallback(async (data: api.CategoryInput): Promise<Category> => {
    const created = await api.createCategory(data)
    setCustomCategories([...getCustomCategories(), created])
    return created
  }, [])

  const update = useCallback(async (id: string, data: Partial<api.CategoryInput>) => {
    const updated = await api.updateCategory(id, data)
    setCustomCategories(getCustomCategories().map(c => (c.id === id ? updated : c)))
  }, [])

  // 刪除只是隱藏：舊交易照樣顯示得出這個分類
  const remove = useCallback(async (id: string) => {
    await api.deleteCategory(id)
    setCustomCategories(getCustomCategories().map(c => (c.id === id ? { ...c, hidden: true } : c)))
  }, [])

  return { categories, create, update, remove }
}
