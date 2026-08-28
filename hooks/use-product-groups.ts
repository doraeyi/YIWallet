'use client'

import { useCallback, useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { ProductGroup } from '@/lib/types'

export function useProductGroups() {
  const [groups, setGroups] = useState<ProductGroup[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    api.fetchProductGroups().then(setGroups).catch(() => setGroups([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { groups, loading, reload }
}
