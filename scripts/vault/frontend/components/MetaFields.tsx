import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import type { Meta } from './EditForms'

interface Props {
  meta: Meta
  setM: (k: keyof Meta) =>
    (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function MetaFields({ meta, setM }: Props) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Service name"
          value={meta.service_name}
          onChange={setM('service_name')}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Username"
          value={meta.username}
          onChange={setM('username')}
          sx={{ flex: 1 }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Badge"
          value={meta.badge}
          onChange={setM('badge')}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Section"
          value={meta.section}
          onChange={setM('section')}
          sx={{ flex: 1 }}
        />
      </Box>
      <TextField
        label="Group"
        value={meta.group}
        onChange={setM('group')}
        placeholder="e.g. metabuilder"
      />
      <TextField
        label="App URL"
        value={meta.app_url}
        onChange={setM('app_url')}
      />
      <TextField
        label="Repo path"
        value={meta.repo_path}
        onChange={setM('repo_path')}
      />
    </Box>
  )
}
