import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import th from './locales/th.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'

export const SUPPORTED_LOCALES = ['en', 'th', 'zh', 'ja']

export const localeMap = {
  EN: 'en',
  TH: 'th',
  CN: 'zh',
  JP: 'ja',
}

export const pathToCode = {
  en: 'EN',
  th: 'TH',
  zh: 'CN',
  ja: 'JP',
}

export function normalizeLocale(input) {
  if (!input) return 'en'
  const lower = String(input).toLowerCase()
  if (SUPPORTED_LOCALES.includes(lower)) return lower
  const fromCode = localeMap[String(input).toUpperCase()]
  return fromCode || 'en'
}

export function localeFromPath(path = '/') {
  const segment = path.replace(/^\//, '').split('/')[0]
  return normalizeLocale(segment)
}

export function createLanguageEngine(initialLocale = 'en') {
  return createI18n({
    legacy: false,
    locale: normalizeLocale(initialLocale),
    fallbackLocale: 'en',
    messages: { en, th, zh, ja },
  })
}

let activeI18n = null

export function registerI18n(i18n) {
  activeI18n = i18n
}

export function setLocale(langCode, i18n = activeI18n) {
  if (!i18n) return
  const locale = normalizeLocale(localeMap[langCode] || langCode)
  i18n.global.locale.value = locale
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('locale', pathToCode[locale] || 'EN')
  }
}
