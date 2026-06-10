import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from './utils'
import { ClientThemeProvider } from '../lib/ClientThemeProvider'

function wrap(store, ui) {
  return render(<Provider store={store}>{ui}</Provider>)
}

describe('ClientThemeProvider', () => {
  it('renders children in dark mode (default)', () => {
    wrap(makeStore(), (
      <ClientThemeProvider><span>content</span></ClientThemeProvider>
    ))
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('renders children in light mode', () => {
    const store = makeStore({
      ui: { themeMode: 'light', language: 'en', drawerOpen: false },
    })
    wrap(store, (
      <ClientThemeProvider><span>light</span></ClientThemeProvider>
    ))
    expect(screen.getByText('light')).toBeInTheDocument()
  })
})
