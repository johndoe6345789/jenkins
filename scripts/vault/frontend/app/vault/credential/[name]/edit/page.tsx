'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useAuth } from '../../../../../hooks/useAuth'
import { useTargets } from '../../../../../hooks/useTargets'
import { Header } from '../../../../../components/Header'
import '../../../../../lib/i18n'

export default function EditCredentialPage() {
  const { isAuth, logout, token } = useAuth()
  const { sections, reload }      = useTargets()
  const router                    = useRouter()
  const { name }                  = useParams() as { name: string }

  const cred = useMemo(() => {
    for (const items of Object.values(sections)) {
      const found = items.find(c => c.name === name && c.source === 'custom')
      if (found) return found
    }
    return null
  }, [sections, name])

  const [meta, setMeta] = useState({ service_name: '', username: '', badge: '', section: '', group: '', app_url: '', repo_path: '' })
  const [pw, setPw]     = useState('')
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (!isAuth) router.replace('/login') }, [isAuth, router])
  useEffect(() => {
    if (cred) setMeta({
      service_name: cred.service_name, username: cred.username,
      badge: cred.badge, section: '', group: cred.group ?? '',
      app_url: cred.app_url ?? '', repo_path: cred.repo_path ?? '',
    })
  }, [cred])

  const setM = (k: keyof typeof meta) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMeta(m => ({ ...m, [k]: e.target.value }))

  const saveMeta = async () => {
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/custom/${name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Vault-Token': token ?? '' },
        body: JSON.stringify(meta),
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Vault-Token': token ?? '' },
        body: JSON.stringify({ password: pw }),
      })
      if (!(await res.json()).ok) { setError('Password update failed'); return }
      setPw('')
    } catch (e) { setError((e as Error).message)
    } finally { setSaving(false) }
  }

  const deleteCred = async () => {
    if (!window.confirm(`Delete "${cred?.username ?? name}"?`)) return
    await fetch(`/api/custom/${name}`, { method: 'DELETE', headers: { 'X-Vault-Token': token ?? '' } })
    router.push('/vault')
  }

  const lock = async () => { await logout(); router.replace('/login') }

  if (!isAuth) return null

  return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 3 }}>Back</Button>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Edit: {cred?.username ?? name}
        </Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="overline" color="text.secondary">Metadata</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Service name" value={meta.service_name} onChange={setM('service_name')} sx={{ flex: 1 }} />
              <TextField label="Username" value={meta.username} onChange={setM('username')} sx={{ flex: 1 }} />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Badge" value={meta.badge} onChange={setM('badge')} sx={{ flex: 1 }} />
              <TextField label="Section" value={meta.section} onChange={setM('section')} sx={{ flex: 1 }} />
            </Box>
            <TextField label="Group" value={meta.group} onChange={setM('group')} placeholder="e.g. metabuilder" />
            <TextField label="App URL" value={meta.app_url} onChange={setM('app_url')} />
            <TextField label="Repo path" value={meta.repo_path} onChange={setM('repo_path')} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={saveMeta} disabled={saving}>Save changes</Button>
            </Box>
          </Box>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="overline" color="text.secondary">Password</Typography>
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, alignItems: 'flex-start' }}>
            <TextField
              label="New password" type="password" value={pw}
              onChange={e => setPw(e.target.value)} sx={{ flex: 1 }}
            />
            <Button variant="contained" onClick={savePassword} disabled={saving || !pw} sx={{ mt: 1 }}>
              Update
            </Button>
          </Box>
        </Paper>

        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" color="error" onClick={deleteCred}>
            Delete credential
          </Button>
        </Box>
      </Container>
    </>
  )
}
