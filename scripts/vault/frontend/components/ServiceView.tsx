import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'
import type { Credential, ToastItem, ToastType } from '../lib/types'
import { CredCard } from './CredCard'
import { Header } from './Header'
import { ServiceHeader } from './ServiceHeader'
import { ToastList } from './Toast'

interface Props {
  serviceName: string
  section: string
  users: Credential[]
  historyMap: Map<string, string | undefined>
  onRotated: () => Promise<void>
  onDelete: (name: string) => Promise<void>
  push: (msg: string, type?: ToastType) => void
  toasts: ToastItem[]
  lock: () => Promise<void>
}

export function ServiceView({
  serviceName, section, users, historyMap,
  onRotated, onDelete, push, toasts, lock,
}: Props) {
  const router = useRouter()

  if (users.length === 0) return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="md" sx={{ mt: 6 }}>
        <Button startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/vault')} sx={{ mb: 3 }}>
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
        <Button startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/vault')} sx={{ mb: 3 }}>
          Back to Vault
        </Button>
        <ServiceHeader
          serviceName={serviceName}
          section={section}
          meta={users[0]}
        />
        <Divider sx={{ my: 3 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {users.map(item => (
            <CredCard
              key={item.name}
              item={item}
              lastRotated={historyMap.get(item.name)}
              onRotated={onRotated}
              onToast={push}
              editHref={item.source === 'custom'
                ? `/vault/credential/${item.name}/edit`
                : undefined}
              onDelete={item.source === 'custom'
                ? () => onDelete(item.name)
                : undefined}
            />
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="outlined" startIcon={<AddIcon />}
            component={Link}
            href={`/vault/new?service=${encodeURIComponent(serviceName)}`}
          >Add credential</Button>
        </Box>
      </Container>
      <ToastList toasts={toasts} />
    </>
  )
}
