export const codeToPath = {
  EN: 'en',
  TH: 'th',
  CN: 'zh',
  JP: 'ja'
};

export const pathToCode = {
  en: 'EN',
  th: 'TH',
  zh: 'CN',
  ja: 'JP'
};

const browserLocale = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('locale') : null;
export const defaultLang = codeToPath[browserLocale || 'EN'] || 'en';

export function getRouteLang(route) {
  return route?.params?.lang || defaultLang;
}

export function localizedRoute(route, name, params = {}) {
  return {
    name,
    params: {
      ...route.params,
      lang: getRouteLang(route),
      ...params
    }
  };
}
