'use client'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { useCredActions } from '../hooks/useCredActions'
import { CredCardActions } from './CredCardActions'
import type { Credential, ToastType } from '../lib/types'

interface Props {
  item: Credential
  lastRotated?: string
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
  editHref?: string
  onDelete?: () => Promise<void>
}

export function CredCard({
  item, lastRotated, onRotated, onToast, editHref, onDelete,
}: Props) {
  const { t } = useTranslation()
  const { shown, toggleShown, rotating, copy, rotate } =
    useCredActions({ item, onRotated, onToast })

  const masked = item.password
    ? '•'.repeat(Math.min(item.password.length, 32))
    : null

  const rotatedLabel = lastRotated
    ? new Date(lastRotated).toLocaleString(undefined, {
        dateStyle: 'medium', timeStyle: 'short',
      })
    : 'Never'

  return (
    <Card variant="outlined" data-testid={`cred-card-${item.name}`}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Box sx={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', mb: 2,
        }}>
          <Box>
            <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
              {item.username || item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last rotated: {rotatedLabel}
            </Typography>
          </Box>
          <Chip
            label={item.badge} size="small" variant="outlined"
            sx={{ fontFamily: 'monospace', fontSize: 11 }}
          />
        </Box>

        <Box sx={{
          bgcolor: 'action.hover', borderRadius: 1,
          px: 1.5, py: 1, mb: 2, minHeight: 38,
          display: 'flex', alignItems: 'center',
        }}>
          <Typography
            variant="body2" fontFamily="monospace"
            sx={{
              wordBreak: 'break-all',
              color: item.password ? 'text.primary' : 'text.disabled',
            }}
          >
            {item.password ? (shown ? item.password : masked) : '—'}
          </Typography>
        </Box>

        <CredCardActions
          shown={shown} rotating={rotating} hasPw={!!item.password}
          onToggleShown={toggleShown} onCopy={copy} onRotate={rotate}
          editHref={editHref} onDelete={onDelete}
        />
      </CardContent>
    </Card>
  )
}
