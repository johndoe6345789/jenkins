'use client'
import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import LockIcon from '@mui/icons-material/Lock'
import MenuIcon from '@mui/icons-material/Menu'
import { setDrawerOpen } from '../lib/uiSlice'
import { useAppDispatch } from '../lib/store'
import { LanguageSelector } from './LanguageSelector'
import { ThemeToggle } from './ThemeToggle'
import { UserMenu } from './UserMenu'

interface Props {
  onLogout: () => void
}

export function Header({ onLogout }: Props) {
  const dispatch = useAppDispatch()
  const { t }    = useTranslation()

  return (
    <AppBar
      position="static" color="transparent" elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <IconButton
          edge="start" aria-label="menu"
          data-testid="burger-btn"
          onClick={() => dispatch(setDrawerOpen(true))}
        >
          <MenuIcon />
        </IconButton>
        <LockIcon sx={{ color: 'primary.main', mr: 0.5 }} />
        <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
          {t('app.title')}
        </Typography>
        <ThemeToggle />
        <LanguageSelector />
        <UserMenu onLogout={onLogout} />
      </Toolbar>
    </AppBar>
  )
}
