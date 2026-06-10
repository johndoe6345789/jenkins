import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from './utils'
import { useTargets } from '../hooks/useTargets'

global.fetch = jest.fn()

describe('useTargets', () => {
  beforeEach(() => jest.clearAllMocks())

  const wrapper = store =>
    ({ children }) => <Provider store={store}>{children}</Provider>

  it('fetches targets when token present', async () => {
    const store   = makeStore({ auth: { token: 'tok' } })
    const payload = { jenkins: [{ name: 'uksodev' }], frontends: [] }
    fetch.mockResolvedValueOnce({
      status: 200, ok: true, json: async () => payload,
    })
    const { result } = renderHook(
      () => useTargets(), { wrapper: wrapper(store) },
    )
    await act(async () => {})
    expect(result.current.sections.jenkins).toEqual(payload.jenkins)
    expect(result.current.loading).toBe(false)
  })

  it('sets error on 401', async () => {
    const store = makeStore({ auth: { token: 'tok' } })
    fetch.mockResolvedValueOnce({
      status: 401, ok: false, json: async () => ({}),
    })
    const { result } = renderHook(
      () => useTargets(), { wrapper: wrapper(store) },
    )
    await act(async () => {})
    expect(result.current.error).toBe('unauthenticated')
  })

  it('does not fetch when token is null', () => {
    const store = makeStore({ auth: { token: null } })
    renderHook(() => useTargets(), { wrapper: wrapper(store) })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reload re-fetches', async () => {
    const store   = makeStore({ auth: { token: 'tok' } })
    const payload = { jenkins: [], frontends: [] }
    fetch.mockResolvedValue({
      status: 200, ok: true, json: async () => payload,
    })
    const { result } = renderHook(
      () => useTargets(), { wrapper: wrapper(store) },
    )
    await act(async () => {})
    await act(async () => { result.current.reload() })
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
