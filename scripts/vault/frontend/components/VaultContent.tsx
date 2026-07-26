'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Container from '@mui/material/Container'
import Fab from '@mui/material/Fab'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import Link from 'next/link'
import { useAuth } from '../hooks/useAuth'
import { useTargets } from '../hooks/useTargets'
import { useToast } from '../hooks/useToast'
import { Header } from './Header'
import { NavDrawer } from './NavDrawer'
import { Section } from './Section'
import { ToastList } from './Toast'

export function VaultContent() {
  const { logout, hydrated }     = useAuth()
  const { sections, loading, initialLoad, error, reload } = useTargets()
  const { toasts, push }         = useToast()
  const router                   = useRouter()
  const pathname                 = usePathname()
  const allItems = Object.values(sections ?? {}).flat()

  useEffect(() => {
    if (hydrated && error === 'unauthenticated')
      router.replace(`/login?from=${encodeURIComponent(pathname)}`)
  }, [hydrated, error, router, pathname])

  const lock = async () => { await logout(); router.replace('/login') }

  if (loading && initialLoad) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
      }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Header onLogout={lock} />
      <NavDrawer />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 14 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(sections ?? {}).map(([sectionId, items]) => (
            <Box key={sectionId} id={sectionId}>
              <Section
                title={sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}
                items={items}
                allItems={allItems}
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
