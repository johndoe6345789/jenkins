'use client'
import { useTranslation } from 'react-i18next'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { toggleTheme } from '../lib/uiSlice'
import { useAppDispatch, useAppSelector } from '../lib/store'

export function ThemeToggle() {
  const { t }    = useTranslation()
  const dispatch = useAppDispatch()
  const mode     = useAppSelector(state => state.ui.themeMode)

  const title = mode === 'dark' ? t('header.themeLight') : t('header.themeDark')

  return (
    <Tooltip title={title}>
      <IconButton
        onClick={() => dispatch(toggleTheme())}
        size="small"
        aria-label="toggle theme"
        data-testid="theme-toggle-btn"
      >
        {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
      </IconButton>
    </Tooltip>
  )
}
