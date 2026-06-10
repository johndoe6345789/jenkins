import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  themeMode: 'dark' | 'light'
  language: string
  drawerOpen: boolean
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    themeMode: 'dark',
    language: 'en',
    drawerOpen: false,
  } as UiState,
  reducers: {
    toggleTheme(state) {
      state.themeMode = state.themeMode === 'dark' ? 'light' : 'dark'
    },
    setLanguage(state, { payload }: PayloadAction<string>) {
      state.language = payload
    },
    setDrawerOpen(state, { payload }: PayloadAction<boolean>) {
      state.drawerOpen = payload
    },
  },
})

export const { toggleTheme, setLanguage, setDrawerOpen } = uiSlice.actions
export default uiSlice.reducer
