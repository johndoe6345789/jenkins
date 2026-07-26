import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithStore, mockItem } from './utils'
import { Section } from '../components/Section'
import frontendLinks from '../lib/frontend-links.json'

global.fetch = jest.fn()

const onRotated = jest.fn().mockResolvedValue(undefined)
const onToast   = jest.fn()

beforeEach(() => jest.clearAllMocks())

const items = [
  mockItem,
  { name: 'admin', badge: 'jenkins.env', password: 'pw2',
    rotate_url: '/api/rotate/jenkins/admin' },
]

describe('Section', () => {
  it('renders section title', () => {
    renderWithStore(
      <Section title="Jenkins" items={items}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    expect(screen.getByText('Jenkins')).toBeInTheDocument()
  })

  it('renders all credential rows', () => {
    renderWithStore(
      <Section title="Jenkins" items={items}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    expect(screen.getAllByText('uksodev').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('admin').length).toBeGreaterThanOrEqual(1)
  })

  it('links PostgreSQL Dashboard to its own login page', () => {
    const service = frontendLinks.services.find(
      item => item.name === 'postgres-dashboard',
    )
    expect(service.url).toBe(
      'https://metabuilder.wardcrew.com/postgres/admin/login',
    )
  })

  it('catalogues every credential-backed frontend service', () => {
    const services = [
      'businessplanner', 'caprover', 'dbal', 'dockerterminal',
      'emailclient', 'grafana', 'hamradio', 'next-extra-primary',
      'packagerepo', 'packagerepo-registry', 'pastebin',
      'postgres-dashboard', 'pyracms', 'workflowui',
    ]
    const catalogNames = frontendLinks.services.map(
      item => item.name.toLowerCase(),
    )
    expect(catalogNames).toEqual(expect.arrayContaining(services))
  })

  it('renders the application catalogue separately from credentials', () => {
    renderWithStore(
      <Section title="Frontends" items={[]}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByTestId(
      'catalogue-link-metabuilder',
    )).toBeInTheDocument()
    expect(screen.getByTestId(
      'service-group-metabuilder',
    )).toBeInTheDocument()
    expect(
      screen.getAllByText('No login required').length,
    ).toBeGreaterThan(0)
  })

  it('Rotate all disabled when items is empty', () => {
    renderWithStore(
      <Section title="Jenkins" items={[]}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    expect(screen.getByText('Rotate all')).toBeDisabled()
  })

  it('toasts success when all rotate successfully', async () => {
    fetch.mockResolvedValue({ json: async () => ({ ok: true }) })
    renderWithStore(
      <Section title="Jenkins" items={items}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    fireEvent.click(screen.getByText('Rotate all'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('All 2 rotated', 'success'),
    )
  })

  it('toasts summary on partial failure', async () => {
    fetch
      .mockResolvedValueOnce({ json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({ json: async () => ({ ok: false }) })
    renderWithStore(
      <Section title="Jenkins" items={items}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    fireEvent.click(screen.getByText('Rotate all'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('1 rotated, 1 failed', 'error'),
    )
  })

  it('catch branch counts thrown fetch as failure', async () => {
    fetch
      .mockResolvedValueOnce({ json: async () => ({ ok: true }) })
      .mockRejectedValueOnce(new Error('network'))
    renderWithStore(
      <Section title="Jenkins" items={items}
        onRotated={onRotated} onToast={onToast} />,
      { preloadedState: { auth: { token: 'tok' } } },
    )
    fireEvent.click(screen.getByText('Rotate all'))
    await waitFor(() =>
      expect(onToast).toHaveBeenCalledWith('1 rotated, 1 failed', 'error'),
    )
  })
})
