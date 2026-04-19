import { getPending, pendingEmitter } from '@/lib/line-pending'

export const dynamic = 'force-dynamic'

export async function GET() {
  const encoder = new TextEncoder()
  let listener: ((count: number) => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      // 立刻送出目前 count
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ count: getPending() })}\n\n`))

      listener = (count: number) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ count })}\n\n`))
        } catch {
          if (listener) pendingEmitter.off('update', listener)
        }
      }
      pendingEmitter.on('update', listener)
    },
    cancel() {
      if (listener) pendingEmitter.off('update', listener)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
