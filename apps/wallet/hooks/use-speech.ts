'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// 瀏覽器內建的語音辨識（Chrome、Android、iOS Safari 都有，前綴不一樣）。
// 不支援的瀏覽器 supported 是 false，畫面上就不顯示麥克風按鈕。
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

type RecognitionCtor = new () => Recognition

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeech() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recRef = useRef<Recognition | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setSupported(!!getCtor()))
    return () => cancelAnimationFrame(id)
  }, [])

  // 講完（或按停止）後呼叫 onFinal(完整的一句話)；講到一半 transcript 會即時更新
  const start = useCallback((onFinal: (text: string) => void, onError?: (error: string) => void) => {
    const Ctor = getCtor()
    if (!Ctor) return
    recRef.current?.stop()
    const rec = new Ctor()
    rec.lang = 'zh-TW'
    rec.interimResults = true
    rec.continuous = false
    let finalText = ''
    rec.onresult = e => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript
      setTranscript(text)
      if (e.results[e.results.length - 1].isFinal) finalText = text
    }
    rec.onerror = e => onError?.(e.error)
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      if (finalText.trim()) onFinal(finalText.trim())
    }
    recRef.current = rec
    setTranscript('')
    setListening(true)
    rec.start()
  }, [])

  const stop = useCallback(() => recRef.current?.stop(), [])

  useEffect(() => () => recRef.current?.stop(), [])

  return { supported, listening, transcript, start, stop }
}
