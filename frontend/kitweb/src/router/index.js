import { RouterView } from 'vue-router'
import Home from '../views/HomeView.vue'
import Catalog from '../views/CatalogPage.vue'
import OrderPage from '../views/OrderPage.vue'
import ContactUsPage from '../views/ContactUsPage.vue'
import Login from '../views/Login.vue'
import EventPage from '../views/EventPage.vue'
import PartnerPage from '../views/PartnerPage.vue'
import AdminDashboard from '../views/AdminDashboard.vue'
import FaqPage from '../views/FaqPage.vue'

import { authStore } from '../stores/authStore'
import { pathToCode } from '../i18n'
import { getDefaultLang } from '../utils/localeRoutes'

export const routes = [
  { path: '/', redirect: () => `/${getDefaultLang()}` },
  { path: '/line-callback', name: 'line-callback', component: () => import('../views/LineCallbackPage.vue') },
  {
    path: '/:lang',
    component: RouterView,
    children: [
      { path: '', name: 'home', component: Home },
      { path: 'catalog/:category?/:productSlug?', name: 'catalog', component: Catalog },
      { path: 'institutional-catalog', name: 'institutional-catalog', component: () => import('../views/InstitutionalCatalogPage.vue') },
      { path: 'orderpage', name: 'orderpage', component: OrderPage },
      { path: 'ordertracking', name: 'ordertracking', component: () => import('../views/OrderTrackingPage.vue'), meta: { requiresAuth: true } },
      { path: 'about', name: 'about', component: () => import('../views/AboutPage.vue') },
      { path: 'project/:slug', name: 'project', component: () => import('../views/ProjectPage.vue') },
      { path: 'contactus', name: 'contactus', component: ContactUsPage },
      { path: 'login', name: 'login', component: Login },
      { path: 'event', name: 'event', component: EventPage },
      { path: 'partners', name: 'partners', component: PartnerPage },
      { path: 'faq', name: 'faq', component: FaqPage },
      { path: 'admin', name: 'admin', component: AdminDashboard, meta: { requiresAuth: true } },
      { path: 'sellcash', name: 'sellcash', component: () => import('../views/SellCashPage.vue') },
      { path: 'manageorders', name: 'manageorders', component: () => import('../views/ManageOrdersPage.vue') },
      { path: 'thank-you', name: 'thank-you', component: () => import('../views/ThankYouPage.vue') },
      { path: ':pathMatch(.*)*', redirect: (to) => `/${to.params.lang}` },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: (to) => `/${getDefaultLang()}${to.fullPath}`,
  },
]

// Set by the catalog sidebar right before it navigates to a new category, so the
// next navigation scrolls to the category bar instead of the top of the page.
// Navbar and all other navigation keep the default scroll-to-top.
export const scrollIntent = { toCategoryBar: false }

// Reset scroll on navigation. Without this, Vue Router leaves the scroll
// position where it was on the previous page, so a new page appears already
// scrolled down. Back/forward restores the saved position; in-page hash links
// scroll to their target (offset for the sticky navbar).
export function scrollBehavior(to, from, savedPosition) {
  if (scrollIntent.toCategoryBar) {
    scrollIntent.toCategoryBar = false
    return { el: '#category-bar', top: 90, behavior: 'smooth' }
  }
  if (savedPosition) return savedPosition
  if (to.hash) return { el: to.hash, top: 90, behavior: 'smooth' }
  return { top: 0 }
}

export function installRouterGuards(router, i18n) {
  router.beforeEach((to, from, next) => {
    const lang = to.params.lang
    const fallbackLang = getDefaultLang()

    if (!lang) {
      next()
      return
    }

    if (!pathToCode[lang]) {
      next({ path: `/${fallbackLang}` })
      return
    }

    i18n.global.locale.value = lang

    if (import.meta.env.SSR) {
      next()
      return
    }

    const isAuthenticated = authStore.isAuthenticated
    const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)

    if (requiresAuth && !isAuthenticated) {
      next({ path: `/${lang}/login` })
    } else if (to.name === 'login' && isAuthenticated) {
      next({ path: `/${lang}/orderpage` })
    } else {
      next()
    }
  })

  router.afterEach((to) => {
    if (typeof document === 'undefined') {
      return
    }

    if (to.name === 'category-products') {
      return
    }

    // Keep staff-only pages out of search indexes (global meta is "index, follow").
    const isPrivate = to.name === 'sellcash' || to.name === 'admin' || to.name === 'manageorders'
    let robotsMeta = document.querySelector('meta[name="robots"]')
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta')
      robotsMeta.setAttribute('name', 'robots')
      document.head.appendChild(robotsMeta)
    }
    robotsMeta.setAttribute('content', isPrivate ? 'noindex, nofollow' : 'index, follow')

    const isThai = to.path.startsWith('/th')
    const engTitle = 'Kitcharoen - Premium Yarn & Sewing Supplies'
    const thaiTitle = 'กิจเจริญ - ไหมพรมและอุปกรณ์เย็บปักถักร้อยเกรดพรีเมียม สำเพ็ง'

    const engDesc =
      "Kitcharoen craft and sewing supplies from Bangkok's Sampeng Market. Trusted materials, honest prices, and friendly service since 1984."
    const thaiDesc =
      'กิจเจริญ ร้านขายอุปกรณ์งานฝีมือแบบครอบครัวในตลาดสำเพ็ง กรุงเทพฯ ใกล้เยาวราช จำหน่ายไหมพรม คุณภาพสูง และอุปกรณ์ตัดเย็บครบวงจร ราคาเป็นกันเอง'

    document.title = isThai ? thaiTitle : engTitle
    document.documentElement.lang = isThai ? 'th' : 'en'

    let descriptionMeta = document.querySelector('meta[name="description"]')
    if (!descriptionMeta) {
      descriptionMeta = document.createElement('meta')
      descriptionMeta.setAttribute('name', 'description')
      document.head.appendChild(descriptionMeta)
    }
    descriptionMeta.setAttribute('content', isThai ? thaiDesc : engDesc)
  })
}
