'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAppSelector } from '../lib/store'

export interface HistoryItem {
  name: string
  badge: string
  updated_at: string
}

export function useHistory() {
  const token = useAppSelector(state => state.auth.token)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/history', { headers: { 'X-Vault-Token': token } })
      if (res.ok) setHistory(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { reload() }, [reload])

  return { history, loading, reload }
}
