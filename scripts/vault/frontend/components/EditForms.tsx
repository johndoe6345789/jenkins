import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { MetaFields } from './MetaFields'

export interface Meta {
  service_name: string; username: string; badge: string
  section: string; group: string; app_url: string; repo_path: string
}

interface Props {
  meta: Meta
  setM: (k: keyof Meta) => (e: React.ChangeEvent<HTMLInputElement>) => void
  pw: string
  onPwChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSaveMeta: () => void
  onSavePw: () => void
  onDelete: () => void
  saving: boolean
}

export function EditForms({
  meta, setM, pw, onPwChange,
  onSaveMeta, onSavePw, onDelete, saving,
}: Props) {
  return (
    <>
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Metadata
        </Typography>
        <MetaFields meta={meta} setM={setM} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="contained"
            onClick={onSaveMeta}
            disabled={saving}
          >
            Save changes
          </Button>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="overline" color="text.secondary">
          Password
        </Typography>
        <Box sx={{
          display: 'flex', gap: 2, mt: 1.5, alignItems: 'flex-start',
        }}>
          <TextField
            label="New password" type="password"
            value={pw} onChange={onPwChange}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            onClick={onSavePw}
            disabled={saving || !pw}
            sx={{ mt: 1 }}
          >
            Update
          </Button>
        </Box>
      </Paper>

      <Divider sx={{ my: 3 }} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="outlined" color="error" onClick={onDelete}>
          Delete credential
        </Button>
      </Box>
    </>
  )
}
