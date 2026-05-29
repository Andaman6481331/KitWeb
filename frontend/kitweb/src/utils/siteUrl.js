export const SITE_ORIGIN = 'https://kitcharoensampeng.com'

/**
 * Build an absolute URL using Cloudflare Pages trailing-slash rules:
 * - site root keeps a trailing slash
 * - all other paths are served without a trailing slash
 */
export function absoluteUrl(path = '/') {
  if (!path || path === '/') {
    return `${SITE_ORIGIN}/`
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  const withoutTrailingSlash = normalized.replace(/\/+$/, '') || '/'

  if (withoutTrailingSlash === '/') {
    return `${SITE_ORIGIN}/`
  }

  return `${SITE_ORIGIN}${withoutTrailingSlash}`
}

export function normalizeSitePath(path = '/') {
  if (!path || path === '/') {
    return '/'
  }

  const normalized = path.startsWith('/') ? path : `/${path}`
  return normalized.replace(/\/+$/, '') || '/'
}
