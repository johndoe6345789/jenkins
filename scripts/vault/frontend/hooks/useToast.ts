'use client'
import { useState, useCallback } from 'react'
import type { ToastItem, ToastType } from '../lib/types'

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((msg: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(
      () => setToasts(t => t.filter(x => x.id !== id)),
      3000,
    )
  }, [])

  return { toasts, push }
}
