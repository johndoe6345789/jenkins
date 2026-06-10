'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useAppSelector } from '../lib/store'
import type { Credential, ToastType } from '../lib/types'

interface Props {
  item: Credential
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function CredRow({ item, onRotated, onToast }: Props) {
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

  const masked = item.password
    ? '•'.repeat(Math.min(item.password.length, 24))
    : null

  return (
    <TableRow hover data-testid={`cred-row-${item.name}`} sx={{ '& td': { py: 1 } }}>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>
          {item.username || item.name}
        </Typography>
      </TableCell>
      <TableCell>
        <Chip
          label={item.badge} size="small" variant="outlined"
          sx={{ fontFamily: 'monospace', fontSize: 10 }}
        />
      </TableCell>
      <TableCell data-testid={`pw-cell-${item.name}`}>
        <Typography
          variant="body2" fontFamily="monospace" fontSize={12}
          sx={{
            wordBreak: 'break-all',
            color: item.password ? 'text.primary' : 'text.disabled',
          }}
        >
          {item.password ? (shown ? item.password : masked) : '—'}
        </Typography>
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Button
          size="small" variant="outlined"
          onClick={() => setShown(s => !s)}
          disabled={!item.password}
          sx={{ mr: 0.5, minWidth: 52 }}
          data-testid={`show-btn-${item.name}`}
        >
          {shown ? t('cred.hide') : t('cred.show')}
        </Button>
        <Button
          size="small" variant="outlined"
          onClick={copy}
          disabled={!item.password}
          sx={{ mr: 0.5 }}
          data-testid={`copy-btn-${item.name}`}
        >
          {t('cred.copy')}
        </Button>
        <Button
          size="small" variant="contained"
          onClick={rotate} disabled={rotating}
          data-testid={`rotate-btn-${item.name}`}
        >
          {rotating ? '…' : t('cred.rotate')}
        </Button>
      </TableCell>
    </TableRow>
  )
}
