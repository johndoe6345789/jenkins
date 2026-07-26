'use client'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useGroupToggle } from '../hooks/useGroupToggle'
import type { Credential, ToastType } from '../lib/types'
import { CredRow } from './CredRow'
import s from './serviceGroup.module.scss'

interface Props {
  name: string
  app_url?: string
  repo_path?: string
  users: Credential[]
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function ServiceGroup({
  name, app_url, repo_path, users, onRotated, onToast,
}: Props) {
  const { open, toggle } = useGroupToggle()
  const { t } = useTranslation()
  const hasManaged = users.some(item => item.source !== 'catalog')
  return (
    <>
      <TableRow
        onClick={toggle}
        className={s.row}
        data-testid={`service-group-${name}`}
      >
        <TableCell
          colSpan={4}
          className={`${s.cell}${open ? '' : ` ${s.noBorder}`}`}
        >
          <Box className={s.inner}>
            <ExpandMoreIcon
              className={`${s.chevron}${open ? '' : ` ${s.closed}`}`}
            />
            <Box className={s.nameStack}>
              {hasManaged ? (
                <Typography
                  component={Link}
                  href={`/vault/service/${encodeURIComponent(name)}`}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className={s.name}
                >
                  {name}
                </Typography>
              ) : (
                <Typography className={s.name}>{name}</Typography>
              )}
              {repo_path && (
                <Typography className={s.repoPath} component="span">
                  {repo_path.replace(/^~\/Documents\/GitHub\//, '')}
                </Typography>
              )}
            </Box>
            {app_url && (
              <Tooltip title={t('cred.open')}>
                <IconButton
                  size="small"
                  className={s.openBtn}
                  onClick={e => {
                    e.stopPropagation()
                    window.open(app_url, '_blank', 'noopener,noreferrer')
                  }}
                  data-testid={`open-btn-${name}`}
                >
                  <OpenInNewIcon className={s.openIcon} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </TableCell>
      </TableRow>
      {open && users.map(item => (
        <CredRow
          key={item.name} item={item}
          onRotated={onRotated} onToast={onToast}
        />
      ))}
    </>
  )
}
