import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppSelector } from '../lib/store'
import type { Credential, ToastType } from '../lib/types'

interface Opts {
  item: Credential
  onRotated: () => void
  onToast: (msg: string, type: ToastType) => void
}

export function useCredActions({ item, onRotated, onToast }: Opts) {
  const [shown, setShown]       = useState(false)
  const [rotating, setRotating] = useState(false)
  const token = useAppSelector(state => state.auth.token)
  const { t } = useTranslation()

  const toggleShown = () => setShown(s => !s)

  const copyUsername = async () => {
    if (!item.username) return
    await navigator.clipboard.writeText(item.username)
    onToast(t('cred.copiedUsername'), 'success')
  }

  const copy = async () => {
    if (!item.password) return
    await navigator.clipboard.writeText(item.password)
    onToast(t('cred.copied'), 'success')
  }

  const copyTurboLogin = async () => {
    if (!item.username || !item.password) return
    const payload = JSON.stringify({
      user: item.username,
      pass: item.password,
      rememberMe: true,
      loginMethod: 'password',
    })
    await navigator.clipboard.writeText(payload)
    onToast(t('cred.copiedTurboLogin'), 'success')
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
        onToast(
          t('cred.rotated', { name: item.username || item.name }),
          'success',
        )
      } else {
        onToast(json.error ?? t('cred.rotateFailed'), 'error')
      }
    } catch (e) {
      onToast((e as Error).message, 'error')
    } finally {
      setRotating(false)
    }
  }

  return { shown, toggleShown, rotating, copyUsername, copy, copyTurboLogin, rotate }
}
