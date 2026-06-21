import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Credential, TargetsPayload } from './types'

export const fetchTargets = createAsyncThunk<
  TargetsPayload,
  string,
  { rejectValue: string }
>('creds/fetch', async (token, { rejectWithValue }) => {
  const res = await fetch('/api/targets', {
    headers: { 'X-Vault-Token': token },
  })
  if (res.status === 401) return rejectWithValue('unauthenticated')
  if (!res.ok) return rejectWithValue('Failed to load')
  return res.json() as Promise<TargetsPayload>
})

interface CredState {
  sections: Record<string, Credential[]>
  loading: boolean
  initialLoad: boolean
  error: string | null
}

const credSlice = createSlice({
  name: 'creds',
  initialState: {
    sections: {},
    loading: false,
    initialLoad: true,
    error: null,
  } as CredState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTargets.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTargets.fulfilled, (state, { payload }) => {
        state.loading = false
        state.initialLoad = false
        state.sections = payload
      })
      .addCase(fetchTargets.rejected, (state, { payload }) => {
        state.loading = false
        state.initialLoad = false
        state.error = payload ?? 'Unknown error'
      })
  },
})

export default credSlice.reducer
