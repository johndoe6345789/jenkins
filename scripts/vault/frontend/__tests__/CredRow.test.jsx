import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithStore, mockItem, mockItemEmpty } from './utils'
import { CredRow } from '../components/CredRow'

global.fetch = jest.fn()

const onRotated = jest.fn().mockResolvedValue(undefined)
const onToast   = jest.fn()

beforeEach(() => jest.clearAllMocks())

const store = { auth: { token: 'tok' } }

function row(item = mockItem) {
  return (
    <table><tbody>
      <CredRow item={item} onRotated={onRotated} onToast={onToast} />
    </tbody></table>
  )
}

describe('CredRow', () => {
  it('renders target name', () => {
    renderWithStore(row(), { preloadedState: store })
    expect(screen.getByText('uksodev')).toBeInTheDocument()
  })

  it('masks password by default', () => {
    renderWithStore(row(), { preloadedState: store })
    expect(screen.queryByText('secret123')).not.toBeInTheDocument()
    expect(screen.getByText('Show')).toBeInTheDocument()
  })

  it('reveals password on Show click', () => {
    renderWithStore(row(), { preloadedState: store })
    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('secret123')).toBeInTheDocument()
    expect(screen.getByText('Hide')).toBeInTheDocument()
  })

  it('Show and Copy disabled when no password', () => {
    renderWithStore(row(mockItemEmpty), { preloadedState: store })
    expect(screen.getByText('Show')).toBeDisabled()
    expect(screen.getByText('Copy')).toBeDisabled()
  })

  it('copies password to clipboard', async () => {
    navigator.clipboard = { writeText: jest.fn().mockResolvedValue(undefined) }
    renderWithStore(row(), { preloadedState: store })
    fireEvent.click(screen.getByText('Copy'))
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('secret123'),
    )
  })

  it('toasts success on successful rotation', async () => {
    fetch.mockResolvedValueOnce({ json: async () => ({ ok: true }) })
    renderWithStore(row(), { preloadedState: store })
    fireEvent.click(screen.getByText('Rotate'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('Rotated uksodev', 'success'),
    )
  })

  it('toasts api error on failed rotation', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: 'container offline' }),
    })
    renderWithStore(row(), { preloadedState: store })
    fireEvent.click(screen.getByText('Rotate'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('container offline', 'error'),
    )
  })

  it('uses fallback message when api error is absent', async () => {
    fetch.mockResolvedValueOnce({ json: async () => ({ ok: false }) })
    renderWithStore(row(), { preloadedState: store })
    fireEvent.click(screen.getByText('Rotate'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('Rotation failed', 'error'),
    )
  })

  it('toasts fetch exception message (catch branch)', async () => {
    fetch.mockRejectedValueOnce(new Error('network timeout'))
    renderWithStore(row(), { preloadedState: store })
    fireEvent.click(screen.getByText('Rotate'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('network timeout', 'error'),
    )
  })
})
