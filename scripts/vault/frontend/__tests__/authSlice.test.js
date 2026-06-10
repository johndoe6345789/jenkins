import authReducer, {
  setToken, clearToken, TOKEN_KEY,
} from '../lib/authSlice'

describe('authSlice', () => {
  const initial = { token: null }

  it('returns initial state', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initial)
  })

  it('setToken stores a token', () => {
    const state = authReducer(initial, setToken('abc123'))
    expect(state.token).toBe('abc123')
  })

  it('setToken accepts null', () => {
    const state = authReducer({ token: 'old' }, setToken(null))
    expect(state.token).toBeNull()
  })

  it('clearToken resets to null', () => {
    const state = authReducer({ token: 'existing' }, clearToken())
    expect(state.token).toBeNull()
  })

  it('TOKEN_KEY is a stable string', () => {
    expect(typeof TOKEN_KEY).toBe('string')
    expect(TOKEN_KEY.length).toBeGreaterThan(0)
  })
})
