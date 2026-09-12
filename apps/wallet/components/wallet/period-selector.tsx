'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Period } from '@/lib/types'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week',  label: '週' },
  { value: 'month', label: '月' },
  { value: 'year',  label: '年' },
]

interface PeriodSelectorProps {
  value: Period
  onChange: (period: Period) => void
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={v => onChange(v as Period)}
    >
      <TabsList>
        {PERIODS.map(p => (
          <TabsTrigger key={p.value} value={p.value}>
            {p.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
