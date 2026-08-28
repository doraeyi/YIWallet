interface AvatarPerson {
  id: string
  displayName: string
}

interface AvatarStackProps {
  people: AvatarPerson[]
  max?: number
  onClick?: () => void
}

// 同事頭像堆疊：疊在一起的圓圈圈，超過 max 個就把剩下的收進一個「+N」圓圈。
// 用實心 amber 底、白字，深色模式下也一樣清楚（不用淡色調色盤，避免看不清楚）。
export function AvatarStack({ people, max = 3, onClick }: AvatarStackProps) {
  if (people.length === 0) return null

  const shown = people.slice(0, max)
  const overflow = people.length - shown.length

  return (
    <button onClick={onClick} className="flex items-center -space-x-2">
      {shown.map(p => (
        <div
          key={p.id}
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-white ring-2 ring-white dark:ring-card"
          title={p.displayName}
        >
          {p.displayName.charAt(0).toUpperCase() || '?'}
        </div>
      ))}
      {overflow > 0 && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-white dark:ring-card">
          +{overflow}
        </div>
      )}
    </button>
  )
}
