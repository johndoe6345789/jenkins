import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../lib/store'
import type { Credential, ToastType } from '../lib/types'

export interface RotateFailure { name: string; error: string }

export interface RotateProgress {
  total: number
  done: number
  ok: number
  fail: number
  current: string
  failures: RotateFailure[]
}

const EMPTY: RotateProgress = {
  total: 0, done: 0, ok: 0, fail: 0, current: '', failures: [],
}

interface Opts {
  items: Credential[]
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function useRotateAll({ items, onRotated, onToast }: Opts) {
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [progress, setProgress] = useState<RotateProgress>(EMPTY)
  const token = useAppSelector(state => state.auth.token)
  const { t } = useTranslation()

  const rotateAll = async () => {
    setBusy(true)
    setDialogOpen(true)
    const failures: RotateFailure[] = []
    let ok = 0
    let fail = 0
    setProgress({ ...EMPTY, total: items.length })

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      setProgress(p => ({ ...p, current: item.name }))
      try {
        const res = await fetch(item.rotate_url, {
          method: 'POST',
          headers: { 'X-Vault-Token': token ?? '' },
        })
        const body = await res.json().catch(() => ({}))
        if (res.ok && body.ok) {
          ok++
        } else {
          fail++
          failures.push({
            name: item.name,
            error: body.error || `HTTP ${res.status}`,
          })
        }
      } catch (e) {
        fail++
        failures.push({ name: item.name, error: (e as Error).message })
      }
      setProgress(p => ({ ...p, done: i + 1, ok, fail, failures: [...failures] }))
    }

    await onRotated()
    setBusy(false)
    onToast(
      fail
        ? t('section.rotateSummary', { ok, fail })
        : t('section.rotatedAll', { count: ok }),
      fail ? 'error' : 'success',
    )
  }

  return {
    busy, rotateAll, progress, dialogOpen,
    closeDialog: () => setDialogOpen(false),
  }
}
