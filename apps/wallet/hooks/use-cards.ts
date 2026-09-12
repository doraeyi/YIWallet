'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Card } from '@/lib/types'
import * as api from '@/lib/api'

const DEFAULT_CARD_KEY = 'yiwallet_default_card_id'

export function useCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [isLoaded, setIsLoaded] = useState(false)
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null)

  useEffect(() => {
    api.fetchCards()
      .then(setCards)
      .catch(() => setCards([]))
      .finally(() => setIsLoaded(true))
    setDefaultCardId(localStorage.getItem(DEFAULT_CARD_KEY))
  }, [])

  const addCard = useCallback(async (data: Omit<Card, 'id'>): Promise<Card> => {
    const card = await api.createCard(data)
    setCards(prev => [...prev, card])
    return card
  }, [])

  const removeCard = useCallback(async (id: string) => {
    await api.deleteCard(id)
    setCards(prev => prev.filter(c => c.id !== id))
    // 如果刪除的是常用卡，清除設定
    setDefaultCardId(prev => {
      if (prev === id) {
        localStorage.removeItem(DEFAULT_CARD_KEY)
        return null
      }
      return prev
    })
  }, [])

  const setDefaultCard = useCallback((id: string | null) => {
    setDefaultCardId(id)
    if (id) localStorage.setItem(DEFAULT_CARD_KEY, id)
    else localStorage.removeItem(DEFAULT_CARD_KEY)
  }, [])

  const updateCard = useCallback(async (id: string, data: Omit<Card, 'id'>): Promise<Card> => {
    const updated = await api.updateCard(id, data)
    setCards(prev => prev.map(c => c.id === id ? updated : c))
    return updated
  }, [])

  const defaultCard = cards.find(c => c.id === defaultCardId) ?? null

  return { cards, isLoaded, defaultCard, defaultCardId, addCard, removeCard, setDefaultCard, updateCard }
}
