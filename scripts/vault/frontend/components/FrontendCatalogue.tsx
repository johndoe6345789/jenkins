'use client'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import frontendLinks from '../lib/frontend-links.json'

export function FrontendCatalogue() {
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="overline" fontWeight={600}>
        Applications
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Open deployed interfaces. Credentials are listed separately below.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {frontendLinks.services.map(service => (
          <Button
            key={service.name}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon />}
            data-testid={`catalogue-link-${service.name}`}
          >
            {service.name}
          </Button>
        ))}
      </Box>
    </Paper>
  )
}
