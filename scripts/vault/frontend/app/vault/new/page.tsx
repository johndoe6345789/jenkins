'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useAuth } from '../../../hooks/useAuth'
import { useTargets } from '../../../hooks/useTargets'
import { Header } from '../../../components/Header'
import '../../../lib/i18n'

const BADGES   = ['manual', 'env_var', 'db_bcrypt', 'keycloak_realm', 'caprover']
const SECTIONS = ['frontends', 'jenkins', 'custom']

const blank = { service_name: '', username: '', password: '', badge: 'manual', section: 'custom', group: '', app_url: '', repo_path: '' }

export default function NewCredentialPage() {
  const { isAuth, logout, token } = useAuth()
  const { sections }              = useTargets()
  const router                    = useRouter()
  const [form, setForm]           = useState(blank)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => { if (!isAuth) router.replace('/login') }, [isAuth, router])

  const existingServices = useMemo(() => {
    const s = new Set<string>()
    for (const items of Object.values(sections))
      for (const item of items) s.add(item.service_name)
    return Array.from(s).sort()
  }, [sections])

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async () => {
    if (!form.service_name || !form.username || !form.password) {
      setError('Service name, username and password are required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Vault-Token': token ?? '' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.ok) { setError(json.error ?? 'Failed to save'); return }
      router.push(`/vault/service/${encodeURIComponent(form.service_name)}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const lock = async () => { await logout(); router.replace('/login') }

  return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.back()} sx={{ mb: 3 }}>
          Back
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Add Credential</Typography>

        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            freeSolo options={existingServices}
            inputValue={form.service_name}
            onInputChange={(_, v) => setForm(f => ({ ...f, service_name: v }))}
            renderInput={p => <TextField {...p} label="Service name" required />}
          />
          <TextField label="Username" required value={form.username} onChange={set('username')} />
          <TextField label="Password" required type="password" value={form.password} onChange={set('password')} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Autocomplete
              freeSolo options={BADGES} sx={{ flex: 1 }}
              inputValue={form.badge}
              onInputChange={(_, v) => setForm(f => ({ ...f, badge: v }))}
              renderInput={p => <TextField {...p} label="Badge" />}
            />
            <Autocomplete
              freeSolo options={SECTIONS} sx={{ flex: 1 }}
              inputValue={form.section}
              onInputChange={(_, v) => setForm(f => ({ ...f, section: v }))}
              renderInput={p => <TextField {...p} label="Section" />}
            />
          </Box>
          <TextField label="Group" placeholder="e.g. metabuilder, infrastructure" value={form.group} onChange={set('group')} />
          <TextField label="App URL" value={form.app_url} onChange={set('app_url')} />
          <TextField label="Repo path" value={form.repo_path} onChange={set('repo_path')} />
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 1 }}>
            <Button variant="outlined" onClick={() => router.back()}>Cancel</Button>
            <Button variant="contained" onClick={submit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Box>
        </Box>
      </Container>
    </>
  )
}
