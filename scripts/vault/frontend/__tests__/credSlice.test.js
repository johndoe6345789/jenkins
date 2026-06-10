import credReducer, { fetchTargets } from '../lib/credSlice'
import { makeStore } from './utils'

const initial = { jenkins: [], frontends: [], loading: false, error: null }

global.fetch = jest.fn()

describe('credSlice reducer', () => {
  it('returns initial state', () => {
    expect(credReducer(undefined, { type: '@@INIT' })).toEqual(initial)
  })

  it('sets loading on pending', () => {
    const s = credReducer(initial, fetchTargets.pending())
    expect(s.loading).toBe(true)
    expect(s.error).toBeNull()
  })

  it('populates data on fulfilled', () => {
    const payload = {
      jenkins:   [{ name: 'uksodev' }],
      frontends: [{ name: 'pkg-admin' }],
    }
    const s = credReducer(initial, fetchTargets.fulfilled(payload))
    expect(s.loading).toBe(false)
    expect(s.jenkins).toEqual(payload.jenkins)
  })

  it('stores error on rejected with payload', () => {
    const s = credReducer(
      initial,
      fetchTargets.rejected(null, '', undefined, 'unauthenticated'),
    )
    expect(s.error).toBe('unauthenticated')
  })

  it('falls back to "Unknown error"', () => {
    const s = credReducer(
      initial,
      fetchTargets.rejected(null, '', undefined, undefined),
    )
    expect(s.error).toBe('Unknown error')
  })
})

describe('fetchTargets thunk', () => {
  beforeEach(() => jest.clearAllMocks())

  it('dispatches fulfilled on 200', async () => {
    const store   = makeStore({ auth: { token: 'tok' } })
    const payload = { jenkins: [{ name: 'uksodev' }], frontends: [] }
    fetch.mockResolvedValueOnce({
      status: 200, ok: true, json: async () => payload,
    })
    await store.dispatch(fetchTargets('tok'))
    expect(store.getState().creds.jenkins).toEqual(payload.jenkins)
    expect(store.getState().creds.error).toBeNull()
  })

  it('rejects with unauthenticated on 401', async () => {
    const store = makeStore({ auth: { token: 'tok' } })
    fetch.mockResolvedValueOnce({
      status: 401, ok: false, json: async () => ({}),
    })
    await store.dispatch(fetchTargets('tok'))
    expect(store.getState().creds.error).toBe('unauthenticated')
  })

  it('rejects with "Failed to load" on other non-ok status', async () => {
    const store = makeStore({ auth: { token: 'tok' } })
    fetch.mockResolvedValueOnce({
      status: 500, ok: false, json: async () => ({}),
    })
    await store.dispatch(fetchTargets('tok'))
    expect(store.getState().creds.error).toBe('Failed to load')
  })
})
