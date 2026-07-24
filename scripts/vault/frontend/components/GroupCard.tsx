'use client'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { ToastType } from '../lib/types'
import type { GroupBucket } from '../lib/buckets'
import groupLinks from '../lib/group-links.json'
import { ServiceGroup } from './ServiceGroup'
import s from './section.module.scss'

interface Props {
  bucket: GroupBucket
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function GroupCard({ bucket, onRotated, onToast }: Props) {
  const { t } = useTranslation()
  const groupKey = bucket.group.toLowerCase() as keyof typeof groupLinks
  const groupLink = groupLinks[groupKey]

  return (
    <Paper variant="outlined" className={s.groupCard}>
      {bucket.group && (
        <Box className={s.groupHeader}>
          <Typography className={s.groupLabel}>{bucket.group}</Typography>
          {groupLink && (
            <Button
              component="a"
              href={groupLink.url}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<OpenInNewIcon />}
              className={s.groupLink}
            >
              {groupLink.label}
            </Button>
          )}
        </Box>
      )}
      <Table size="small">
        <TableHead>
          <TableRow>
            {(['user', 'type', 'password', 'actions'] as const).map(k => (
              <TableCell key={k} className={s.headCell}>
                {t(`section.${k}`).toUpperCase()}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {bucket.services.map((g, i) => (
            <Fragment key={g.name}>
              {i > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className={s.spacerCell} />
                </TableRow>
              )}
              <ServiceGroup
                name={g.name}
                app_url={g.app_url}
                repo_path={g.repo_path}
                users={g.users}
                onRotated={onRotated}
                onToast={onToast}
              />
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}
