import { screen, fireEvent, within } from '@testing-library/react'
import { renderWithStore } from './utils'
import { Header } from '../components/Header'

const onLogout = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('Header', () => {
  it('renders the app title', () => {
    renderWithStore(<Header onLogout={onLogout} />)
    expect(screen.getByText('Vault')).toBeInTheDocument()
  })

  it('shows burger menu button', () => {
    renderWithStore(<Header onLogout={onLogout} />)
    expect(screen.getByLabelText('menu')).toBeInTheDocument()
  })

  it('burger dispatches setDrawerOpen(true)', () => {
    const { store } = renderWithStore(<Header onLogout={onLogout} />)
    fireEvent.click(screen.getByLabelText('menu'))
    expect(store.getState().ui.drawerOpen).toBe(true)
  })

  it('theme toggle present', () => {
    renderWithStore(<Header onLogout={onLogout} />)
    expect(screen.getByLabelText('toggle theme')).toBeInTheDocument()
  })

  it('theme toggle dark → light', () => {
    const { store } = renderWithStore(<Header onLogout={onLogout} />)
    fireEvent.click(screen.getByLabelText('toggle theme'))
    expect(store.getState().ui.themeMode).toBe('light')
  })

  it('theme toggle light → dark', () => {
    const { store } = renderWithStore(
      <Header onLogout={onLogout} />,
      { preloadedState: { ui: { themeMode: 'light', language: 'en', drawerOpen: false } } },
    )
    fireEvent.click(screen.getByLabelText('toggle theme'))
    expect(store.getState().ui.themeMode).toBe('dark')
  })

  it('avatar initial V visible', () => {
    renderWithStore(<Header onLogout={onLogout} />)
    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('language select triggers handleLang (covers lines 26-27, 59)', async () => {
    const { store } = renderWithStore(<Header onLogout={onLogout} />)
    // Open the MUI Select dropdown
    const selectDisplay = document.querySelector('.MuiSelect-select')
    fireEvent.mouseDown(selectDisplay)
    // Options render in a portal in document.body
    const listbox = await screen.findByRole('listbox')
    fireEvent.click(within(listbox).getByText('FR'))
    expect(store.getState().ui.language).toBe('fr')
  })
})
