'use client'
import { useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Link from 'next/link'
import { useAuth } from '../../../../hooks/useAuth'
import { useTargets } from '../../../../hooks/useTargets'
import { useHistory } from '../../../../hooks/useHistory'
import { useToast } from '../../../../hooks/useToast'
import { CredCard } from '../../../../components/CredCard'
import { Header } from '../../../../components/Header'
import { ToastList } from '../../../../components/Toast'
import '../../../../lib/i18n'

export default function ServicePage() {
  const { isAuth, logout, token }             = useAuth()
  const { sections, loading, reload }         = useTargets()
  const { history, reload: reloadHistory }    = useHistory()
  const { toasts, push }                      = useToast()
  const router                                = useRouter()
  const params                                = useParams()
  const serviceName = decodeURIComponent(params.service as string)

  useEffect(() => { if (!isAuth) router.replace('/login') }, [isAuth, router])

  const { section, users } = useMemo(() => {
    for (const [sec, items] of Object.entries(sections)) {
      const matched = items.filter(c => c.service_name === serviceName)
      if (matched.length) return { section: sec, users: matched }
    }
    return { section: '', users: [] }
  }, [sections, serviceName])

  const historyMap = useMemo(
    () => new Map(history.map(h => [h.name, h.updated_at])),
    [history],
  )

  const meta = users[0]

  const handleRotated = async () => { await reload(); await reloadHistory() }

  const handleDelete = async (name: string) => {
    if (!window.confirm('Delete this credential?')) return
    const res = await fetch(`/api/custom/${name}`, {
      method: 'DELETE',
      headers: { 'X-Vault-Token': token ?? '' },
    })
    if (!(await res.json()).ok) { push('Delete failed', 'error'); return }
    const remaining = users.filter(u => u.name !== name)
    if (remaining.length === 0) router.push('/vault')
    else await reload()
  }

  const lock = async () => { await logout(); router.replace('/login') }

  if (!isAuth || loading) return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  )

  if (users.length === 0) return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/vault')} sx={{ mb: 3 }}>
          Back to Vault
        </Button>
        <Typography variant="h5" color="text.secondary">
          Service &ldquo;{serviceName}&rdquo; not found
        </Typography>
      </Container>
    </>
  )

  return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/vault')} sx={{ mb: 3 }}>
          Back to Vault
        </Button>

        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" fontWeight={700} lineHeight={1.2}>{serviceName}</Typography>
            {section && (
              <Chip label={section} size="small" variant="outlined" sx={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }} />
            )}
            {meta?.app_url && (
              <Tooltip title="Open app">
                <IconButton size="small" onClick={() => window.open(meta.app_url, '_blank', 'noopener,noreferrer')}>
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          {meta?.repo_path && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75 }}>
              <Typography variant="body2" fontFamily="monospace" color="text.secondary">{meta.repo_path}</Typography>
              <Tooltip title="Copy path">
                <IconButton size="small" sx={{ p: 0.25 }} onClick={() => navigator.clipboard.writeText(meta.repo_path!)}>
                  <ContentCopyIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {users.map(item => (
            <CredCard
              key={item.name}
              item={item}
              lastRotated={historyMap.get(item.name)}
              onRotated={handleRotated}
              onToast={push}
              editHref={item.source === 'custom' ? `/vault/credential/${item.name}/edit` : undefined}
              onDelete={item.source === 'custom' ? () => handleDelete(item.name) : undefined}
            />
          ))}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            component={Link}
            href={`/vault/new?service=${encodeURIComponent(serviceName)}`}
          >
            Add credential
          </Button>
        </Box>
      </Container>
      <ToastList toasts={toasts} />
    </>
  )
}
