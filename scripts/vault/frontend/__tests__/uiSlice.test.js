import uiReducer, {
  toggleTheme, setLanguage, setDrawerOpen,
} from '../lib/uiSlice'

const initial = { themeMode: 'dark', language: 'en', drawerOpen: false }

describe('uiSlice', () => {
  it('returns initial state', () => {
    expect(uiReducer(undefined, { type: '@@INIT' })).toEqual(initial)
  })

  it('toggleTheme dark → light', () => {
    const s = uiReducer(initial, toggleTheme())
    expect(s.themeMode).toBe('light')
  })

  it('toggleTheme light → dark', () => {
    const s = uiReducer({ ...initial, themeMode: 'light' }, toggleTheme())
    expect(s.themeMode).toBe('dark')
  })

  it('setLanguage stores the language', () => {
    const s = uiReducer(initial, setLanguage('fr'))
    expect(s.language).toBe('fr')
  })

  it('setDrawerOpen opens the drawer', () => {
    const s = uiReducer(initial, setDrawerOpen(true))
    expect(s.drawerOpen).toBe(true)
  })

  it('setDrawerOpen closes the drawer', () => {
    const s = uiReducer(
      { ...initial, drawerOpen: true }, setDrawerOpen(false),
    )
    expect(s.drawerOpen).toBe(false)
  })
})
