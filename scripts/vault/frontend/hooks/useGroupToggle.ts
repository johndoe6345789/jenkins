import { useState } from 'react'

export function useGroupToggle(initiallyOpen = true) {
  const [open, setOpen] = useState(initiallyOpen)
  const toggle = () => setOpen(o => !o)
  return { open, toggle }
}
