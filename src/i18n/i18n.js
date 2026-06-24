import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enCommon from './resources/en/common.json'
import heCommon from './resources/he/common.json'
import arCommon from './resources/ar/common.json'

export const supportedLanguages = ['en', 'he', 'ar']
export const rtlLanguages = ['he', 'ar', 'fa', 'ur']

export function normalizeLanguage(language) {
  if (!language) return 'en'

  if (supportedLanguages.includes(language)) {
    return language
  }

  const base = language.split('-')[0]
  return supportedLanguages.includes(base) ? base : 'en'
}

export function getDirection(language) {
  const normalized = normalizeLanguage(language)
  return rtlLanguages.includes(normalized) ? 'rtl' : 'ltr'
}

export function applyLanguageToDocument(language) {
  const normalized = normalizeLanguage(language)
  document.documentElement.lang = normalized
  document.documentElement.dir = getDirection(normalized)
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    ns: ['common'],
    resources: {
      en: { common: enCommon },
      he: { common: heCommon },
      ar: { common: arCommon },
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

i18n.on('languageChanged', applyLanguageToDocument)
applyLanguageToDocument(i18n.resolvedLanguage || i18n.language || 'en')

export default i18n
