'use client'
import { Suspense } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import LockIcon from '@mui/icons-material/Lock'
import { LanguageSelector } from '../../components/LanguageSelector'
import { ThemeToggle } from '../../components/ThemeToggle'
import { useLoginForm } from '../../hooks/useLoginForm'
import '../../lib/i18n'

function LoginForm() {
  const { password, setPassword, error, loading, submit, t } = useLoginForm()
  return (
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
  )
}

export default function LoginPage() {
  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      <Box sx={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', gap: 1, alignItems: 'center',
      }}>
        <ThemeToggle />
        <LanguageSelector />
      </Box>
      <Suspense>
        <LoginForm />
      </Suspense>
    </Box>
  )
}
