import { useRouter } from 'next/navigation'
import type { Meta } from '../components/EditForms'

interface Opts {
  name: string
  token: string | null
  meta: Meta
  pw: string
  setPw: (v: string) => void
  setError: (v: string) => void
  setSaving: (v: boolean) => void
  reload: () => void
  credLabel: string
}

export function useEditHandlers({
  name, token, meta, pw, setPw,
  setError, setSaving, reload, credLabel,
}: Opts) {
  const router  = useRouter()
  const authHdr = { 'X-Vault-Token': token ?? '' }
  const jsonHdr = { 'Content-Type': 'application/json', ...authHdr }

  const saveMeta = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/custom/${name}`, {
        method: 'PATCH', headers: jsonHdr, body: JSON.stringify(meta),
      })
      if (!(await res.json()).ok) { setError('Save failed'); return }
      await reload()
    } catch (e) { setError((e as Error).message)
    } finally { setSaving(false) }
  }

  const savePassword = async () => {
    if (!pw) return
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/custom/${name}/password`, {
        method: 'PUT', headers: jsonHdr,
        body: JSON.stringify({ password: pw }),
      })
      if (!(await res.json()).ok) {
        setError('Password update failed'); return
      }
      setPw('')
    } catch (e) { setError((e as Error).message)
    } finally { setSaving(false) }
  }

  const deleteCred = async () => {
    if (!window.confirm(`Delete "${credLabel}"?`)) return
    await fetch(`/api/custom/${name}`,
      { method: 'DELETE', headers: authHdr })
    router.push('/vault')
  }

  return { saveMeta, savePassword, deleteCred }
}
