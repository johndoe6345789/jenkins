import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { makeStore } from './utils'
import { useAuth } from '../hooks/useAuth'

global.fetch = jest.fn()

function wrapper(store) {
  return ({ children }) => <Provider store={store}>{children}</Provider>
}

describe('useAuth', () => {
  let store

  beforeEach(() => {
    store = makeStore()
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('starts unauthenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) })
    expect(result.current.isAuth).toBe(false)
  })

  it('hydrates token from localStorage on mount', async () => {
    localStorage.setItem('vault_token', 'stored-tok')
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) })
    await act(async () => {})
    expect(result.current.isAuth).toBe(true)
  })

  it('login success stores token', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ ok: true, token: 'new-tok' }),
    })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) })
    let res
    await act(async () => { res = await result.current.login('secret') })
    expect(res.ok).toBe(true)
    expect(result.current.isAuth).toBe(true)
    expect(localStorage.getItem('vault_token')).toBe('new-tok')
  })

  it('login failure returns error', async () => {
    fetch.mockResolvedValueOnce({
      json: async () => ({ ok: false, error: 'bad pw' }),
    })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) })
    let res
    await act(async () => { res = await result.current.login('wrong') })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('bad pw')
  })

  it('logout clears token and localStorage', async () => {
    fetch.mockResolvedValue({ json: async () => ({ ok: true }) })
    const s = makeStore({ auth: { token: 'tok' } })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(s) })
    await act(async () => { await result.current.logout() })
    expect(result.current.isAuth).toBe(false)
    expect(localStorage.getItem('vault_token')).toBeNull()
  })

  it('logout skips fetch when token is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(store) })
    await act(async () => { await result.current.logout() })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('logout handles fetch failure gracefully via .catch', async () => {
    fetch.mockRejectedValueOnce(new Error('network error'))
    const s = makeStore({ auth: { token: 'tok' } })
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(s) })
    await act(async () => { await result.current.logout() })
    // .catch swallows the error; token still cleared
    expect(result.current.isAuth).toBe(false)
  })
})
