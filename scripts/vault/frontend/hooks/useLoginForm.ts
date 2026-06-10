import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from './useAuth'

export function useLoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const { t }     = useTranslation()
  const router    = useRouter()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(password)
    if (result.ok) {
      router.push('/vault')
    } else {
      setError(result.error ?? t('login.invalidPassword'))
      setLoading(false)
    }
  }

  return { password, setPassword, error, loading, submit, t }
}
