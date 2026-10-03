import { Skeleton } from '@/components/ui/skeleton'

// 頁面資料還沒回來時的骨架畫面，取代整頁只有一行「載入中…」，
// 版面先出來，使用者比較不會覺得卡住
export function PageSkeleton({ variant = 'list' }: { variant?: 'list' | 'calendar' }) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6 lg:px-6" aria-busy="true" aria-label="載入中">
      <Skeleton className="h-7 w-40" />
      {variant === 'calendar' ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : (
        <>
          <div className="flex justify-between">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
          <Skeleton className="h-40 w-full rounded-2xl" />
        </>
      )}
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    </div>
  )
}
