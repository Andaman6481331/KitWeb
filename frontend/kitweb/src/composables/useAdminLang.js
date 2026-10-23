import { ref, computed } from 'vue';

// EN / ไทย for the redesigned admin pages. Same storage key as the design file, so a
// choice made there carries over. Storage can throw (private windows) or be missing
// (prerender), and the page must still work without it.
const KEY = 'kc-lang';
const lang = ref('en');

const read = () => {
  try {
    return window.localStorage.getItem(KEY) === 'th' ? 'th' : 'en';
  } catch {
    return 'en';
  }
};

// Called once the page is in a browser; the initial value stays 'en' so a prerendered
// page and its first client render agree.
const restore = () => {
  lang.value = read();
};

const setLang = (next) => {
  if (next !== 'en' && next !== 'th') return;
  lang.value = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // keep the choice for this visit only
  }
};

export function useAdminLang() {
  return { lang, isThai: computed(() => lang.value === 'th'), restore, setLang };
}
