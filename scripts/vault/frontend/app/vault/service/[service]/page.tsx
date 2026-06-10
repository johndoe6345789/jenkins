'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useAuth } from '../../../../hooks/useAuth'
import { ServiceContent } from '../../../../components/ServiceContent'

export default function ServicePage() {
  const { isAuth } = useAuth()
  const router     = useRouter()
  useEffect(() => { if (!isAuth) router.replace('/login') }, [isAuth, router])
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
