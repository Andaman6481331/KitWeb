<script setup>
// The "Kitcraft Admin" bar from the design, shared by every admin page. The main
// pages sit on the bar; the content tools live under "More". Both come from
// utils/adminNav.js, the same list the route table is built from.
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { adminNav, adminNavLabel } from '../../utils/adminNav';
import { useAdminLang } from '../../composables/useAdminLang';
import { useAdminSession } from '../../composables/useAdminSession';

const route = useRoute();
const { lang } = useAdminLang();
const { logout } = useAdminSession();

const routeLang = computed(() => route.params.lang || 'en');
const mainItems = adminNav.filter((item) => item.group === 'main');
const moreItems = adminNav.filter((item) => item.group === 'more');

const moreOpen = ref(false);
const activeMore = computed(() => moreItems.find((item) => item.name === route.name) || null);
const moreActive = computed(() => activeMore.value !== null);
watch(() => route.fullPath, () => { moreOpen.value = false; });

const th = computed(() => lang.value === 'th');
// On a page from the menu, the button names that page so you can see where you are.
const moreLabel = computed(() => (activeMore.value ? adminNavLabel(activeMore.value, lang.value) : (th.value ? 'เพิ่มเติม' : 'More')));
</script>

<template>
  <nav class="adm-nav" aria-label="Main">
    <div class="adm-nav-inner">
      <router-link class="adm-brand adm-serif" :to="{ name: 'admin-inventory', params: { lang: routeLang } }">
        Kitcraft Admin
      </router-link>

      <router-link
        v-for="item in mainItems"
        :key="item.name"
        class="adm-nav-link"
        :class="{ 'is-active': route.name === item.name }"
        :aria-current="route.name === item.name ? 'page' : undefined"
        :to="{ name: item.name, params: { lang: routeLang } }"
      >{{ adminNavLabel(item, lang) }}</router-link>

      <div class="adm-nav-more">
        <button
          type="button"
          class="adm-nav-link"
          :class="{ 'is-active': moreActive }"
          aria-haspopup="menu"
          :aria-expanded="moreOpen"
          @click="moreOpen = !moreOpen"
        >
          {{ moreLabel }}
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 6px"><path d="M6 9l6 6 6-6"></path></svg>
        </button>
        <div v-if="moreOpen" role="menu" class="adm-nav-menu">
          <router-link
            v-for="item in moreItems"
            :key="item.name"
            role="menuitem"
            class="adm-nav-link"
            :class="{ 'is-active': route.name === item.name }"
            :to="{ name: item.name, params: { lang: routeLang } }"
          >{{ adminNavLabel(item, lang) }}</router-link>
        </div>
      </div>

      <span class="adm-nav-spacer"></span>

      <router-link class="adm-nav-link" :to="{ name: 'home', params: { lang: routeLang } }">
        {{ th ? 'ดูเว็บไซต์' : 'View site' }}
      </router-link>
      <button type="button" class="adm-nav-link" @click="logout">{{ th ? 'ออกจากระบบ' : 'Log out' }}</button>
    </div>
    <div v-if="moreOpen" class="adm-nav-scrim" @click="moreOpen = false"></div>
  </nav>
</template>
