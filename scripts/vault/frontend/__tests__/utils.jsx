import { render } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { I18nextProvider } from 'react-i18next'
import authReducer from '../lib/authSlice'
import credReducer from '../lib/credSlice'
import uiReducer   from '../lib/uiSlice'
import i18n        from '../lib/i18n'

export function makeStore(preloadedState = {}) {
  return configureStore({
    reducer: { auth: authReducer, creds: credReducer, ui: uiReducer },
    preloadedState,
  })
}

export function renderWithStore(ui, { preloadedState = {}, ...opts } = {}) {
  const store = makeStore(preloadedState)
  const Wrapper = ({ children }) => (
    <Provider store={store}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </Provider>
  )
  return { ...render(ui, { wrapper: Wrapper, ...opts }), store }
}

export const mockItem = {
  name:       'uksodev',
  badge:      'jenkins.env',
  password:   'secret123',
  rotate_url: '/api/rotate/jenkins/uksodev',
}

export const mockItemEmpty = {
  name:       'admin',
  badge:      'jenkins.env',
  password:   '',
  rotate_url: '/api/rotate/jenkins/admin',
}
