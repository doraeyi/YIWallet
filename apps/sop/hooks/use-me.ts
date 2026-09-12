'use client'

import { useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { MeProfile } from '@/lib/types'

export function useMe() {
  const [me, setMe] = useState<MeProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchMe()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setLoading(false))
  }, [])

  return { me, loading }
}
