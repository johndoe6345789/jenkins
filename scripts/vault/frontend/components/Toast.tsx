'use client'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Slide from '@mui/material/Slide'
import type { ToastItem } from '../lib/types'

interface Props {
  toasts: ToastItem[]
}

export function ToastList({ toasts }: Props) {
  return (
    <Box
      sx={{
        position: 'fixed', bottom: 24, right: 24,
        display: 'flex', flexDirection: 'column', gap: 1,
        zIndex: 9999,
      }}
    >
      {toasts.map(t => (
        <Slide key={t.id} direction="left" in mountOnEnter unmountOnExit>
          <Alert
            severity={t.type === 'error' ? 'error' : 'success'}
            variant="filled"
            sx={{ minWidth: 220 }}
          >
            {t.msg}
          </Alert>
        </Slide>
      ))}
    </Box>
  )
}
