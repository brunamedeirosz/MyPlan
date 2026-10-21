export const isDemo = import.meta.env.VITE_DEMO_ONLY === 'true'
  || new URLSearchParams(window.location.search).get('demo') === '1';

// A demonstração nunca substitui a sessão real que já existe neste navegador.
export const authStorage = isDemo ? sessionStorage : localStorage;
if (isDemo) {
  authStorage.setItem('devdesk_token', 'demo-local');
  authStorage.setItem('devdesk_username', 'visitante');
}
