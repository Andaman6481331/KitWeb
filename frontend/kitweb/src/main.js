import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes, scrollBehavior, installRouterGuards } from './router'
import { createLanguageEngine, registerI18n, localeFromPath } from './i18n'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

const supportedLocales = ['en', 'th', 'zh', 'ja']
const API_URL = 'https://hidden-water-ed9d.shop-backend-kitweb.workers.dev'

async function fetchCategorySlugs() {
  try {
    const response = await fetch(`${API_URL}/products`)
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }
    const products = await response.json()
    return [
      ...new Set(
        products
          .flatMap((p) => (p.categories?.length ? p.categories : p.category ? [p.category] : []))
          .filter(Boolean),
      ),
    ]
  } catch (error) {
    console.warn('[vite-ssg] Could not fetch categories for prerender routes:', error)
    return []
  }
}

// Product detail pages. One URL per product — the product's own category, which
// is what the grid links to, so a merged group ('threadString') never mints a
// second indexable address for the same item.
async function fetchProductPaths() {
  try {
    const response = await fetch(`${API_URL}/products`)
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status}`)
    }
    const products = await response.json()
    return products
      .filter((p) => p.slug && p.category)
      .map((p) => `${encodeURIComponent(p.category)}/${encodeURIComponent(p.slug)}`)
  } catch (error) {
    console.warn('[vite-ssg] Could not fetch products for prerender routes:', error)
    return []
  }
}

async function fetchProjectSlugs() {
  try {
    const response = await fetch(`${API_URL}/projects`)
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.status}`)
    }
    const projects = await response.json()
    return projects.map((p) => p.slug).filter(Boolean)
  } catch (error) {
    console.warn('[vite-ssg] Could not fetch projects for prerender routes:', error)
    return []
  }
}

export async function includedRoutes(paths = []) {
  const expanded = []

  for (const path of paths) {
    if (path.startsWith('/:lang')) {
      const suffix = path.replace('/:lang', '')
      if (suffix.includes(':') || suffix.includes('*')) {
        continue
      }
      supportedLocales.forEach((lang) => {
        expanded.push(`/${lang}${suffix}`)
      })
      continue
    }

    if (path.includes(':') || path.includes('*')) {
      continue
    }

    expanded.push(path)
  }

  const categories = await fetchCategorySlugs()
  for (const category of categories) {
    const categorySegment = encodeURIComponent(category)
    supportedLocales.forEach((lang) => {
      expanded.push(`/${lang}/catalog/${categorySegment}`)
    })
  }

  const productPaths = await fetchProductPaths()
  for (const path of productPaths) {
    supportedLocales.forEach((lang) => {
      expanded.push(`/${lang}/catalog/${path}`)
    })
  }

  // Editorial pages are the main thing search traffic can land on, so they get
  // prerendered per locale like categories do.
  const projectSlugs = await fetchProjectSlugs()
  for (const slug of projectSlugs) {
    const slugSegment = encodeURIComponent(slug)
    supportedLocales.forEach((lang) => {
      expanded.push(`/${lang}/project/${slugSegment}`)
    })
  }

  return Array.from(new Set(expanded))
}

export const createApp = ViteSSG(
  App,
  { routes, scrollBehavior },
  async ({ app, router, isClient, initialState, routePath }) => {
    const initialLocale = localeFromPath(routePath || router.currentRoute.value.fullPath || '/')
    const i18n = createLanguageEngine(initialLocale)

    // Note: vite-ssg installs the router itself (after this setup fn runs),
    // so we must NOT call app.use(router) here or the plugin is applied twice.
    app.use(i18n)

    if (isClient) {
      registerI18n(i18n)
    }

    if (import.meta.env.SSR) {
      initialState.locale = i18n.global.locale.value
    } else if (initialState.locale) {
      i18n.global.locale.value = initialState.locale
    }

    installRouterGuards(router, i18n)
    i18n.global.locale.value = localeFromPath(routePath || router.currentRoute.value.fullPath || '/')

    app.use(VueVirtualScroller)

    app.config.globalProperties.$isDev = import.meta.env.DEV

    if (isClient) {
      await import('ionicons')
    }

    app.directive('reveal', {
      mounted(el) {
        el.classList.add('reveal-hidden')
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('visible')
                observer.unobserve(entry.target)
              }
            })
          },
          { threshold: 0.1 },
        )
        observer.observe(el)
      },
    })
  },
)
