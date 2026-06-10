'use client'
import { useState } from 'react'
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
import { useAppSelector } from '../lib/store'
import type { Credential, ToastType } from '../lib/types'
import { ServiceGroup } from './ServiceGroup'

interface Props {
  title: string
  items: Credential[]
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

interface ServiceBucket {
  name: string
  app_url?: string
  repo_path?: string
  users: Credential[]
}

interface GroupBucket {
  group: string
  services: ServiceBucket[]
}

function buildBuckets(items: Credential[]): GroupBucket[] {
  const groupOrder: string[] = []
  const groupMap = new Map<string, Map<string, ServiceBucket>>()

  for (const item of items) {
    const grp = item.group ?? ''
    const svc = item.service_name ?? item.name
    if (!groupMap.has(grp)) {
      groupOrder.push(grp)
      groupMap.set(grp, new Map())
    }
    const svcMap = groupMap.get(grp)!
    if (!svcMap.has(svc)) {
      svcMap.set(svc, { name: svc, app_url: item.app_url, repo_path: item.repo_path, users: [] })
    }
    svcMap.get(svc)!.users.push(item)
  }

  return groupOrder.map(grp => ({
    group: grp,
    services: Array.from(groupMap.get(grp)!.values()),
  }))
}

export function Section({ title, items, onRotated, onToast }: Props) {
  const [busy, setBusy] = useState(false)
  const token = useAppSelector(state => state.auth.token)
  const { t } = useTranslation()
  const tid = title.toLowerCase()

  const rotateAll = async () => {
    setBusy(true)
    let ok = 0, fail = 0
    for (const item of items) {
      try {
        const res = await fetch(item.rotate_url, {
          method: 'POST',
          headers: { 'X-Vault-Token': token ?? '' },
        })
        ;(await res.json()).ok ? ok++ : fail++
      } catch { fail++ }
    }
    await onRotated()
    setBusy(false)
    onToast(
      fail ? t('section.rotateSummary', { ok, fail }) : t('section.rotatedAll', { count: ok }),
      fail ? 'error' : 'success',
    )
  }

  const buckets   = buildBuckets(items)
  const hasGroups = buckets.some(b => b.group !== '')

  return (
    <Paper variant="outlined" data-testid={`section-${tid}`}>
      <Box sx={{
        px: 2.5, py: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: 1, borderColor: 'divider',
      }}>
        <Typography variant="overline" color="text.secondary" fontWeight={600} data-testid={`section-title-${tid}`}>
          {title}
        </Typography>
        <Button
          size="small" variant="outlined"
          onClick={rotateAll} disabled={busy || items.length === 0}
          data-testid={`rotate-all-btn-${tid}`}
        >
          {busy ? t('section.rotating') : t('section.rotateAll')}
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            {(['user', 'type', 'password', 'actions'] as const).map(k => (
              <TableCell key={k} sx={{ color: 'text.secondary', fontSize: 11 }}>
                {t(`section.${k}`).toUpperCase()}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {buckets.map((bucket, bi) => (
            <>
              {hasGroups && bucket.group && (
                <TableRow key={`grp-${bucket.group}`}>
                  <TableCell colSpan={4} sx={{ pt: bi === 0 ? 1.5 : 2.5, pb: 0.5, border: 'none' }}>
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="text.disabled"
                      sx={{ textTransform: 'uppercase', letterSpacing: 1.5 }}
                    >
                      {bucket.group}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {bucket.services.map((g, i) => (
                <>
                  {(i > 0 || (bi > 0 && !bucket.group)) && (
                    <TableRow key={`spacer-${g.name}`} sx={{ height: 10 }}>
                      <TableCell colSpan={4} sx={{ p: 0, border: 'none' }} />
                    </TableRow>
                  )}
                  <ServiceGroup
                    key={g.name}
                    name={g.name}
                    app_url={g.app_url}
                    repo_path={g.repo_path}
                    users={g.users}
                    onRotated={onRotated}
                    onToast={onToast}
                  />
                </>
              ))}
            </>
          ))}
        </TableBody>
      </Table>
    </Paper>
  )
}
