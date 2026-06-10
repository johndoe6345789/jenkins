'use client'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Typography from '@mui/material/Typography'
import { useNavDrawer } from '../hooks/useNavDrawer'

export function NavDrawer() {
  const { t }                          = useTranslation()
  const { open, close, scrollTo, nav } = useNavDrawer()

  return (
    <Drawer
      open={open} onClose={close}
      PaperProps={{ sx: { width: 240 } }}
      data-testid="nav-drawer"
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="overline" color="text.secondary">
          {t('app.title')}
        </Typography>
      </Box>
      <Divider />
      {nav.map(({ id, groups, hasGroups }) => (
        <Box key={id}>
          <ListItemButton
            onClick={() => scrollTo(id)}
            sx={{ py: 1 }}
            data-testid={`nav-link-${id}`}
          >
            <ListItemText
              primary={id.charAt(0).toUpperCase() + id.slice(1)}
              primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
            />
          </ListItemButton>
          <List dense disablePadding>
            {groups.map(({ label, services }) => (
              <Box key={label || '_ungrouped'}>
                {hasGroups && label && (
                  <Typography
                    variant="caption"
                    sx={{
                      pl: 2.5, py: 0.5, display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: 1.2, fontSize: 10,
                      color: 'text.secondary',
                    }}
                  >
                    {label}
                  </Typography>
                )}
                {services.map(svc => (
                  <ListItemButton
                    key={svc}
                    component={Link}
                    href={`/vault/service/${encodeURIComponent(svc)}`}
                    onClick={close}
                    sx={{
                      pl: hasGroups && label ? 3.5 : 2.5,
                      py: 0.4,
                    }}
                  >
                    <ListItemText
                      primary={svc}
                      primaryTypographyProps={{
                        fontSize: 12,
                        color: 'text.secondary',
                      }}
                    />
                  </ListItemButton>
                ))}
              </Box>
            ))}
          </List>
          <Divider />
        </Box>
      ))}
    </Drawer>
  )
}
