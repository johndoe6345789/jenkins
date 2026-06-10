'use client'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '../public/locales/en.json'
import fr from '../public/locales/fr.json'
import nl from '../public/locales/nl.json'
import es from '../public/locales/es.json'
import cy from '../public/locales/cy.json'

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      nl: { translation: nl },
      es: { translation: es },
      cy: { translation: cy },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
}

export default i18n
