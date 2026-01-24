<script setup>
import { RouterLink, RouterView } from 'vue-router'
import { ref } from 'vue'

const currentLanguage = ref('EN')
const showLanguageMenu = ref(false)

const languages = [
  { code: 'EN', label: 'English', flag: '🇬🇧' },
  { code: 'TH', label: 'ไทย', flag: '🇹🇭' },
  { code: 'CN', label: '中文', flag: '🇨🇳' },
  { code: 'JP', label: '日本語', flag: '🇯🇵' }
]

const changeLanguage = (langCode) => {
  currentLanguage.value = langCode
  showLanguageMenu.value = false
}

const toggleLanguageMenu = () => {
  showLanguageMenu.value = !showLanguageMenu.value
}
</script>

<template>
  <div>
    <div class="NavBar">
      <div class="nav-group">
        <img src="../components/icons/twitter.svg" alt="logo" class="logo">
        <router-link :to="'/'" class="no-style">
          <div>
            <h1>KITCHAROEN</h1>
            <p>376 Wanich 1 Chakkrawat Samphantawong Bangkok</p>
          </div>
        </router-link>
        <!-- Language Selector -->
        <div class="language-selector">
          <div class="button button-lang" @click="toggleLanguageMenu" style="width: 1.5rem;">
            <span class="button-icon">🌐</span>
            {{ currentLanguage }}
            <span class="arrow">▼</span>
          </div>

          <transition name="dropdown">
            <div v-if="showLanguageMenu" class="language-dropdown">
              <div v-for="lang in languages" :key="lang.code" class="language-option"
                :class="{ active: currentLanguage === lang.code }" @click="changeLanguage(lang.code)">
                <span class="flag">{{ lang.flag }}</span>
                <span class="lang-label">{{ lang.label }}</span>
                <span v-if="currentLanguage === lang.code" class="check">✓</span>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <div class="nav-group">
        <router-link :to="'/catalog'" class="no-style">
          <div class="button button-primary">
            <span class="button-icon">📦</span>
            Products
          </div>
        </router-link>

        <router-link :to="'/orderpage'" class="no-style">
          <div class="button button-primary">
            <span class="button-icon">🛒</span>
            Start Order
          </div>
        </router-link>

        <router-link :to="'/contactus'" class="no-style">
          <div class="button button-primary">
            <span class="button-icon">💬</span>
            Contact Us
          </div>
        </router-link>

        <router-link :to="'/login'" class="no-style">
          <div class="button">
            Login
          </div>
        </router-link>


      </div>
    </div>

    <RouterView />

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-column">
          <h3>Kitcharoen</h3>
          <p>Your trusted source for premium yarn and sewing supplies since 1995.</p>
        </div>
        <div class="footer-column">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="#">About Us</a></li>
            <li><a href="#">Products</a></li>
            <li><a href="#">Contact</a></li>
            <li><a href="#">FAQ</a></li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Contact Info</h4>
          <ul>
            <li>📍 376 Wanich 1 Chakkrawat</li>
            <li>📍 Samphantawong Bangkok</li>
            <li>📞 +66 (0) 2-XXX-XXXX</li>
            <li>✉️ info@kitcharoen.com</li>
          </ul>
        </div>
        <div class="footer-column">
          <h4>Follow Us</h4>
          <div class="social-links">
            <a href="#" class="social-icon">📘</a>
            <a href="#" class="social-icon">📷</a>
            <a href="#" class="social-icon">🐦</a>
            <a href="#" class="social-icon">📺</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 Kitcharoen. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
* {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.no-style {
  text-decoration: none;
  color: inherit;
}

.NavBar {
  position: sticky;
  top: 0;
  left: 0;
  height: 90px;
  /* background: linear-gradient(135deg, rgba(94, 69, 53, 0.95), rgba(147, 115, 94, 0.95)); */
  background-color: var(--primary-color);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: var(--text-dark-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  transition: all 0.3s ease;
}

.NavBar:hover {
  box-shadow: 0 6px 30px rgba(0, 0, 0, 0.2);
}

.nav-group {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo {
  width: 50px;
  height: 50px;
  filter: brightness(0) invert(1);
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: rotate(10deg) scale(1.1);
}

.nav-group h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.nav-group h1:hover {
  color: #ffd4a3;
}

.nav-group p {
  margin: 0;
  font-size: 13px;
  font-weight: 400;
  opacity: 0.9;
  pointer-events: none;
}

.button {
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  background: rgba(214, 191, 177, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.button-icon {
  font-size: 16px;
}

.button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.button:hover::before {
  left: 100%;
}

.button:hover {
  background: rgba(214, 191, 177, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.button:active {
  transform: translateY(0);
}

/* Primary Button (Start Order) */
.button-primary {
  background: rgba(147, 115, 94, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.button-primary:hover {
  background: rgba(147, 115, 94, 0.8);
  box-shadow: 0 6px 16px rgba(94, 69, 53, 0.4);
}

/* Language Selector */
.language-selector {
  position: relative;
}

.button-lang {
  min-width: 1.5rem;
  justify-content: center;
}

.arrow {
  font-size: 10px;
  transition: transform 0.3s ease;
}

.button-lang:hover .arrow {
  transform: translateY(2px);
}

.language-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  background: linear-gradient(135deg, rgba(94, 69, 53, 0.98), rgba(147, 115, 94, 0.98));
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 1001;
}

.language-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #fff9f1;
  position: relative;
}

.language-option:hover {
  background: rgba(214, 191, 177, 0.4);
}

.language-option.active {
  background: rgba(214, 191, 177, 0.3);
}

.flag {
  font-size: 20px;
}

.lang-label {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.check {
  color: #ffd4a3;
  font-weight: bold;
  font-size: 16px;
}

/* Dropdown Animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
}

.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
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
