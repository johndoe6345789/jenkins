import { useState, type MouseEvent } from 'react'

export function useUserMenu() {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const open  = (e: MouseEvent<HTMLButtonElement>) =>
    setAnchor(e.currentTarget)
  const close = () => setAnchor(null)
  return { anchor, open, close }
}
