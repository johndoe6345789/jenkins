'use client'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useRequireAuth } from '../../../../hooks/useRequireAuth'
import { ServiceContent } from '../../../../components/ServiceContent'

export default function ServicePage() {
  const isAuth = useRequireAuth()
  if (!isAuth) return (
    <Box sx={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
    }}>
      <CircularProgress />
    </Box>
  )
  return <ServiceContent />
}
