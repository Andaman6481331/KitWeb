<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'

const route = useRoute()
const status = ref('connecting') // 'connecting' | 'error'
const errorMsg = ref('')

onMounted(async () => {
  const code = route.query.code
  const state = route.query.state
  const savedState = localStorage.getItem('line_oauth_state')

  if (!code) {
    status.value = 'error'
    errorMsg.value = 'No authorization code received from LINE.'
    return
  }

  if (state !== savedState) {
    status.value = 'error'
    errorMsg.value = 'Security check failed. Please try again.'
    return
  }

  localStorage.removeItem('line_oauth_state')

  try {
    const redirectUri = window.location.origin + '/line-callback'
    const result = await api.exchangeLineCode(code, redirectUri)

    if (result.userId) {
      if (window.opener) {
        window.opener.postMessage(
          { type: 'LINE_AUTH', lineUserId: result.userId, displayName: result.displayName },
          window.location.origin
        )
      }
      window.close()
    } else {
      throw new Error(result.error || 'Failed to get LINE profile')
    }
  } catch (e) {
    // Let the opener stop its "connecting" state and show a friendly message.
    if (window.opener) {
      window.opener.postMessage(
        { type: 'LINE_AUTH_ERROR', error: e.message || 'exchange_failed' },
        window.location.origin
      )
    }
    status.value = 'error'
    errorMsg.value = e.message || 'Could not connect to LINE. Please close this window and try again.'
  }
})
</script>

<template>
  <div class="callback-page">
    <div class="callback-card">
      <template v-if="status === 'connecting'">
        <div class="spinner"></div>
        <p>Connecting to LINE…</p>
      </template>
      <template v-else>
        <div class="error-icon">✕</div>
        <p class="error-text">{{ errorMsg }}</p>
        <button @click="window.close()">Close</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f4f7f6;
  font-family: 'Work Sans', sans-serif;
}

.callback-card {
  background: white;
  border-radius: 20px;
  padding: 48px 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  max-width: 360px;
  width: 90%;
}

.callback-card p {
  font-size: 16px;
  color: #3D2B1F;
  margin: 16px 0 0;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #E6E0D9;
  border-top-color: #06C755;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  width: 56px;
  height: 56px;
  background: #fff0f0;
  color: #d63031;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  margin: 0 auto;
}

.error-text {
  color: #d63031 !important;
  font-size: 14px !important;
}

button {
  margin-top: 20px;
  padding: 10px 24px;
  background: #3D2B1F;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
</style>
