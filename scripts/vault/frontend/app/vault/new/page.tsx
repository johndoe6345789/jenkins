'use client'
import { useRouter } from 'next/navigation'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Header } from '../../../components/Header'
import { NewCredentialForm } from '../../../components/NewCredentialForm'
import { useNewCredential } from '../../../hooks/useNewCredential'
import '../../../lib/i18n'

export default function NewCredentialPage() {
  const router = useRouter()
  const {
    form, setForm, existingServices,
    saving, error, submit, lock,
  } = useNewCredential()

  return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.back()}
          sx={{ mb: 3 }}
        >
          Back
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Add Credential
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}
        <NewCredentialForm
          form={form} setForm={setForm}
          existingServices={existingServices}
          saving={saving} onSubmit={submit}
          onCancel={() => router.back()}
        />
      </Container>
    </>
  )
}
