<script setup>
// The shell around every /:lang/admin/* page: the admin login, the shared navbar and
// the frame each page asks for (see utils/adminNav.js). The public site's header and
// footer are hidden on these routes by App.vue.
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import '../assets/admin-ui.css';
import AdminNavbar from '../components/admin/AdminNavbar.vue';
import { useAdminSession } from '../composables/useAdminSession';
import { useAdminLang } from '../composables/useAdminLang';

const route = useRoute();
const { isAuthenticated, ready, sessionExpired, loginError, sync, login, handleAuthError } = useAdminSession();
const { lang, restore } = useAdminLang();

const password = ref('');
const submitting = ref(false);

// Browser-only: the stored token and language are read after mount so a prerendered
// shell and its first client render agree.
onMounted(() => {
  sync();
  restore();
});

const frameClass = computed(() => {
  const frame = route.meta?.frame;
  return { 'adm-legacy': frame === 'legacy', 'adm-legacy-full': frame === 'full' };
});

// Old-UI panels report a rejected session by emitting this; the new pages call
// handleAuthError themselves.
const isLegacy = computed(() => route.meta?.frame === 'legacy');
const onSessionExpired = () => handleAuthError({ status: 401 });

const submit = async () => {
  if (submitting.value || !password.value) return;
  submitting.value = true;
  const ok = await login(password.value);
  submitting.value = false;
  if (ok) password.value = '';
};

const text = computed(() => (lang.value === 'th'
  ? {
    title: 'Kitcraft Admin', placeholder: 'รหัสผ่าน', signIn: 'เข้าสู่ระบบ',
    wrong: 'รหัสผ่านไม่ถูกต้อง', network: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้',
    expired: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง',
  }
  : {
    title: 'Kitcraft Admin', placeholder: 'Password', signIn: 'Sign in',
    wrong: 'Incorrect password', network: 'Could not reach the server',
    expired: 'Your session expired. Please sign in again.',
  }));
</script>

<template>
  <div class="adm-shell">
    <template v-if="ready">
      <form v-if="!isAuthenticated" class="adm-page adm-login" @submit.prevent="submit">
        <h1 class="adm-serif">{{ text.title }}</h1>
        <p v-if="sessionExpired" class="adm-login-error">{{ text.expired }}</p>
        <input
          v-model="password"
          class="adm-input"
          type="password"
          autocomplete="current-password"
          :placeholder="text.placeholder"
          :aria-label="text.placeholder"
        />
        <p v-if="loginError" class="adm-login-error">{{ loginError === 'network' ? text.network : text.wrong }}</p>
        <button type="submit" class="adm-btn adm-btn-primary" style="justify-content: center" :disabled="submitting || !password">
          {{ text.signIn }}
        </button>
      </form>

      <template v-else>
        <AdminNavbar />
        <main :class="frameClass">
          <router-view v-slot="{ Component }">
            <component :is="Component" v-on="isLegacy ? { 'session-expired': onSessionExpired } : {}" />
          </router-view>
        </main>
      </template>
    </template>
  </div>
</template>
