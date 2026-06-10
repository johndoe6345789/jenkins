'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../../hooks/useAuth'
import { VaultContent } from '../../components/VaultContent'
import '../../lib/i18n'

export default function VaultPage() {
  const { isAuth } = useAuth()
  const router     = useRouter()

  useEffect(() => {
    if (!isAuth) router.replace('/login')
  }, [isAuth, router])

  if (!isAuth) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
      }}>
        <CircularProgress />
      </Box>
    )
  }

  return <VaultContent />
}
