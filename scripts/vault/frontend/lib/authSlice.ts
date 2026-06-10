import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export const TOKEN_KEY = 'vault_token'

interface AuthState {
  token: string | null
}

const authSlice = createSlice({
  name: 'auth',
  initialState: { token: null } as AuthState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload
    },
    clearToken(state) {
      state.token = null
    },
  },
})

export const { setToken, clearToken } = authSlice.actions
export default authSlice.reducer
