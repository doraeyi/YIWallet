'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeftIcon, BookOpenIcon, SearchIcon, RefreshCwIcon } from 'lucide-react'
import { useMe } from '@/hooks/use-me'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import * as api from '@/lib/api'
import type { XuhanKeyword } from '@/lib/types'
import { cn } from '@/lib/utils'

export default function ProceduresPage() {
  const { me, loading: meLoading } = useMe()
  const [keywords, setKeywords] = useState<XuhanKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [scraping, setScraping] = useState(false)
  const [scrapeMessage, setScrapeMessage] = useState('')
  const [detail, setDetail] = useState<XuhanKeyword | null>(null)

  const load = useCallback((q: string) => {
    setLoading(true)
    api.fetchXuhanKeywords(q).then(setKeywords).catch(() => setKeywords([])).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => load(query.trim()), 250)
    return () => clearTimeout(timer)
  }, [query, load])

  async function handleScrape() {
    setScraping(true)
    setScrapeMessage('')
    try {
      const result = await api.triggerXuhanScrape()
      setScrapeMessage(`已更新 ${result.keywords} 筆商品、${result.items} 筆手順`)
      load(query.trim())
    } catch {
      setScrapeMessage('爬取失敗，稍後再試')
    } finally {
      setScraping(false)
    }
  }

  if (meLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">載入中…</div>
    )
  }

  if (!me?.canUseBarcode) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-3xl">🔒</p>
        <p className="text-sm text-muted-foreground">你沒有這個功能的使用權限</p>
        <Link href="/settings" className="mt-2 text-xs text-amber-500 hover:text-amber-600">回設定頁</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-4 pt-10 pb-4 lg:mx-auto lg:w-full lg:max-w-2xl lg:pt-8">
        <Link href="/dashboard" className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ChevronLeftIcon className="size-5" />
        </Link>
        <h1 className="flex flex-1 items-center gap-1.5 text-xl font-bold">
          <BookOpenIcon className="size-5 text-amber-500" />
          手順查詢
        </h1>
        {!loading && (
          <span className="text-xs text-muted-foreground">共 {keywords.length} 筆</span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleScrape}
          disabled={scraping}
          className="rounded-full text-muted-foreground"
        >
          <RefreshCwIcon className={cn('size-4', scraping && 'animate-spin')} />
        </Button>
      </div>

      <div className="flex flex-col gap-3 px-4 pb-6 lg:mx-auto lg:w-full lg:max-w-2xl lg:px-6">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="輸入商品名稱搜尋"
          />
        </InputGroup>

        {scrapeMessage && (
          <p className="text-xs text-muted-foreground">{scrapeMessage}</p>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">載入中…</p>
        ) : keywords.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {query.trim() ? '查無符合的商品' : '還沒有資料，點右上角重整抓一次'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {keywords.map(k => (
              <button
                key={k.id}
                onClick={() => setDetail(k)}
                className="flex flex-col items-start gap-0.5 rounded-2xl bg-white px-4 py-3 text-left shadow-sm hover:bg-muted/40 dark:bg-card"
              >
                <span className="text-sm font-medium">{k.title.trim()}</span>
                {k.items.length === 0 && (
                  <span className="text-xs text-muted-foreground">尚未有手順資料</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={o => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-sm max-h-[85dvh] overflow-y-auto">
          <DialogTitle>{detail?.title.trim()}</DialogTitle>
          <div className="flex flex-col gap-4">
            {detail?.items.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">尚未有手順資料</p>
            )}
            {detail?.items.map(item => (
              <div key={item.id} className="flex flex-col gap-3">
                {item.machineName && (
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">{item.machineName}</p>
                )}
                {item.steps.map((step, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-xl border p-3">
                    <p className="whitespace-pre-line text-sm">{step.text}</p>
                    {step.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={step.imageUrl} alt="" className="w-full rounded-lg" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
