'use client'
import { useState } from 'react'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import type { Credential, ToastType } from '../lib/types'
import { CredRow } from './CredRow'

interface Props {
  name: string
  app_url?: string
  repo_path?: string
  users: Credential[]
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function ServiceGroup({ name, app_url, repo_path, users, onRotated, onToast }: Props) {
  const [open, setOpen] = useState(true)
  const { t } = useTranslation()

  return (
    <>
      <TableRow
        onClick={() => setOpen(o => !o)}
        sx={{
          cursor: 'pointer',
          bgcolor: 'action.hover',
          borderLeft: 3,
          borderLeftColor: 'primary.main',
          '&:hover': { bgcolor: 'action.selected' },
        }}
      >
        <TableCell colSpan={4} sx={{ py: 1.25, borderBottom: open ? 1 : 'none', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ExpandMoreIcon
              sx={{
                fontSize: 18,
                color: 'text.secondary',
                transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s ease',
                flexShrink: 0,
              }}
            />
            <Typography
              component={Link}
              href={`/vault/service/${encodeURIComponent(name)}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              variant="body2"
              fontWeight={700}
              sx={{ color: 'text.primary', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {name}
            </Typography>
            <Chip
              label={users.length}
              size="small"
              sx={{ height: 18, fontSize: 10, ml: 0.25 }}
            />
            {repo_path && (
              <Typography
                component="span"
                variant="caption"
                fontFamily="monospace"
                color="text.secondary"
                sx={{ ml: 0.5, display: { xs: 'none', sm: 'inline' } }}
              >
                {repo_path}
              </Typography>
            )}
            {app_url && (
              <Tooltip title={t('cred.open')}>
                <IconButton
                  size="small"
                  sx={{ p: 0.25, ml: 'auto' }}
                  onClick={e => { e.stopPropagation(); window.open(app_url, '_blank', 'noopener,noreferrer') }}
                  data-testid={`open-btn-${name}`}
                >
                  <OpenInNewIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
      {open && users.map(item => (
        <CredRow
          key={item.name}
          item={item}
          onRotated={onRotated}
          onToast={onToast}
        />
      ))}
    </>
  )
}
