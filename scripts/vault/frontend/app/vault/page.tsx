'use client'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { VaultContent } from '../../components/VaultContent'
import '../../lib/i18n'

export default function VaultPage() {
  const isAuth = useRequireAuth()

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
