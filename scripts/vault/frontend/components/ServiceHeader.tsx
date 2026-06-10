import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import type { Credential } from '../lib/types'

interface Props {
  serviceName: string
  section: string
  meta?: Credential
}

export function ServiceHeader({ serviceName, section, meta }: Props) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center',
        gap: 1.5, flexWrap: 'wrap',
      }}>
        <Typography variant="h4" fontWeight={700} lineHeight={1.2}>
          {serviceName}
        </Typography>
        {section && (
          <Chip
            label={section} size="small" variant="outlined"
            sx={{
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 0.5,
            }}
          />
        )}
        {meta?.app_url && (
          <Tooltip title="Open app">
            <IconButton
              size="small"
              onClick={() => window.open(
                meta.app_url, '_blank', 'noopener,noreferrer',
              )}
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {meta?.repo_path && (
        <Box sx={{
          display: 'flex', alignItems: 'center',
          gap: 0.5, mt: 0.75,
        }}>
          <Typography
            variant="body2" fontFamily="monospace"
            color="text.secondary"
          >
            {meta.repo_path}
          </Typography>
          <Tooltip title="Copy path">
            <IconButton size="small" sx={{ p: 0.25 }}
              onClick={() => navigator.clipboard.writeText(meta.repo_path!)}
            >
              <ContentCopyIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}
