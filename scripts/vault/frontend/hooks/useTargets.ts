'use client'
import { useCallback, useEffect } from 'react'
import { fetchTargets } from '../lib/credSlice'
import { useAppDispatch, useAppSelector } from '../lib/store'

export function useTargets() {
  const dispatch = useAppDispatch()
  const { sections, loading, error } = useAppSelector(state => state.creds)
  const token = useAppSelector(state => state.auth.token)

  const reload = useCallback(() => {
    if (token) dispatch(fetchTargets(token))
  }, [dispatch, token])

  useEffect(() => { reload() }, [reload])

  return { sections, loading, error, reload }
}
