<script setup>
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from './i18n'
import { authStore } from './stores/authStore'
import { api, getUtilsUrl } from './services/api';
import { localizedRoute, codeToPath, pathToCode } from './utils/localeRoutes'
import { catalogGroups } from './utils/catalogCategories'
import { absoluteUrl } from './utils/siteUrl'

const SEO_LOCALES = ['en', 'th', 'zh', 'ja']

const isDev = import.meta.env.DEV

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()

const pageTitleMap = {
  home: 'home.heroTitle',
  catalog: 'categories.title',
  'category-products': 'categories.title',
  contactus: 'contact.title',
  login: 'admin.loginTitle',
  event: 'events.heroTagline',
  partners: 'partner.heroTitle',
  orderpage: 'order.title',
  faq: 'faq.title',
  admin: 'admin.loginTitle'
}

const pageDescriptionMap = {
  home: 'home.heroSubtitle',
  catalog: 'home.heroSubtitle',
  'category-products': 'home.heroSubtitle',
  contactus: 'contact.subtitle',
  login: 'auth.signInSubtitle',
  event: 'events.heroSubtitle',
  partners: 'partner.heroSubtitle',
  orderpage: 'order.heroSubtitle',
  admin: 'auth.signInSubtitle'
}

const contactInfo = {
    email:'kitsampeng@gmail.com',
    lineUrl: 'https://line.me/ti/p/@oar4837p',
    lineQrThumb: 'LineOfficialQR-large.webp',
    lineId: '@oar4837p',
    facebookUrl: 'https://www.facebook.com/kit.sampeng',
    facebookText: '@kit.sampeng',
    instagramUrl: 'https://www.instagram.com/kit_craft376/',
    instagramText: '@kit_craft376',
    wechatId: 'wxid_y3hc2qgld49112',
    wechatQrThumb: 'WeChatQR-large.webp'
};

const routeLang = computed(() => route.params.lang || 'en')
const routeName = computed(() => router.currentRoute.value.name || 'home')
const pathWithoutLang = computed(() => {
  const full = router.currentRoute.value.fullPath || '/'
  const cleaned = full.replace(/^\/(en|th|zh|ja)/, '')
  return cleaned || '/'
})
const siteTitle = computed(() => routeLang.value === 'th' ? 'กิจเจริญ' : 'Kitcharoen')

function localizedAbsoluteUrl(lang) {
  const suffix = pathWithoutLang.value === '/' ? '' : pathWithoutLang.value
  return absoluteUrl(`/${lang}${suffix}`)
}

const pageSeoTitle = computed(() => {
  const lang = routeLang.value
  const route = routeName.value

  if (lang === 'th') {
  switch (route) {
    case 'home':
      return 'ไหมพรม อุปกรณ์งานฝีมือ ขายส่งสำเพ็ง ราคาถูก | กิจเจริญ สำเพ็ง';
    case 'contactus':
      return 'ติดต่อสอบถาม สั่งซื้อไหมพรม ริบบิ้น ลูกปัด | กิจเจริญ สำเพ็ง';
    case 'event':
      return 'เวิร์คช็อป DIY และกิจกรรมงานฝีมือ | กิจเจริญ สำเพ็ง';
    case 'partners':
      return 'ตัวแทนจำหน่ายและลูกค้าขายส่ง อุปกรณ์งานฝีมือ | กิจเจริญ สำเพ็ง';
    case 'catalog':
      return 'แคตตาล็อกสินค้า ไหมพรม ริบบิ้น ลูกปัด ขายส่ง | กิจเจริญ สำเพ็ง';
    case 'category-products':
      // Ideally, you'd want to inject the category name here dynamically
      return 'รวมสินค้าไหมพรมและอุปกรณ์งานฝีมือคุณภาพ | กิจเจริญ สำเพ็ง';
    case 'login':
      return 'เข้าสู่ระบบสมาชิก | กิจเจริญ สำเพ็ง';
    case 'orderpage':
      return 'เช็ครายการสั่งซื้อ ไหมพรมและอุปกรณ์ DIY | กิจเจริญ สำเพ็ง';
    default:
      return `${t(pageTitleMap[route] || 'home.heroTitle')} | ${siteTitle.value}`;
  } 
}
switch (route) {
  case 'home':
    return 'Wholesale Yarn & Craft Supplies Sampeng | Kitcharoen';
  case 'contactus':
    return 'Contact Us for Wholesale Yarn, Ribbons & Beads | Kitcharoen';
  case 'event':
    return 'DIY Craft Workshops & Events in Bangkok | Kitcharoen';
  case 'partners':
    return 'Our Partners & Wholesale Craft Supply Clients | Kitcharoen';
  case 'catalog':
    return 'Wholesale Catalog: Yarn, Ribbons & Sewing Supplies | Kitcharoen';
  case 'category-products':
    return 'Premium Yarn, Beads & Craft Accessories | Kitcharoen';
  case 'login':
    return 'Customer Login | Kitcharoen';
  case 'orderpage':
    return 'Your Orders - Craft & Sewing Supplies | Kitcharoen';
  default:
    return `${t(pageTitleMap[route] || 'home.heroTitle')} | ${siteTitle.value}`;
}
})

const pageTitleKey = computed(() => pageTitleMap[routeName.value] || 'home.heroTitle')
const pageDescriptionKey = computed(() => pageDescriptionMap[routeName.value] || 'home.heroSubtitle')

useHead(() => {
  const isCategoryProductsRoute = routeName.value === 'category-products'
  const title = pageSeoTitle.value || `${t(pageTitleKey.value) || t('home.heroTitle')} | ${siteTitle.value}`
  const description = t(pageDescriptionKey.value) || t('home.heroSubtitle')

  const canonicalHref = absoluteUrl(router.currentRoute.value.fullPath || '/')
  const links = [
    ...SEO_LOCALES.map((lang) => ({
      rel: 'alternate',
      hreflang: lang,
      href: localizedAbsoluteUrl(lang),
      key: `hreflang-${lang}`
    })),
    {
      rel: 'alternate',
      hreflang: 'x-default',
      href: localizedAbsoluteUrl('en'),
      key: 'hreflang-x-default'
    },
    {
      rel: 'canonical',
      href: canonicalHref,
      key: 'canonical'
    }
  ]

  return {
    ...(isCategoryProductsRoute ? {} : { title }),
    htmlAttrs: {
      lang: routeLang.value || 'en'
    },
    meta: isCategoryProductsRoute
      ? []
      : [{ name: 'description', content: description, key: 'description' }],
    link: links
  }
})

const currentLanguage = ref(pathToCode[route.params?.lang] || 'EN')
const currentLang = computed(() => {
  const lang = route.params?.lang
  if (typeof lang === 'string' && lang.length === 2) return lang
  return codeToPath[currentLanguage.value] || 'en'
})
const showLanguageMenu = ref(false)

watch(
  () => route.params.lang,
  (newLang) => {
    if (newLang && pathToCode[newLang]) {
      currentLanguage.value = pathToCode[newLang]
    }
  },
  { immediate: true },
)
const showLogoutConfirm = ref(false)

const languages = [
  { code: 'EN', label: 'English', flag: 'EN' },
  { code: 'TH', label: 'ไทย', flag: 'TH' },
  { code: 'CN', label: '中文', flag: 'CN' },
  { code: 'JP', label: '日本語', flag: 'JP' }
]

const changeLanguage = (langCode) => {
  currentLanguage.value = langCode
  const targetLang = codeToPath[langCode] || 'en'
  setLocale(langCode)
  showLanguageMenu.value = false
  router.push({
    name: route.name || 'home',
    params: {
      ...route.params,
      lang: targetLang
    }
  }).catch(() => {})
}

const toggleLanguageMenu = () => {
  showLanguageMenu.value = !showLanguageMenu.value
}

const handleLogout = () => {
  showLogoutConfirm.value = true
}

const confirmLogout = () => {
  showLogoutConfirm.value = false
  authStore.logout()
  router.push({ name: 'home', params: { lang: currentLang.value } }).catch(() => {})
}

const cancelLogout = () => {
  showLogoutConfirm.value = false
}

// Watch for language changes to apply specific fonts
watch(currentLanguage, (newLang) => {
  if (typeof document === 'undefined') return;

  if (newLang === 'TH') {
    document.body.classList.add('thai-font')
  } else if (newLang === 'CN') {
    document.body.classList.add('chinese-font')
  } else {
    document.body.classList.remove('thai-font')
    document.body.classList.remove('chinese-font')
  }
}, { immediate: true })

// Also watch the i18n locale (e.g. 'th', 'en') to ensure fonts apply
watch(locale, (newLocale) => {
  if (typeof document === 'undefined') return;

  if (newLocale === 'th') {
    document.body.classList.add('thai-font')
  } else if (newLocale === 'zh') {
    document.body.classList.add('chinese-font')
  } else {
    document.body.classList.remove('thai-font')
    document.body.classList.remove('chinese-font')
  }
}, { immediate: true })

const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

// ── Dropdown menus ────────────────────────────
const showCatalogMenu = ref(false)
const showCompanyMenu = ref(false)
let catalogTimer = null
let companyTimer = null

// Shared with the catalog sidebar so the dropdown stays in sync with the
// display groups (incl. merged groups like Thread & String / Scissors & Knives).
const navCategories = catalogGroups

const openCatalog  = () => { clearTimeout(catalogTimer); showCatalogMenu.value = true }
const closeCatalog = () => { catalogTimer = setTimeout(() => { showCatalogMenu.value = false }, 130) }
const toggleCatalog = () => { showCatalogMenu.value = !showCatalogMenu.value; showCompanyMenu.value = false }

const openCompany  = () => { clearTimeout(companyTimer); showCompanyMenu.value = true }
const closeCompany = () => { companyTimer = setTimeout(() => { showCompanyMenu.value = false }, 130) }
const toggleCompany = () => { showCompanyMenu.value = !showCompanyMenu.value; showCatalogMenu.value = false }

const closeAllMenus = () => { showCatalogMenu.value = false; showCompanyMenu.value = false }
const isCompanyActive = computed(() => ['partners', 'faq'].includes(String(route.name)))

onMounted(() => {
  document.addEventListener('click', closeAllMenus)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAllMenus)
})
</script>

<template>
  <div>
    <div class="NavBar">
      <!-- Left: Logo -->
      <div class="nav-left">
        <router-link :to="{ name: 'home', params: { lang: currentLang } }"  @click="scrollToTop">
          <img :src="getUtilsUrl('kitWeb_logo1-large.webp')+'?v2'" fetchpriority="high" alt="KitWeb Logo" class="main-logo">
        </router-link>
      </div>

      <!-- Center: Links -->
      <div class="nav-center" style="justify-content: center; align-items: center; text-align: center;">

        <!-- Home -->
        <router-link :to="{ name: 'home', params: { lang: currentLang } }" @click="scrollToTop; closeAllMenus()" class="nav-link" active-class="active" exact-active-class="active">{{ $t('nav.home') }}</router-link>

        <!-- Catalog dropdown -->
        <div class="nav-item-wrap" @mouseenter="openCatalog" @mouseleave="closeCatalog" @click.stop>
          <router-link
            :to="{ name: 'catalog', params: { lang: currentLang, category: 'all' } }"
            class="nav-link nav-link-dd"
            active-class="active"
            @click="scrollToTop; closeAllMenus()"
          >
            {{ $t('nav.products') }}
            <svg class="dd-chevron" :class="{ open: showCatalogMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </router-link>
          <span class="dd-trigger-area" @click="toggleCatalog" aria-hidden="true"></span>
          <Transition name="nav-dd">
            <div v-if="showCatalogMenu" class="dd-menu catalog-dd" @click.stop>
              <div class="catalog-dd-grid">
                <router-link
                  v-for="cat in navCategories"
                  :key="cat.key"
                  :to="{ name: 'catalog', params: { lang: currentLang, category: cat.key } }"
                  class="dd-cat-item"
                  @click="scrollToTop; closeAllMenus()"
                >
                  <ion-icon v-if="cat.svgSrc" :src="cat.svgSrc"></ion-icon>
                  <ion-icon v-else-if="cat.icon" :name="cat.icon"></ion-icon>
                  <span style="text-align:left">{{ $t(`categories.${cat.key}`) }}</span>
                </router-link>
              </div>
              <router-link
                :to="{ name: 'catalog', params: { lang: currentLang } }"
                class="dd-footer-link"
                @click="scrollToTop; closeAllMenus()"
              >
                {{ $t('nav.viewAll') || 'View All Products' }}
                <ion-icon name="arrow-forward-outline"></ion-icon>
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- Events -->
        <router-link :to="{ name: 'event', params: { lang: currentLang } }" @click="scrollToTop; closeAllMenus()" class="nav-link" active-class="active" exact-active-class="active">{{ $t('nav.events') }}</router-link>

        <!-- B2B Catalog -->
        <router-link :to="{ name: 'institutional-catalog', params: { lang: currentLang } }" @click="scrollToTop; closeAllMenus()" class="nav-link" active-class="active" exact-active-class="active">{{ $t('nav.b2bCatalog') }}</router-link>

        <!-- Company dropdown -->
        <div class="nav-item-wrap" @mouseenter="openCompany" @mouseleave="closeCompany" @click.stop>
          <button
            class="nav-link nav-link-dd nav-link-btn"
            :class="{ active: isCompanyActive }"
            @click="toggleCompany"
          >
            {{ $t('nav.company') || 'Company' }}
            <svg class="dd-chevron" :class="{ open: showCompanyMenu }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          <Transition name="nav-dd">
            <div v-if="showCompanyMenu" class="dd-menu company-dd" @click.stop>
              <router-link
                :to="{ name: 'partners', params: { lang: currentLang } }"
                class="dd-page-link"
                active-class="dd-page-link-active"
                @click="scrollToTop; closeAllMenus()"
              >
                <span class="dd-page-icon"><ion-icon name="people-outline"></ion-icon></span>
                <span class="dd-page-text">
                  <span class="dd-page-title">{{ $t('nav.partners') }}</span>
                  <span class="dd-page-desc">{{ $t('nav.partnersDesc') || 'Our wholesale clients & partners' }}</span>
                </span>
              </router-link>
              <router-link
                :to="{ name: 'faq', params: { lang: currentLang } }"
                class="dd-page-link"
                active-class="dd-page-link-active"
                @click="scrollToTop; closeAllMenus()"
              >
                <span class="dd-page-icon"><ion-icon name="help-circle-outline"></ion-icon></span>
                <span class="dd-page-text">
                  <span class="dd-page-title">{{ $t('nav.faq') || 'FAQ' }}</span>
                  <span class="dd-page-desc">{{ $t('nav.faqDesc') || 'Common questions answered' }}</span>
                </span>
              </router-link>
            </div>
          </Transition>
        </div>

        <!-- Contact Us -->
        <router-link :to="{ name: 'contactus', params: { lang: currentLang } }" @click="scrollToTop; closeAllMenus()" class="nav-link" active-class="active" exact-active-class="active">{{ $t('nav.contactUs') }}</router-link>

      </div>

      <!-- Right: Actions -->
      <div class="nav-right" style="justify-content: center; align-items: center; text-align: center;">

        <div class="action-icons">
          <div class="lang-globe" @click="toggleLanguageMenu">
            <ion-icon name="globe-outline"></ion-icon>
            <span class="current-lang-code">{{ currentLanguage }}</span>

            <!-- Language Dropdown -->
            <transition name="dropdown-fade">
              <div v-if="showLanguageMenu" class="lang-popup">
                <div v-for="lang in languages" :key="lang.code" class="lang-item"
                  :class="{ active: currentLanguage === lang.code }" @click.stop="changeLanguage(lang.code)">
                  <span class="lang-flag">{{ lang.flag }}</span>
                  {{ lang.label }}
                </div>
              </div>
            </transition>
          </div>
          <!-- <template v-if="isDev"> -->
            <router-link v-if="authStore.isAuthenticated" :to="{ name: 'orderpage', params: { lang: currentLang } }" @click="scrollToTop" class="order-capsule">
              {{ $t('nav.startOrder') }}
            </router-link>

            <router-link v-if="!authStore.isAuthenticated" :to="{ name: 'login', params: { lang: currentLang } }" @click="scrollToTop" class="login-capsule">
              {{ $t('nav.login') }}
            </router-link>
            <div v-else class="logged-in-actions">
              <router-link :to="{ name: 'orderpage', params: { lang: currentLang } }" @click="scrollToTop" class="login-capsule account-link">
                <ion-icon name="person-circle-outline"></ion-icon>
                <span>{{ authStore.user?.businessName || authStore.user?.ownerName || $t('nav.account') }}</span>
              </router-link>
              <button class="logout-btn-nav" @click="handleLogout" :title="$t('order.logout')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
              </button>
            </div>
          <!-- </template> -->
        </div>
      </div>
    </div>

    <RouterView />

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-column">
          <h3>{{ $t('footer.companyName') }}</h3>
          <p>{{ $t('footer.companyDesc') }}</p>
        </div>
        <div class="footer-column">
  <h4>{{ $t('footer.quickLinks') }}</h4>
  <ul>
    <li>
      <router-link :to="{ name: 'home', params: { lang: currentLang } }" @click="scrollToTop">
        {{ $t('footer.aboutUs') }}
      </router-link>
    </li>
    <li>
      <router-link :to="{ name: 'catalog', params: { lang: currentLang } }" @click="scrollToTop">
        {{ $t('footer.products') }}
      </router-link>
    </li>
    <li>
      <router-link :to="{ name: 'contactus', params: { lang: currentLang } }" @click="scrollToTop">
        {{ $t('footer.contact') }}
      </router-link>
    </li>
    <li>
      <!-- <router-link :to="{ name: 'faq', params: { lang: currentLang } }">
        {{ $t('footer.faq') }}
      </router-link> -->
    </li>
  </ul>
</div>
        <div class="footer-column">
          <h4>{{ $t('footer.contactInfo') }}</h4>
          <ul>
            <li>📍 376 Wanich 1 Chakkrawat</li>
            <li>📍 Samphantawong Bangkok</li>
            <li>📞 +66 (0)2-221-1414, (0)2-622-6573</li>
            <li>✉️ kitsampeng@gmail.com</li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>{{ $t('footer.followUs') }}</h4>
          <div class="social-links">
 <!-- Facebook -->
<a :href="contactInfo.facebookUrl" class="social-icon facebook" aria-label="Facebook">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
</a>

<!-- Instagram -->
<a :href="contactInfo.instagramUrl" class="social-icon instagram" aria-label="Instagram">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5"/>
    <circle cx="12" cy="12" r="4"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
  </svg>
</a>

<!-- WeChat -->
<a :href="contactInfo.wechatUrl" class="social-icon wechat" aria-label="WeChat">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M9.5 4C5.36 4 2 6.92 2 10.5c0 1.9.93 3.6 2.4 4.8l-.65 2 2.35-1.15c.76.21 1.56.35 2.4.35.18 0 .36 0 .54-.02A5.3 5.3 0 0 1 9 15c0-2.97 2.69-5.38 6-5.38.2 0 .4.01.6.03C15.07 7.14 12.53 4 9.5 4zm-2 4.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm4 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zM15 11c-2.76 0-5 1.79-5 4s2.24 4 5 4c.6 0 1.17-.09 1.7-.25L19 20l-.78-2.34C19.32 16.8 20 15.46 20 15c0-2.21-2.24-4-5-4zm-1.5 2.75a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5zm3 0a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5z"/>
  </svg>
</a>

<!-- LINE Official -->
<a :href="contactInfo.lineUrl" class="social-icon line-official" aria-label="LINE Official">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
    <path d="M12 2C6.48 2 2 5.86 2 10.6c0 3.1 1.87 5.83 4.7 7.43L6 21l3.27-1.7c.87.24 1.78.37 2.73.37 5.52 0 10-3.86 10-8.6S17.52 2 12 2zm-3.5 10.5H7v-5h1v4h.5a.5.5 0 0 1 0 1zm2 0a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0v5zm4.5 0h-2.5a.5.5 0 0 1-.5-.5v-5a.5.5 0 0 1 1 0V12H15a.5.5 0 0 1 0 1zm3.5-3.5h-1.5v.75H18a.5.5 0 0 1 0 1h-1.5v.75H18a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1z"/>
  </svg>
</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>{{ $t('footer.copyright') }}</p>
      </div>
    </footer>

    <!-- Logout Confirmation Popup -->
    <transition name="fade">
      <div v-if="showLogoutConfirm" class="confirm-overlay" @click.self="cancelLogout">
        <div class="confirm-card">
          <div class="confirm-icon logout-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" y1="12" x2="9" y2="12"></line>
    </svg>
          </div>
          <h3>{{ $t('auth.logoutConfirmTitle') }}</h3>
          <p>{{ $t('auth.logoutConfirmMessage') }}</p>
          <div class="confirm-actions">
            <button class="cancel-btn" @click="cancelLogout">{{ $t('auth.cancelLogoutBtn') }}</button>
            <button class="logout-confirm-btn" @click="confirmLogout">{{ $t('auth.logoutConfirmBtn') }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@100;200;300;400;500;600;700&display=swap');

html, body {
  width: 100%;
  overflow-x: clip;
  margin: 0;
  padding: 0;
}

* {
  font-family: 'ZCOOL XiaoWei', serif !important;
}

*, *::before, *::after {
  box-sizing: border-box;
}

/* Override font for Thai language */
body.thai-font * {
  font-family: 'Kanit', sans-serif !important;
  /* font-family: 'Prompt', sans-serif !important; */
}

body.chinese-font * {
  font-family: 'Noto Sans SC', sans-serif !important;
}

body {
  line-height: 1.6;
}
</style>

<style scoped>
.no-style {
  text-decoration: none;
  color: inherit;
}


.NavBar {
  position: sticky;
  top: 0;
  left: 0;
  height: 80px;
  width: 100%; /* Ensures it stretches edge-to-edge */
  background: linear-gradient(
    135deg, 
    rgba(243, 231, 215, 0.75), 
    rgba(241, 225, 203, 0.75), 
    rgba(243, 231, 215, 0.75)
  );
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px); /* Safari support */

  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5%;
  z-index: 1000;
}
/* Left: Logo */
.nav-left {
  display: flex;
  align-items: center;
}

.main-logo {
  height: 50px;
  cursor: pointer;
}

/* Center: Links */
.nav-center {
  display: flex;
  gap: 30px;
}

.nav-link {
  text-decoration: none;
  color: #5d4037;
  /* Dark brownish from image */
  font-size: 16px;
  font-weight: 600;
  position: relative;
  padding: 5px 0;
  transition: color 0.3s;
}

.nav-link:hover {
  color: #DD876E;
  /* Teal */
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #DD876E;
  /* Teal underline */
}

/* ── Dropdown Nav Items ──────────────────────── */
.nav-item-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.nav-link-dd {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.dd-trigger-area {
  position: absolute;
  inset: 0;
  cursor: pointer;
  display: none;
}

.dd-chevron {
  width: 12px;
  height: 12px;
  margin-left: 1px;
  transition: transform 0.22s ease;
  flex-shrink: 0;
}

.dd-chevron.open {
  transform: rotate(180deg);
}

/* ── Dropdown Panel ──────────────────────────── */
.dd-menu {
  position: absolute;
  top: calc(100% + 14px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(60, 35, 15, 0.14);
  border: 1px solid rgba(220, 195, 165, 0.45);
  z-index: 300;
  overflow: hidden;
}

/* Catalog dropdown */
.catalog-dd {
  width: 300px;
}

.catalog-dd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 10px;
  gap: 2px;
}

.dd-cat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-radius: 8px;
  text-decoration: none;
  color: #5d4037;
  font-size: 13px;
  font-weight: 500;
  transition: background 0.14s;
}

.dd-cat-item:hover {
  background: #FDF3E6;
  color: #604539;
}

.dd-cat-icon {
  font-size: 15px;
  color: #DD876E;
  flex-shrink: 0;
}

.dd-footer-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px;
  border-top: 1px solid #f2e8de;
  text-decoration: none;
  font-size: 12px;
  font-weight: 700;
  color: #DD876E;
  letter-spacing: 0.3px;
  transition: background 0.14s;
}

.dd-footer-link:hover {
  background: #FDF3E6;
}

/* Company dropdown */
.company-dd {
  width: 250px;
  padding: 8px;
}

.dd-page-link {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #5d4037;
  transition: background 0.14s;
}

.dd-page-link:hover,
.dd-page-link-active {
  background: #FDF3E6;
}

.dd-page-icon {
  width: 36px;
  height: 36px;
  background: #FDF3E6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dd-page-link-active .dd-page-icon {
  background: #DD876E;
  color: white;
}

.dd-page-icon ion-icon {
  font-size: 18px;
  color: #DD876E;
}

.dd-page-link-active .dd-page-icon ion-icon {
  color: white;
}

.dd-page-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 2px;
  text-align: left;
}

.dd-page-title {
  font-size: 13.5px;
  font-weight: 600;
  color: #3d2b1f;
  display: block;
  text-align: left;
}

.dd-page-desc {
  font-size: 11.5px;
  color: #9e8272;
  font-weight: 400;
  display: block;
}

/* Right: Search & Actions */
.nav-right {
  display: flex;
  align-items: center;
  gap: 25px;
}

.action-icons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.lang-globe {
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.lang-globe ion-icon {
  font-size: 24px;
  color: #5d4037;
}

.current-lang-code {
  font-size: 12px;
  font-weight: 700;
  color: #5d4037;
  margin-left: 4px;
}

.lang-popup {
  position: absolute;
  top: 45px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 140px;
  z-index: 100;
  border: 1px solid #f0f0f0;
}

.lang-item {
  padding: 10px 14px;
  font-size: 14px;
  color: #2d3436;
  border-radius: 8px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 10px;
}

.lang-item:hover {
  background: #f8f3ee;
  color: #8b6f47;
}

.lang-item.active {
  background: #008080;
  color: white;
}

.lang-flag {
  font-size: 10px;
  font-weight: 800;
  background: #f0f2f5;
  color: #3D2B1F;
  padding: 3px 6px;
  border-radius: 4px;
  min-width: 32px;
  text-align: center;
}

.lang-item.active .lang-flag {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.login-capsule {
  background: linear-gradient(135deg, #DD876E, #e6957c);
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  text-decoration: none;
  padding: 10px 28px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.2s, background 0.3s;
}

.order-capsule {
  background-color: white;
  color: #DD876E;
  text-decoration: none;
  padding: 10px 16px;
  border-radius: 1rem;
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.2s, background 0.3s;
  border: 2px solid #DD876E;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.login-capsule:hover,
.order-capsule:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.login-capsule:hover {
  background-color: #DD876E;
}

.order-capsule:hover {
  background-color: #f8f8f8;
}

.account-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-link ion-icon {
  font-size: 20px;
}

.logged-in-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logout-btn-nav {
  background: transparent;
  border: 1px solid #dcdcdc;
  color: #5d4037;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.logout-btn-nav:hover {
  background-color: #fff;
  border-color: #008080;
  color: #008080;
  transform: translateY(-1px);
}

.logout-btn-nav ion-icon {
  font-size: 20px;
}

/* ===== FOOTER ===== */
.footer {
  background: linear-gradient(135deg, #2d2d2d, #1a1a1a);
  color: white;
  padding: 60px 5% 20px 5%;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 40px;
  margin-bottom: 40px;
}

.footer-column h3 {
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #b89968;
}

.footer-column h4 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
}

.footer-column p {
  font-size: 14px;
  line-height: 1.6;
  opacity: 0.8;
  margin: 0;
}

.footer-column ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-column ul li {
  margin-bottom: 10px;
  font-size: 14px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.footer-column ul li:hover {
  opacity: 1;
}

.footer-column a {
  color: white;
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer-column a:hover {
  color: #b89968;
}

.social-links {
  display: flex;
  gap: 15px;
}

.social-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  font-size: 20px;
  transition: all 0.3s ease;
}

.social-icon:hover {
  background: #b89968;
  transform: translateY(-3px);
}

.footer-bottom {
  text-align: center;
  padding-top: 30px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.footer-bottom p {
  margin: 0;
  font-size: 14px;
  opacity: 0.6;
}

/* Responsive Design */
@media (max-width: 1280px) {
  .NavBar {
    padding: 0 3%;
  }

  .nav-center {
    gap: 20px;
  }

  .nav-right {
    gap: 15px;
  }
}

@media (max-width: 1100px) {
  .nav-center {
    gap: 15px;
  }

  .nav-link {
    font-size: 13px;
  }

  .action-icons {
    gap: 10px;
  }

  .login-capsule,
  .order-capsule {
    padding: 10px 20px;
    font-size: 14px;
  }
}

@media (max-width: 992px) {
  .NavBar {
    height: auto;
    padding: 15px 3%;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.1rem;
  }

  .nav-left {
    width: 100%;
    justify-content: center;
    height: 50px;
  }
  .main-logo {
    height: 40px;
  }

  .nav-center {
    width: 100%;
    justify-content: center;
    order: 3;
    gap: 25px;
  }

  .nav-right {
    width: 100%;
    justify-content: center;
    order: 2;
  }
}

@media (max-width: 640px) {
  .nav-center {
    gap: 15px;
  }

  .nav-link {
    font-size: 13px;
  }

  .action-icons {
    gap: 10px;
  }

  .login-capsule,
  .order-capsule {
    padding: 8px 16px;
    font-size: 12px;
  }
}
</style>
<style>
/* Base state for anything you want to reveal */
.reveal-hidden {
  opacity: 0;
  transform: translateY(20px);
  will-change: transform, opacity;
  /* Optimizes performance */
}

/* The trigger class added by JavaScript */
.visible {
  animation: fadeInUp 0.8s ease forwards;
  animation-delay: 0.1s;
}

.delay2 {
  animation-delay: 0.2s;
}

.delay4 {
  animation-delay: 0.4s;
}

.delay6 {
  animation-delay: 0.6s;
}

@keyframes fadeInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Language dropdown animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.3s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* Nav dropdown animation */
.nav-dd-enter-active,
.nav-dd-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.nav-dd-enter-from,
.nav-dd-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* Confirmation Popup Styles */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.confirm-card {
  background: white;
  padding: 40px;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  animation: modalPop 0.3s ease-out;
}

@keyframes modalPop {
  from {
    transform: scale(0.9);
    opacity: 0;
  }

  to {
    transform: scale(1);
    opacity: 1;
  }
}

.confirm-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  font-size: 32px;
}

.logout-icon {
  background-color: #FEF2F2;
  color: #DC2626;
}

.confirm-card h3 {
  margin: 0 0 12px 0;
  font-size: 22px;
  color: #3D2B1F;
}

.confirm-card p {
  color: #666;
  font-size: 15px;
  line-height: 1.5;
  margin-bottom: 30px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-actions button {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.confirm-actions .cancel-btn {
  background: #F3F0EB;
  color: #5d4037;
}

.confirm-actions .cancel-btn:hover {
  background: #E5E2DD;
}

.confirm-actions .logout-confirm-btn {
  background: #DC2626;
  color: white;
}

.confirm-actions .logout-confirm-btn:hover {
  background: #B91C1C;
  transform: translateY(-1px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
