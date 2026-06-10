'use client'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { buildBuckets } from '../lib/buckets'
import { useRotateAll } from '../hooks/useRotateAll'
import type { Credential, ToastType } from '../lib/types'
import { GroupCard } from './GroupCard'
import s from './section.module.scss'

interface Props {
  title: string
  items: Credential[]
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function Section({ title, items, onRotated, onToast }: Props) {
  const { t } = useTranslation()
  const { busy, rotateAll } = useRotateAll({ items, onRotated, onToast })
  const tid = title.toLowerCase()

  return (
    <Box data-testid={`section-${tid}`} className={s.sectionWrap}>
      <Box className={s.sectionHeader}>
        <Typography
          variant="overline" fontWeight={600}
          className={s.title}
          data-testid={`section-title-${tid}`}
        >
          {title}
        </Typography>
        <Button
          size="small" variant="outlined"
          onClick={rotateAll}
          disabled={busy || items.length === 0}
          data-testid={`rotate-all-btn-${tid}`}
        >
          {busy ? t('section.rotating') : t('section.rotateAll')}
        </Button>
      </Box>
      <Box className={s.groupStack}>
        {buildBuckets(items).map(bucket => (
          <GroupCard
            key={bucket.group || '_ungrouped'}
            bucket={bucket}
            onRotated={onRotated}
            onToast={onToast}
          />
        ))}
      </Box>
    </Box>
  )
}
