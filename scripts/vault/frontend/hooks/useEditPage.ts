import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from './useAuth'
import { useTargets } from './useTargets'
import { useEditHandlers } from './useEditHandlers'
import type { Meta } from '../components/EditForms'

const BLANK: Meta = {
  service_name: '', username: '', badge: '',
  section: '', group: '', app_url: '', repo_path: '',
}

export function useEditPage() {
  const { isAuth, logout, token } = useAuth()
  const { sections, reload }      = useTargets()
  const router                    = useRouter()
  const { name } = useParams() as { name: string }

  const cred = useMemo(() => {
    for (const items of Object.values(sections)) {
      const f = items.find(
        c => c.name === name && c.source === 'custom',
      )
      if (f) return f
    }
    return null
  }, [sections, name])

  const [meta, setMeta] = useState<Meta>(BLANK)
  const [pw, setPw]         = useState('')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAuth) router.replace('/login')
  }, [isAuth, router])

  useEffect(() => {
    if (!cred) return
    const {
      service_name, username, badge, group, app_url, repo_path,
    } = cred
    setMeta({
      service_name, username, badge, section: '',
      group: group ?? '', app_url: app_url ?? '',
      repo_path: repo_path ?? '',
    })
  }, [cred])

  const setM = (k: keyof Meta) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setMeta(m => ({ ...m, [k]: e.target.value }))

  const credLabel = cred?.username ?? name
  const lock = async () => { await logout(); router.replace('/login') }

  const { saveMeta, savePassword, deleteCred } = useEditHandlers({
    name, token, meta, pw, setPw,
    setError, setSaving, reload, credLabel,
  })

  return {
    isAuth, credLabel, meta, setM, pw, error, saving, lock,
    onPwChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setPw(e.target.value),
    onBack: () => router.back(),
    saveMeta, savePassword, deleteCred,
  }
}
