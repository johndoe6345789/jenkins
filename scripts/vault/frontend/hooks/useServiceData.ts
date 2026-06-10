import { useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from './useAuth'
import { useTargets } from './useTargets'
import { useHistory } from './useHistory'
import { useToast } from './useToast'

export function useServiceData() {
  const { logout, token }                  = useAuth()
  const { sections, loading, reload }       = useTargets()
  const { history, reload: reloadHistory }  = useHistory()
  const { toasts, push }                    = useToast()
  const router                              = useRouter()
  const params                              = useParams()
  const serviceName = decodeURIComponent(params.service as string)

  const { section, users } = useMemo(() => {
    for (const [sec, items] of Object.entries(sections)) {
      const hit = items.filter(c => c.service_name === serviceName)
      if (hit.length) return { section: sec, users: hit }
    }
    return { section: '', users: [] }
  }, [sections, serviceName])

  const historyMap = useMemo(
    () => new Map(history.map(h => [h.name, h.updated_at])),
    [history],
  )

  const handleRotated = async () => {
    await reload()
    await reloadHistory()
  }

  const handleDelete = async (name: string) => {
    if (!window.confirm('Delete this credential?')) return
    const res = await fetch(`/api/custom/${name}`, {
      method: 'DELETE',
      headers: { 'X-Vault-Token': token ?? '' },
    })
    if (!(await res.json()).ok) { push('Delete failed', 'error'); return }
    const left = users.filter(u => u.name !== name)
    left.length === 0 ? router.push('/vault') : await reload()
  }

  const lock = async () => { await logout(); router.replace('/login') }

  return {
    serviceName, section, users, historyMap,
    handleRotated, handleDelete, lock,
    loading, toasts, push,
  }
}
