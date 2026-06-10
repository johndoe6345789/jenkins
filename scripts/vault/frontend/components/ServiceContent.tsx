'use client'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useServiceData } from '../hooks/useServiceData'
import { ServiceView } from './ServiceView'
import '../lib/i18n'

export function ServiceContent() {
  const {
    serviceName, section, users, historyMap,
    handleRotated, handleDelete, lock,
    loading, toasts, push,
  } = useServiceData()

  if (loading) return (
    <Box sx={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
    }}>
      <CircularProgress />
    </Box>
  )

  return (
    <ServiceView
      serviceName={serviceName}
      section={section}
      users={users}
      historyMap={historyMap}
      onRotated={handleRotated}
      onDelete={handleDelete}
      push={push}
      toasts={toasts}
      lock={lock}
    />
  )
}
