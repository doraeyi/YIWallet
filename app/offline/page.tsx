'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-6xl">📵</div>
      <h1 className="text-2xl font-semibold">你目前離線</h1>
      <p className="text-muted-foreground">請確認網路連線後再試</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
      >
        重新整理
      </button>
    </div>
  )
}
