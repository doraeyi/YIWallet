'use client'

import { useEffect } from 'react'
import type { Card } from '@/lib/types'
import { CardVisual } from './card-visual'

// 新增卡片成功後跳出的慶祝動畫：卡片從中間旋轉一圈飛出來，放著不用點也會
// 自動消失，點畫面任何地方也能提早關掉。
export function CardCreatedCelebration({ card, onDone }: { card: Card; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1800)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-sm"
    >
      <div className="w-64 animate-card-spin-in [perspective:1200px]">
        <CardVisual card={card} flipped={false} balanceLabel="" balanceValue={0} />
      </div>
      <p className="text-sm font-medium text-white/90">「{card.name}」新增成功！</p>
    </div>
  )
}
