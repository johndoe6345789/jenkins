'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import Link from 'next/link'
import { useAuth } from '../../hooks/useAuth'
import { useTargets } from '../../hooks/useTargets'
import { useToast } from '../../hooks/useToast'
import { Section } from '../../components/Section'
import { ToastList } from '../../components/Toast'
import { Header } from '../../components/Header'
import { NavDrawer } from '../../components/NavDrawer'
import '../../lib/i18n'

export default function VaultPage() {
  const { isAuth, logout }             = useAuth()
  const { sections, loading, error, reload } = useTargets()
  const { toasts, push }               = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!isAuth) router.replace('/login')
  }, [isAuth, router])

  useEffect(() => {
    if (error === 'unauthenticated') router.replace('/login')
  }, [error, router])

  if (!isAuth || loading) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
      }}>
        <CircularProgress />
      </Box>
    )
  }

  const lock = async () => { await logout(); router.replace('/login') }

  return (
    <>
      <Header onLogout={lock} />
      <NavDrawer />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {Object.entries(sections).map(([sectionId, items]) => (
            <Box key={sectionId} id={sectionId}>
              <Section
                title={sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}
                items={items}
                onRotated={reload}
                onToast={push}
              />
            </Box>
          ))}
        </Box>
      </Container>
      <Tooltip title="Add credential" placement="left">
        <Fab
          color="primary"
          component={Link}
          href="/vault/new"
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
          aria-label="add credential"
        >
          <AddIcon />
        </Fab>
      </Tooltip>
      <ToastList toasts={toasts} />
    </>
  )
}
