'use client'
import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import LockIcon from '@mui/icons-material/Lock'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useAuth } from '../../hooks/useAuth'
import '../../lib/i18n'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const { t } = useTranslation()
  const router = useRouter()

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

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Paper variant="outlined" sx={{ p: 5, width: 360 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
          <Typography variant="h6" fontWeight={700}>
            {t('app.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('app.subtitle')}
          </Typography>
        </Box>
        <form onSubmit={submit}>
          <TextField
            fullWidth type="password"
            label={t('login.masterPassword')}
            placeholder={t('login.placeholder')}
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus size="small" sx={{ mb: 2 }}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}
          <Button
            fullWidth type="submit" variant="contained"
            disabled={loading || !password}
          >
            {loading ? t('login.unlocking') : t('login.unlock')}
          </Button>
        </form>
      </Paper>
    </Box>
  )
}
