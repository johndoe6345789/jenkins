import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../lib/store'
import type { Credential, ToastType } from '../lib/types'

interface Opts {
  items: Credential[]
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function useRotateAll({ items, onRotated, onToast }: Opts) {
  const [busy, setBusy] = useState(false)
  const token = useAppSelector(state => state.auth.token)
  const { t } = useTranslation()

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
      fail
        ? t('section.rotateSummary', { ok, fail })
        : t('section.rotatedAll', { count: ok }),
      fail ? 'error' : 'success',
    )
  }

  return { busy, rotateAll }
}
