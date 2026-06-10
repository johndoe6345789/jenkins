import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'

const BADGES = [
  'manual', 'env_var', 'db_bcrypt', 'keycloak_realm', 'caprover',
]
const SECTIONS = ['frontends', 'jenkins', 'custom']

export interface NewCredForm {
  service_name: string; username: string; password: string; badge: string
  section: string; group: string; app_url: string; repo_path: string
}

interface Props {
  form: NewCredForm
  setForm: React.Dispatch<React.SetStateAction<NewCredForm>>
  existingServices: string[]
  saving: boolean
  onSubmit: () => void
  onCancel: () => void
}

export function NewCredentialForm({
  form, setForm, existingServices,
  saving, onSubmit, onCancel,
}: Props) {
  const set = (k: keyof NewCredForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Autocomplete
        freeSolo options={existingServices}
        inputValue={form.service_name}
        onInputChange={(_, v) => setForm(f => ({ ...f, service_name: v }))}
        renderInput={p => <TextField {...p} label="Service name" required />}
      />
      <TextField
        label="Username" required
        value={form.username}
        onChange={set('username')}
      />
      <TextField
        label="Password" required type="password"
        value={form.password}
        onChange={set('password')}
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Autocomplete
          freeSolo options={BADGES} sx={{ flex: 1 }}
          inputValue={form.badge}
          onInputChange={(_, v) => setForm(f => ({ ...f, badge: v }))}
          renderInput={p => <TextField {...p} label="Badge" />}
        />
        <Autocomplete
          freeSolo options={SECTIONS} sx={{ flex: 1 }}
          inputValue={form.section}
          onInputChange={(_, v) => setForm(f => ({ ...f, section: v }))}
          renderInput={p => <TextField {...p} label="Section" />}
        />
      </Box>
      <TextField
        label="Group"
        placeholder="e.g. metabuilder, infrastructure"
        value={form.group}
        onChange={set('group')}
      />
      <TextField
        label="App URL"
        value={form.app_url}
        onChange={set('app_url')}
      />
      <TextField
        label="Repo path"
        value={form.repo_path}
        onChange={set('repo_path')}
      />
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 1 }}>
        <Button variant="outlined" onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </Box>
    </Box>
  )
}
