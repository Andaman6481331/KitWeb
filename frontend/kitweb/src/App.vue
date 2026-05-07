<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from './i18n'

const { t } = useI18n()

// Get saved language from localStorage or default to 'EN'
const savedLang = localStorage.getItem('locale') || 'EN'
const currentLanguage = ref(savedLang)
const showLanguageMenu = ref(false)

const languages = [
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'TH', label: 'ไทย', flag: '🇹🇭' },
  { code: 'CN', label: '中文', flag: '🇨🇳' },
  { code: 'JP', label: '日本語', flag: '🇯🇵' }
]

const changeLanguage = (langCode) => {
  currentLanguage.value = langCode
  setLocale(langCode)
  showLanguageMenu.value = false
}

const toggleLanguageMenu = () => {
  showLanguageMenu.value = !showLanguageMenu.value
}
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
      <div class="nav-center">
        <router-link to="/" class="nav-link" active-class="active">{{ $t('nav.home') }}</router-link>
        <router-link to="/catalog" class="nav-link" active-class="active">{{ $t('nav.products') }}</router-link>
        <router-link to="/event" class="nav-link" active-class="active">{{ $t('nav.events') }}</router-link>
        <router-link to="/partners" class="nav-link" active-class="active">{{ $t('nav.partners') }}</router-link>
        <router-link to="/contactus" class="nav-link" active-class="active">{{ $t('nav.contactUs') }}</router-link>
      </div>

      <!-- Right: Search & Actions -->
      <div class="nav-right">
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

          <router-link to="/orderpage" class="order-capsule">
            {{ $t('nav.startOrder') }}
          </router-link>

          <router-link to="/login" class="login-capsule">
            {{ $t('nav.login') }}
          </router-link>
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
            <li>📞 +66 (0) 2-XXX-XXXX</li>
            <li>✉️ info@kitcharoen.com</li>
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
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=swap');

* {
  font-family: 'ZCOOL XiaoWei', serif !important;
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
  width: 280px;
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
  right: 0;
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
  font-size: 18px;
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

.login-capsule:hover, .order-capsule:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.login-capsule:hover {
  background-color: #004d4d;
}

.order-capsule:hover {
  background-color: #f8f8f8;
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
@media (max-width: 1024px) {
  .nav-group {
    gap: 10px;
  }

  .button {
    padding: 10px 18px;
    font-size: 14px;
  }

  .button-icon {
    font-size: 14px;
  }
}

@media (max-width: 768px) {
  .NavBar {
    height: auto;
    min-height: 90px;
    flex-direction: column;
    padding: 15px 5%;
    gap: 15px;
  }

  .nav-group {
    flex-wrap: wrap;
    justify-content: center;
  }

  .nav-group p {
    display: none;
  }

  .button {
    padding: 8px 16px;
    font-size: 13px;
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
</style>
