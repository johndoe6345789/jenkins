'use client'
import { useCallback, useEffect, useState } from 'react'
import { setToken, clearToken, TOKEN_KEY } from '../lib/authSlice'
import { useAppDispatch, useAppSelector } from '../lib/store'

export function useAuth() {
  const dispatch = useAppDispatch()
  const token    = useAppSelector(state => state.auth.token)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) dispatch(setToken(stored))
    setHydrated(true)
  }, [dispatch])

  const login = useCallback(
    async (password: string): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok) {
        localStorage.setItem(TOKEN_KEY, data.token)
        dispatch(setToken(data.token))
        return { ok: true }
      }
      return { ok: false, error: data.error }
    },
    [dispatch],
  )

  const logout = useCallback(async () => {
    if (token) {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'X-Vault-Token': token },
      }).catch(() => {})
    }
    localStorage.removeItem(TOKEN_KEY)
    dispatch(clearToken())
  }, [dispatch, token])

  return { token, isAuth: !!token, hydrated, login, logout }
}
