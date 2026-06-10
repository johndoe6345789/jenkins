import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithStore } from './utils'
import LoginPage from '../app/login/page'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

global.fetch = jest.fn()

beforeEach(() => jest.clearAllMocks())

describe('LoginPage', () => {
  it('renders password field and Unlock button', () => {
    renderWithStore(<LoginPage />)
    expect(screen.getByLabelText(/master password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument()
  })

  it('Unlock button disabled when password is empty', () => {
    renderWithStore(<LoginPage />)
    expect(screen.getByRole('button', { name: /unlock/i })).toBeDisabled()
  })

  it('Unlock enabled after typing a password', () => {
    renderWithStore(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/master password/i), {
      target: { value: 'abc' },
    })
    expect(screen.getByRole('button', { name: /unlock/i })).toBeEnabled()
  })

  it('shows error on failed login', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: 'Invalid password' }),
    })
    renderWithStore(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/master password/i), {
      target: { value: 'wrong' },
    })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))
    await waitFor(() =>
      expect(screen.getByText('Invalid password')).toBeInTheDocument(),
    )
  })

  it('redirects to /vault on successful login', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, token: 'abc' }),
    })
    renderWithStore(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/master password/i), {
      target: { value: 'correct' },
    })
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }))
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/vault'))
  })
})
