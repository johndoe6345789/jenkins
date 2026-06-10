'use client'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../lib/store'
import type { Credential, ToastType } from '../lib/types'

interface Props {
  item: Credential
  lastRotated?: string
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
  editHref?: string
  onDelete?: () => Promise<void>
}

export function CredCard({ item, lastRotated, onRotated, onToast, editHref, onDelete }: Props) {
  const [shown, setShown]       = useState(false)
  const [rotating, setRotating] = useState(false)
  const token = useAppSelector(state => state.auth.token)
  const { t } = useTranslation()

  const copy = async () => {
    if (!item.password) return
    await navigator.clipboard.writeText(item.password)
    onToast(t('cred.copied'), 'success')
  }

  const rotate = async () => {
    setRotating(true)
    try {
      const res = await fetch(item.rotate_url, {
        method: 'POST',
        headers: { 'X-Vault-Token': token ?? '' },
      })
      const json = await res.json()
      if (json.ok) {
        await onRotated()
        onToast(t('cred.rotated', { name: item.username || item.name }), 'success')
      } else {
        onToast(json.error ?? t('cred.rotateFailed'), 'error')
      }
    } catch (e) {
      onToast((e as Error).message, 'error')
    } finally {
      setRotating(false)
    }
  }

  const masked = item.password ? '•'.repeat(Math.min(item.password.length, 32)) : null

  const rotatedLabel = lastRotated
    ? new Date(lastRotated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Never'

  return (
    <Card variant="outlined" data-testid={`cred-card-${item.name}`}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600} lineHeight={1.2}>
              {item.username || item.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Last rotated: {rotatedLabel}
            </Typography>
          </Box>
          <Chip label={item.badge} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 11 }} />
        </Box>

        <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1, mb: 2, minHeight: 38, display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all', color: item.password ? 'text.primary' : 'text.disabled' }}>
            {item.password ? (shown ? item.password : masked) : '—'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => setShown(s => !s)} disabled={!item.password} sx={{ minWidth: 60 }}>
            {shown ? t('cred.hide') : t('cred.show')}
          </Button>
          <Button size="small" variant="outlined" onClick={copy} disabled={!item.password}>
            {t('cred.copy')}
          </Button>
          <Button size="small" variant="contained" onClick={rotate} disabled={rotating} sx={{ ml: 'auto' }}>
            {rotating ? '…' : t('cred.rotate')}
          </Button>
        </Box>

        {(editHref || onDelete) && (
          <>
            <Divider sx={{ mt: 2, mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              {editHref && (
                <Button size="small" startIcon={<EditIcon />} component={Link} href={editHref}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button size="small" color="error" startIcon={<DeleteOutlineIcon />} onClick={onDelete} sx={{ ml: 'auto' }}>
                  Delete
                </Button>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}
