import { screen, fireEvent } from '@testing-library/react'
import { renderWithStore } from './utils'
import { NavDrawer } from '../components/NavDrawer'

const open  = { ui: { drawerOpen: true,  themeMode: 'dark', language: 'en' } }
const closed = { ui: { drawerOpen: false, themeMode: 'dark', language: 'en' } }

describe('NavDrawer', () => {
  it('section links not present when closed', () => {
    renderWithStore(<NavDrawer />, { preloadedState: closed })
    expect(screen.queryByText('Jenkins')).not.toBeInTheDocument()
  })

  it('shows section links when open', () => {
    renderWithStore(<NavDrawer />, { preloadedState: open })
    expect(screen.getByText('Jenkins')).toBeInTheDocument()
    expect(screen.getByText('Frontends')).toBeInTheDocument()
  })

  it('clicking a section link dispatches setDrawerOpen(false)', () => {
    const { store } = renderWithStore(
      <NavDrawer />, { preloadedState: open },
    )
    fireEvent.click(screen.getByText('Jenkins'))
    expect(store.getState().ui.drawerOpen).toBe(false)
  })
})
