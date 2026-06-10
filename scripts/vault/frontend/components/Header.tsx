'use client'
import { useTranslation } from 'react-i18next'
import AppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Toolbar from '@mui/material/Toolbar'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import LockIcon from '@mui/icons-material/Lock'
import MenuIcon from '@mui/icons-material/Menu'
import i18n from '../lib/i18n'
import { toggleTheme, setLanguage, setDrawerOpen } from '../lib/uiSlice'
import { useAppDispatch, useAppSelector } from '../lib/store'
import { UserMenu } from './UserMenu'

interface Props {
  onLogout: () => void
}

export function Header({ onLogout }: Props) {
  const dispatch = useAppDispatch()
  const { t }    = useTranslation()
  const mode     = useAppSelector(state => state.ui.themeMode)
  const language = useAppSelector(state => state.ui.language)

  const handleLang = (e: SelectChangeEvent) => {
    const lang = e.target.value
    dispatch(setLanguage(lang))
    i18n.changeLanguage(lang)
  }

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
        <Tooltip title={
          mode === 'dark' ? t('header.themeLight') : t('header.themeDark')
        }>
          <IconButton
            onClick={() => dispatch(toggleTheme())}
            size="small"
            aria-label="toggle theme"
            data-testid="theme-toggle-btn"
          >
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        <Select
          value={language}
          onChange={handleLang}
          size="small" variant="outlined"
          sx={{ minWidth: 64, fontSize: 12 }}
          inputProps={{ 'data-testid': 'lang-select' }}
        >
          <MenuItem value="en">EN</MenuItem>
          <MenuItem value="fr">FR</MenuItem>
          <MenuItem value="nl">NL</MenuItem>
          <MenuItem value="es">ES</MenuItem>
          <MenuItem value="cy">CY</MenuItem>
        </Select>
        <UserMenu onLogout={onLogout} />
      </Toolbar>
    </AppBar>
  )
}
