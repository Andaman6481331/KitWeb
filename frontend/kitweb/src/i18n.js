import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import th from './locales/th.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'

// Get saved language from localStorage or default to 'EN'
const savedLocale = typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('locale') || 'EN' : 'EN'

// Map language codes to locale files
const localeMap = {
  'EN': 'en',
  'TH': 'th',
  'CN': 'zh',
  'JP': 'ja'
}

const i18n = createI18n({
  legacy: false, // Use Composition API mode
  locale: localeMap[savedLocale] || 'en',
  fallbackLocale: 'en',
  messages: {
    en,
    th,
    zh,
    ja
  }
})

// Helper function to change language and save to localStorage
export function setLocale(langCode) {
  const locale = localeMap[langCode] || 'en'
  i18n.global.locale.value = locale
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('locale', langCode)
  }
}

export default i18n
