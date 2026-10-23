import { ref } from 'vue';
import { api } from '../services/api';

// One admin session shared by every admin page: the shell reads it to decide between
// the login gate and the page, and pages report a rejected request through
// handleAuthError so the whole admin falls back to the gate together.
//
// "Signed in" means an admin token only. api.getToken() also falls back to a customer
// login, which must never open the admin.
const isAuthenticated = ref(false);
const ready = ref(false); // false until the browser's stored token has been read
const sessionExpired = ref(false);
const loginError = ref(''); // '' | 'wrong' | 'network'

const sync = () => {
  isAuthenticated.value = Boolean(api.getAdminToken());
  ready.value = true;
};

const login = async (password) => {
  loginError.value = '';
  try {
    const result = await api.adminLogin(password);
    if (result?.success) {
      isAuthenticated.value = true;
      sessionExpired.value = false;
      return true;
    }
    loginError.value = 'wrong';
  } catch {
    loginError.value = 'network';
  }
  return false;
};

const logout = async () => {
  await api.adminLogout();
  isAuthenticated.value = false;
  sessionExpired.value = false;
};

// Returns true when the error was a rejected session (and has been handled), so
// callers can `if (handleAuthError(e)) return;`.
const handleAuthError = (error) => {
  if (error?.status !== 401) return false;
  isAuthenticated.value = false;
  sessionExpired.value = true;
  return true;
};

export function useAdminSession() {
  return { isAuthenticated, ready, sessionExpired, loginError, sync, login, logout, handleAuthError };
}
