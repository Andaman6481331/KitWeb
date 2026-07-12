<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { authStore } from '../stores/authStore'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const orderId = computed(() => route.query.orderId || '')
const customerName = computed(
  () => route.query.name || authStore.user?.businessName || authStore.user?.ownerName || ''
)
const currentLang = computed(() => route.params.lang || 'th')

const LINE_OA_URL = 'https://line.me/R/ti/p/@oar4837p'

const goShop = () => {
  router.push({ name: 'catalog', params: { lang: currentLang.value } })
}
</script>

<template>
  <div class="thank-you-page">
    <div class="card">
      <!-- Success icon -->
      <div class="success-circle">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#06C755" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <h1>{{ t('thankYou.title') }}</h1>
      <p class="subtitle">{{ t('thankYou.subtitle') }}</p>

      <div class="order-info" v-if="orderId">
        <span class="order-id-label">{{ t('thankYou.received', { orderId }) }}</span>
      </div>

      <p class="processing">{{ t('thankYou.processing') }}</p>

      <!-- LINE OA CTA -->
      <a :href="LINE_OA_URL" target="_blank" rel="noopener" class="line-cta-btn">
        <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
          <rect width="40" height="40" rx="10" fill="#06C755"/>
          <path d="M20 8C13.4 8 8 12.5 8 18c0 3.7 2.4 6.9 6 8.8l-.8 3.9 4.5-2.4c.7.1 1.5.2 2.3.2 6.6 0 12-4.5 12-10S26.6 8 20 8z"
            fill="white"/>
        </svg>
        {{ t('thankYou.lineCtaButton') }}
      </a>

      <button class="continue-btn" @click="goShop">
        {{ t('thankYou.continueShopping') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.thank-you-page {
  min-height: 100vh;
  background: #FBF7F2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  font-family: 'Work Sans', sans-serif;
}

.card {
  background: white;
  border-radius: 24px;
  padding: 56px 48px;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 40px rgba(61, 43, 31, 0.08);
}

.success-circle {
  width: 88px;
  height: 88px;
  background: #f0fff4;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 28px;
}

h1 {
  font-family: 'Crimson Pro', serif;
  font-size: 36px;
  font-weight: 700;
  color: #3D2B1F;
  margin: 0 0 10px;
}

.subtitle {
  font-size: 16px;
  color: #8C7B6E;
  margin: 0 0 24px;
}

.order-info {
  background: #F9F5F0;
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 16px;
}

.order-id-label {
  font-size: 14px;
  font-weight: 600;
  color: #3D2B1F;
  letter-spacing: 0.3px;
}

.processing {
  font-size: 14px;
  color: #8C7B6E;
  margin: 0 0 36px;
  line-height: 1.6;
}

.line-cta-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 16px;
  background: #06C755;
  color: white;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.25s ease;
  margin-bottom: 14px;
}

.line-cta-btn:hover {
  background: #05a847;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(6, 199, 85, 0.25);
}

.continue-btn {
  width: 100%;
  padding: 14px;
  background: transparent;
  color: #8C7B6E;
  border: 1px solid #E6E0D9;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.continue-btn:hover {
  background: #F9F5F0;
  color: #3D2B1F;
  border-color: #D1C7BD;
}

@media (max-width: 480px) {
  .card {
    padding: 40px 24px;
  }
  h1 { font-size: 28px; }
}
</style>
