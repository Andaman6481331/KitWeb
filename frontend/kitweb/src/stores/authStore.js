import { reactive, watch } from 'vue';

const AUTH_STORAGE_KEY = 'kitweb_auth';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const state = reactive({
    token: isBrowser ? localStorage.getItem(`${AUTH_STORAGE_KEY}_token`) || null : null,
    user: isBrowser ? JSON.parse(localStorage.getItem(`${AUTH_STORAGE_KEY}_user`) || 'null') : null
});

watch(() => state.token, (newToken) => {
    if (!isBrowser) return;
    if (newToken) {
        localStorage.setItem(`${AUTH_STORAGE_KEY}_token`, newToken);
    } else {
        localStorage.removeItem(`${AUTH_STORAGE_KEY}_token`);
    }
});

watch(() => state.user, (newUser) => {
    if (!isBrowser) return;
    if (newUser) {
        localStorage.setItem(`${AUTH_STORAGE_KEY}_user`, JSON.stringify(newUser));
    } else {
        localStorage.removeItem(`${AUTH_STORAGE_KEY}_user`);
    }
}, { deep: true });

export const authStore = {
    get token() {
        return state.token;
    },
    get user() {
        return state.user;
    },
    get isAuthenticated() {
        return !!state.token;
    },
    login(user, token) {
        state.user = user;
        state.token = token;
    },
    logout() {
        state.user = null;
        state.token = null;
    }
};
