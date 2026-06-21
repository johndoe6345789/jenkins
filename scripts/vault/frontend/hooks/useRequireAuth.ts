'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from './useAuth'

export function useRequireAuth() {
  const { isAuth, hydrated } = useAuth()
  const router               = useRouter()
  const pathname             = usePathname()

  useEffect(() => {
    if (hydrated && !isAuth) {
      router.replace(`/login?from=${encodeURIComponent(pathname)}`)
    }
  }, [hydrated, isAuth, router, pathname])

  return isAuth
}
