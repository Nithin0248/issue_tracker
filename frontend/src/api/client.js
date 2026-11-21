import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
export const WS_URL = API_URL.replace(/^http/, 'ws') + '/ws';

const TOKEN_KEY = 'it_token';
const USER_KEY = 'it_user';

// localStorage can throw (private mode, blocked storage) - never let that break the app.
function safe(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export const tokenStore = {
  get: () => safe(() => localStorage.getItem(TOKEN_KEY)),
  set: (t) => safe(() => localStorage.setItem(TOKEN_KEY, t)),
  getUser: () => safe(() => JSON.parse(localStorage.getItem(USER_KEY) || 'null')),
  setUser: (u) => safe(() => localStorage.setItem(USER_KEY, JSON.stringify(u))),
  clear: () =>
    safe(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }),
};

const client = axios.create({ baseURL: `${API_URL}/api` });

client.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    // A 401 from login/register just means wrong credentials; anywhere else it means the session ended.
    if (err.response?.status === 401 && !url.startsWith('/auth/')) onUnauthorized();
    return Promise.reject(err);
  },
);

/** Turns an axios error into a message that is safe to show to a person. */
export function errorMessage(err) {
  const data = err?.response?.data;
  if (data?.fieldErrors && Object.keys(data.fieldErrors).length) {
    return Object.values(data.fieldErrors).join('. ');
  }
  if (data?.message) return data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the backend is running.';
  return err?.message || 'Something went wrong. Try again.';
}

export default client;
