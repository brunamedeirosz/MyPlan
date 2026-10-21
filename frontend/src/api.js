import axios from 'axios';
import { createDemoAdapter } from './demo.js';
import { authStorage, isDemo } from './session.js';

const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/' : 'http://127.0.0.1:8000/api/');
export const api = axios.create({ baseURL, timeout: 15000, ...(isDemo ? { adapter: createDemoAdapter(sessionStorage) } : {}) });
const authApi = axios.create({ baseURL, timeout: 15000 });
let refreshRequest = null;
const isPublicAuth = url => ['token/', 'token/refresh/', 'registro/'].includes(url);

api.interceptors.request.use(config => {
  const token = authStorage.getItem('devdesk_token');
  if (token && !isPublicAuth(config.url)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(response => response, async error => {
  const config = error.config;
  if (error.response?.status !== 401 || !config || config._retried || isPublicAuth(config.url)) {
    throw error;
  }
  config._retried = true;
  const refresh = authStorage.getItem('devdesk_refresh_token');
  if (!refresh) {
    expireSession();
    throw error;
  }
  try {
    // Uma unica renovacao atende as requisicoes simultaneas do dashboard.
    const currentToken = authStorage.getItem('devdesk_token');
    if (config.headers.Authorization === `Bearer ${currentToken}`) {
      if (!refreshRequest) {
        refreshRequest = authApi.post('token/refresh/', { refresh }).then(({ data }) => {
          // Sair ou trocar de conta invalida uma renovacao ainda em andamento.
          if (authStorage.getItem('devdesk_refresh_token') !== refresh) throw new Error('Sessao alterada.');
          authStorage.setItem('devdesk_token', data.access);
          return data.access;
        }).finally(() => { refreshRequest = null; });
      }
      await refreshRequest;
    }
    if (authStorage.getItem('devdesk_refresh_token') !== refresh) throw error;
    return api(config);
  } catch (refreshError) {
    if ([400, 401].includes(refreshError.response?.status) && authStorage.getItem('devdesk_refresh_token') === refresh) {
      expireSession();
    }
    throw refreshError;
  }
});

function expireSession() {
  ['devdesk_token', 'devdesk_refresh_token', 'devdesk_username'].forEach(key => authStorage.removeItem(key));
  window.dispatchEvent(new Event('devdesk:session-expired'));
}
