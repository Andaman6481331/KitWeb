import { reactive, watch } from 'vue';

const AUTH_STORAGE_KEY = 'kitweb_auth';

const state = reactive({
    token: localStorage.getItem(`${AUTH_STORAGE_KEY}_token`) || null,
    user: JSON.parse(localStorage.getItem(`${AUTH_STORAGE_KEY}_user`) || 'null')
});

watch(() => state.token, (newToken) => {
    if (newToken) {
        localStorage.setItem(`${AUTH_STORAGE_KEY}_token`, newToken);
    } else {
        localStorage.removeItem(`${AUTH_STORAGE_KEY}_token`);
    }
});

watch(() => state.user, (newUser) => {
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
