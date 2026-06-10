'use client'
import type { ReactNode } from 'react'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import { store } from './store'
import i18n from './i18n'
import { ClientThemeProvider } from './ClientThemeProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        <ClientThemeProvider>{children}</ClientThemeProvider>
      </I18nextProvider>
    </Provider>
  )
}
