export const codeToPath = {
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

export function getDefaultLang() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const browserLocale = window.localStorage.getItem('locale')
    return codeToPath[browserLocale || 'EN'] || 'en'
  }
  return 'en'
}

/** SSR-safe fallback when route.params.lang is absent */
export const defaultLang = 'en'

export function getRouteLang(route) {
  return route?.params?.lang || getDefaultLang()
}

export function localizedRoute(route, name, params = {}) {
  return {
    name,
    params: {
      ...route.params,
      lang: getRouteLang(route),
      ...params,
    },
  }
}
