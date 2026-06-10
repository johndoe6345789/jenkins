'use client'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { useCredActions } from '../hooks/useCredActions'
import type { Credential, ToastType } from '../lib/types'
import s from './credRow.module.scss'

interface Props {
  item: Credential
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function CredRow({ item, onRotated, onToast }: Props) {
  const { t } = useTranslation()
  const { shown, toggleShown, rotating, copy, rotate } =
    useCredActions({ item, onRotated, onToast })

  const masked = item.password
    ? '•'.repeat(Math.min(item.password.length, 24))
    : null

  return (
    <TableRow hover data-testid={`cred-row-${item.name}`}>
      <TableCell className={s.cell}>
        <Typography variant="body2" fontWeight={500}>
          {item.username || item.name}
        </Typography>
      </TableCell>
      <TableCell className={s.cell}>
        <Chip
          label={item.badge} size="small" variant="outlined"
          className={s.badge}
        />
      </TableCell>
      <TableCell className={s.cell} data-testid={`pw-cell-${item.name}`}>
        <Typography
          variant="body2"
          className={s.pw}
          color={item.password ? 'text.primary' : 'text.disabled'}
        >
          {item.password ? (shown ? item.password : masked) : '—'}
        </Typography>
      </TableCell>
      <TableCell className={`${s.cell} ${s.actCell}`}>
        <Box className={s.actions}>
          <Button
            size="small" variant="outlined"
            onClick={toggleShown}
            disabled={!item.password}
            data-testid={`show-btn-${item.name}`}
          >
            {shown ? t('cred.hide') : t('cred.show')}
          </Button>
          <Button
            size="small" variant="outlined"
            onClick={copy}
            disabled={!item.password}
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
        </Box>
      </TableCell>
    </TableRow>
  )
}
