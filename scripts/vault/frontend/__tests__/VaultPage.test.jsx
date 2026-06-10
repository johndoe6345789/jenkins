import { screen, fireEvent, act } from '@testing-library/react'
import { renderWithStore } from './utils'
import VaultPage from '../app/vault/page'

const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}))
jest.mock('../hooks/useAuth')
jest.mock('../hooks/useTargets')
jest.mock('../hooks/useToast')

import { useAuth }    from '../hooks/useAuth'
import { useTargets } from '../hooks/useTargets'
import { useToast }   from '../hooks/useToast'

const mockLogout = jest.fn().mockResolvedValue(undefined)
const mockReload  = jest.fn()
const mockPush    = jest.fn()

const EMPTY_DATA = { jenkins: [], frontends: [] }

function configMocks({ isAuth = true, loading = false, error = null } = {}) {
  useAuth.mockReturnValue({
    isAuth, token: isAuth ? 'tok' : null, logout: mockLogout,
  })
  useTargets.mockReturnValue({
    sections: EMPTY_DATA, loading, error, reload: mockReload,
  })
  useToast.mockReturnValue({ toasts: [], push: mockPush })
}

beforeEach(() => {
  jest.clearAllMocks()
  configMocks()
})

describe('VaultPage', () => {
  it('shows spinner when not authenticated', () => {
    configMocks({ isAuth: false })
    renderWithStore(<VaultPage />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows spinner while loading', () => {
    configMocks({ loading: true })
    renderWithStore(<VaultPage />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', async () => {
    configMocks({ isAuth: false })
    renderWithStore(<VaultPage />)
    await act(async () => {})
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('redirects to /login on unauthenticated error', async () => {
    configMocks({ error: 'unauthenticated' })
    renderWithStore(<VaultPage />)
    await act(async () => {})
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })

  it('renders vault content when authenticated', () => {
    renderWithStore(<VaultPage />)
    expect(screen.getByText('Vault')).toBeInTheDocument()
  })

  it('renders both Jenkins and Frontends sections', () => {
    renderWithStore(<VaultPage />)
    expect(screen.getByText('Jenkins')).toBeInTheDocument()
    expect(screen.getByText('Frontends')).toBeInTheDocument()
  })

  it('lock button logs out and redirects', async () => {
    renderWithStore(<VaultPage />)
    // Open the avatar menu
    fireEvent.click(screen.getByText('V'))
    // Click Log out
    fireEvent.click(screen.getByText('Log out'))
    await act(async () => {})
    expect(mockLogout).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })
})
