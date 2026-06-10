'use client'
import { useMemo, type ReactNode } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import { useAppSelector } from './store'

const DARK_PALETTE = {
  primary:    { main: '#7c6ff7' },
  background: { default: '#0d0d1a', paper: '#16162a' },
} as const

const LIGHT_PALETTE = {
  primary:    { main: '#5b4fcf' },
  background: { default: '#f0eff8', paper: '#ffffff' },
  text:       { primary: '#1a1730', secondary: '#5a5474' },
  divider:    '#d8d4ef',
} as const

export function ClientThemeProvider({ children }: { children: ReactNode }) {
  const mode = useAppSelector(state => state.ui.themeMode)

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'dark' ? DARK_PALETTE : LIGHT_PALETTE),
        },
        components: {
          MuiPaper: {
            styleOverrides: { root: { backgroundImage: 'none' } },
          },
        },
      }),
    [mode],
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box data-testid="theme-bg" sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
        {children}
      </Box>
    </ThemeProvider>
  )
}
