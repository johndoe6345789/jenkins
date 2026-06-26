'use client'
import { useTranslation } from 'react-i18next'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { RotateProgress } from '../hooks/useRotateAll'

interface Props {
  open: boolean
  busy: boolean
  progress: RotateProgress
  onClose: () => void
}

export default function RotateProgressDialog(
  { open, busy, progress, onClose }: Props,
) {
  const { t } = useTranslation()
  const { total, done, ok, fail, current, failures } = progress
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth
      maxWidth="sm" data-testid="rotate-progress-dialog">
      <DialogTitle>{t('section.rotateTitle')}</DialogTitle>
      <DialogContent>
        <LinearProgress variant="determinate" value={pct} sx={{ mb: 1.5 }} />
        <Typography variant="body2" data-testid="rotate-progress-status">
          {t('section.rotateProgress', { done, total, ok, fail })}
          {busy && current ? ` · ${current}` : ''}
        </Typography>
        {failures.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="error">
              {t('section.rotateFailures', { count: failures.length })}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, maxHeight: 220,
              overflowY: 'auto' }}>
              {failures.map(f => (
                <Typography key={f.name} component="li" variant="body2"
                  sx={{ wordBreak: 'break-word' }}>
                  <strong>{f.name}</strong>: {f.error}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          {busy ? t('section.rotating') : t('section.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
