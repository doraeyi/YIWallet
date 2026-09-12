'use client'

import { ChevronRightIcon } from 'lucide-react'

interface MonthNavProps {
  year: number
  month: number
  onPrev: () => void
  onNext: () => void
}

export function MonthNav({ year, month, onPrev, onNext }: MonthNavProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onPrev}
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-transform"
      >
        <ChevronRightIcon className="size-4 rotate-180" />
      </button>
      <span className="min-w-28 text-center text-base font-semibold">
        {year}年{String(month).padStart(2, '0')}月
      </span>
      <button
        onClick={onNext}
        className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-transform"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  )
}
