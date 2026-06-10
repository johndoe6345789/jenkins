import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { EditForms } from './EditForms'
import type { Meta } from './EditForms'
import { Header } from './Header'

interface Props {
  credLabel: string
  meta: Meta
  setM: (k: keyof Meta) => (e: React.ChangeEvent<HTMLInputElement>) => void
  pw: string
  onPwChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string
  saving: boolean
  onSaveMeta: () => void
  onSavePw: () => void
  onDelete: () => void
  onBack: () => void
  lock: () => Promise<void>
}

export function EditView({
  credLabel, meta, setM, pw, onPwChange, error, saving,
  onSaveMeta, onSavePw, onDelete, onBack, lock,
}: Props) {
  return (
    <>
      <Header onLogout={lock} />
      <Container maxWidth="sm" sx={{ mt: 4, mb: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mb: 3 }}
        >
          Back
        </Button>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
          Edit: {credLabel}
        </Typography>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}
        <EditForms
          meta={meta} setM={setM}
          pw={pw} onPwChange={onPwChange}
          onSaveMeta={onSaveMeta} onSavePw={onSavePw}
          onDelete={onDelete} saving={saving}
        />
      </Container>
    </>
  )
}
