'use client'

import { useCallback, useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { Job } from '@/lib/types'

// 砍貨專區共用範圍比照班表共用：自己的工作 + 別人分享給我的工作，混在
// 一起當作「我有權限的工作」清單。目前先假設一人只會用到一份工作，直接
// 拿第一筆當砍貨目標，不用另外選。
export function useAccessibleJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(() => {
    Promise.all([api.fetchJobs(), api.fetchSharedJobs()])
      .then(([mine, shared]) => setJobs([...mine, ...shared]))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { jobs, loading, reload }
}
