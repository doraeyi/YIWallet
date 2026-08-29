'use client'

import { useCallback, useEffect, useState } from 'react'
import * as api from '@/lib/api'
import type { Job } from '@/lib/types'

// 砍貨專區共用範圍比照班表共用：自己的工作 + 別人分享給我的工作，混在
// 一起當作「我有權限的工作」清單。有多份工作時（自己的 + 被分享的都有）
// 讓使用者自己選要看哪一份，預設拿第一筆（自己的排前面）。
export function useAccessibleJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  const reload = useCallback(() => {
    return Promise.all([api.fetchJobs(), api.fetchSharedJobs()])
      .then(([mine, shared]) => setJobs([...mine, ...shared]))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const activeJob = jobs.find(j => j.id === activeJobId) ?? jobs[0] ?? null

  return { jobs, loading, reload, activeJob, activeJobId, setActiveJobId }
}
