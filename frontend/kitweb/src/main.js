import { ViteSSG } from 'vite-ssg'
import App from './App.vue'
import { routes } from './router'
import i18n from './i18n'
import VueVirtualScroller from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

const supportedLocales = ['en', 'th', 'zh', 'ja']

export function includedRoutes(paths = []) {
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

  return Array.from(new Set(expanded))
}

export const createApp = ViteSSG(
  App,
  { routes },
  async ({ app, router, isClient }) => {
    app.use(router)
    app.use(i18n)
    app.use(VueVirtualScroller)

    app.config.globalProperties.$isDev = import.meta.env.DEV;

    if (isClient) {
      await import('ionicons')
    }

    app.directive('reveal', {
      mounted(el) {
        el.classList.add('reveal-hidden'); // Initial state
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target); // Runs only once
            }
          });
        }, { threshold: 0.1 });
        observer.observe(el);
      }
    });
  }
)






