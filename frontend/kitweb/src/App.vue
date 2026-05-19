<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from './i18n'
import { authStore } from './stores/authStore'

const isDev = import.meta.env.DEV

const { t } = useI18n()
const router = useRouter()

// Get saved language from localStorage or default to 'EN'
const savedLang = localStorage.getItem('locale') || 'EN'
const currentLanguage = ref(savedLang)
const showLanguageMenu = ref(false)
const showLogoutConfirm = ref(false)

const languages = [
  { code: 'EN', label: 'English', flag: 'EN' },
  { code: 'TH', label: 'ไทย', flag: 'TH' },
  { code: 'CN', label: '中文', flag: 'CN' },
  { code: 'JP', label: '日本語', flag: 'JP' }
]

const changeLanguage = (langCode) => {
  currentLanguage.value = langCode
  setLocale(langCode)
  showLanguageMenu.value = false
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
  router.push('/')
}

const cancelLogout = () => {
  showLogoutConfirm.value = false
}

// Watch for language changes to apply specific fonts
watch(currentLanguage, (newLang) => {
  if (newLang === 'TH') {
    document.body.classList.add('thai-font')
  } else {
    document.body.classList.remove('thai-font')
  }
}, { immediate: true })
</script>

<template>
  <div>
    <div class="NavBar">
      <!-- Left: Logo -->
      <div class="nav-left">
        <router-link to="/">
          <img src="./assets/kitWeb_logo.png" alt="KitWeb Logo" class="main-logo">
        </router-link>
      </div>

      <!-- Center: Links -->
      <div class="nav-center" style="justify-content: center; align-items: center; text-align: center;">
        <router-link to="/" class="nav-link" active-class="active">{{ $t('nav.home') }}</router-link>
        <template v-if="isDev">
          <router-link to="/catalog" class="nav-link" active-class="active">{{ $t('nav.products') }}</router-link>
        </template>
        <router-link to="/event" class="nav-link" active-class="active">{{ $t('nav.events') }}</router-link>
        <router-link to="/partners" class="nav-link" active-class="active">{{ $t('nav.partners') }}</router-link>
        <router-link to="/contactus" class="nav-link" active-class="active">{{ $t('nav.contactUs') }}</router-link>
      </div>

      <!-- Right: Search & Actions -->
      <div class="nav-right" style="justify-content: center; align-items: center; text-align: center;">
        <div class="search-capsule">
          <ion-icon name="search-outline"></ion-icon>
          <input type="text" placeholder="Search materials...">
        </div>

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
          <template v-if="isDev">
            <router-link v-if="authStore.isAuthenticated" to="/orderpage" class="order-capsule">
              {{ $t('nav.startOrder') }}
            </router-link>

            <router-link v-if="!authStore.isAuthenticated" to="/login" class="login-capsule">
              {{ $t('nav.login') }}
            </router-link>
            <div v-else class="logged-in-actions">
              <router-link to="/orderpage" class="login-capsule account-link">
                <ion-icon name="person-circle-outline"></ion-icon>
                <span>{{ authStore.user?.businessName || authStore.user?.ownerName || $t('nav.account') }}</span>
              </router-link>
              <button class="logout-btn-nav" @click="handleLogout" :title="$t('order.logout')">
                <ion-icon name="log-out-outline"></ion-icon>
              </button>
            </div>
          </template>
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
            <li><a href="#">{{ $t('footer.aboutUs') }}</a></li>
            <li><a href="#">{{ $t('footer.products') }}</a></li>
            <li><a href="#">{{ $t('footer.contact') }}</a></li>
            <li><a href="#">{{ $t('footer.faq') }}</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>{{ $t('footer.contactInfo') }}</h4>
          <ul>
            <li>📍 376 Wanich 1 Chakkrawat</li>
            <li>📍 Samphantawong Bangkok</li>
            <li>📞 +66 (0)2-221-1414</li>
            <li>✉️ kitcharoen.sampeng@gmail.com</li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>{{ $t('footer.followUs') }}</h4>
          <div class="social-links">
            <a href="#" class="social-icon">📘</a>
            <a href="#" class="social-icon">📷</a>
            <a href="#" class="social-icon">🐦</a>
            <a href="#" class="social-icon">📺</a>
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
            <ion-icon name="log-out-outline"></ion-icon>
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

* {
  font-family: 'ZCOOL XiaoWei', serif !important;
}

/* Override font for Thai language */
body.thai-font * {
  font-family: 'Kanit', sans-serif !important;
  /* font-family: 'Prompt', sans-serif !important; */
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
  background-color: #F3F0EB;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5%;
  z-index: 1000;
  border-bottom: 1px solid #f0f0f0;
}

/* Left: Logo */
.nav-left {
  display: flex;
  align-items: center;
}

.main-logo {
  height: 45px;
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
  color: #008080;
  /* Teal */
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #008080;
  /* Teal underline */
}

/* Right: Search & Actions */
.nav-right {
  display: flex;
  align-items: center;
  gap: 25px;
}

.search-capsule {
  background-color: #E5E2DD;
  /* Soft beige background */
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 180px;
}

.search-capsule ion-icon {
  color: #8b6f47;
  font-size: 20px;
}

.search-capsule input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  width: 100%;
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
  background-color: #006666;
  /* Deep teal from image */
  color: white;
  text-decoration: none;
  padding: 10px 28px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.2s, background 0.3s;
  border: 2px solid #006666;
}

.order-capsule {
  background-color: white;
  color: #006666;
  text-decoration: none;
  padding: 10px 28px;
  border-radius: 30px;
  font-weight: 700;
  font-size: 15px;
  transition: transform 0.2s, background 0.3s;
  border: 2px solid #006666;
}

.login-capsule:hover,
.order-capsule:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.login-capsule:hover {
  background-color: #004d4d;
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

  .search-capsule {
    width: 220px;
  }
}

@media (max-width: 1100px) {
  .nav-center {
    gap: 15px;
  }

  .nav-link {
    font-size: 15px;
  }

  .search-capsule {
    width: 180px;
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
    gap: 15px;
  }

  .nav-left {
    width: 100%;
    justify-content: center;
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

  .search-capsule {
    width: 300px;
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

  .search-capsule {
    display: none;
    /* Hide search on very small screens to save space */
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

/* Dropdown Animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.3s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
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
