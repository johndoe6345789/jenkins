import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './useAuth'
import { useTargets } from './useTargets'
import type { NewCredForm } from '../components/NewCredentialForm'

const blank: NewCredForm = {
  service_name: '', username: '', password: '', badge: 'manual',
  section: 'custom', group: '', app_url: '', repo_path: '',
}

export function useNewCredential() {
  const { isAuth, logout, token } = useAuth()
  const { sections }              = useTargets()
  const router                    = useRouter()
  const [form, setForm]           = useState<NewCredForm>(blank)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (!isAuth) router.replace('/login')
  }, [isAuth, router])

  const existingServices = useMemo(() => {
    const s = new Set<string>()
    for (const items of Object.values(sections))
      for (const item of items) s.add(item.service_name)
    return Array.from(s).sort()
  }, [sections])

  const submit = async () => {
    if (!form.service_name || !form.username || !form.password) {
      setError('Service name, username and password are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Token': token ?? '',
        },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error ?? 'Failed to save'); return }
      router.push(
        `/vault/service/${encodeURIComponent(form.service_name)}`,
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const lock = async () => { await logout(); router.replace('/login') }

  return {
    form, setForm, existingServices,
    saving, error, submit, lock,
  }
}
