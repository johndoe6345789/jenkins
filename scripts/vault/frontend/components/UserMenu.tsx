'use client'
import { type MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Tooltip from '@mui/material/Tooltip'
import LogoutIcon from '@mui/icons-material/Logout'
import { useUserMenu } from '../hooks/useUserMenu'

interface Props {
  onLogout: () => void
}

export function UserMenu({ onLogout }: Props) {
  const { t } = useTranslation()
  const { anchor, open, close } = useUserMenu()

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          onClick={(e: MouseEvent<HTMLButtonElement>) => open(e)}
          size="small"
          sx={{ ml: 0.5 }}
          data-testid="avatar-btn"
        >
          <Avatar sx={{
            width: 32, height: 32,
            bgcolor: 'primary.main',
            fontSize: 14, fontWeight: 700,
          }}>
            V
          </Avatar>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem
          onClick={() => { close(); onLogout() }}
          data-testid="logout-btn"
        >
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('header.logout')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
