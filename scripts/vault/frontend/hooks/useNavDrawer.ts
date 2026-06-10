import { useMemo } from 'react'
import { setDrawerOpen } from '../lib/uiSlice'
import { useAppDispatch, useAppSelector } from '../lib/store'

export function useNavDrawer() {
  const dispatch = useAppDispatch()
  const open     = useAppSelector(state => state.ui.drawerOpen)
  const sections = useAppSelector(state => state.creds.sections)

  const close = () => dispatch(setDrawerOpen(false))

  const scrollTo = (id: string) => {
    close()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const nav = useMemo(() => {
    return Object.entries(sections).map(([sectionId, creds]) => {
      const groupOrder: string[] = []
      const groupMap = new Map<string, Set<string>>()
      for (const c of creds) {
        const grp = c.group ?? ''
        if (!groupMap.has(grp)) {
          groupOrder.push(grp)
          groupMap.set(grp, new Set())
        }
        groupMap.get(grp)!.add(c.service_name)
      }
      return {
        id: sectionId,
        groups: groupOrder.map(grp => ({
          label: grp,
          services: Array.from(groupMap.get(grp)!),
        })),
        hasGroups: groupOrder.some(g => g !== ''),
      }
    })
  }, [sections])

  return { open, close, scrollTo, nav }
}
