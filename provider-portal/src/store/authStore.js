import { create } from 'zustand';
import keycloak from '../keycloak';
import portalService from '../services/portalService';

/** Realm roles allowed into the Provider Portal (same as the backend's staff roles). */
export const PROVIDER_ROLES = ['PHYSICIAN', 'PROVIDER', 'NURSE', 'THERAPIST', 'ADMIN'];

const decodeUser = () => {
  if (!keycloak.tokenParsed) return null;
  const p = keycloak.tokenParsed;
  const roles = p.realm_access?.roles?.filter((r) => !['offline_access', 'uma_authorization'].includes(r) && !r.startsWith('default-roles-')) || [];
  return {
    sub: p.sub,
    username: p.preferred_username,
    email: p.email,
    firstName: p.given_name,
    lastName: p.family_name,
    fullName: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
    roles,
    /** The role shown in the UI (clinical role first). */
    primaryRole: roles.find((r) => PROVIDER_ROLES.includes(r)) || roles[0] || '',
    clientRoles: p.resource_access?.['platform-backend']?.roles || [],
  };
};

const isProvider = (user) => !!user?.roles?.some((r) => PROVIDER_ROLES.includes(r));

/**
 * Coming from another portal (/portal-entry?code=...): trade the one-time code for
 * tokens and hand them to keycloak-js, so the session works exactly like a normal
 * login (refresh, logout). Tokens are never written to localStorage.
 */
async function tokensFromSwitchCode() {
  if (window.location.pathname !== '/portal-entry') return null;
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) throw new Error('No switch code was provided.');
  try {
    const data = await portalService.exchangeCode(code);
    if (!data?.access_token) throw new Error('Invalid response from server.');
    return { token: data.access_token, refreshToken: data.refresh_token };
  } catch (err) {
    throw new Error(err?.response?.data?.message || err.message || 'The switch code may have expired.');
  }
}

// keycloak-js can only be initialised once; React StrictMode runs effects twice in
// development, and the switch code is single-use, so share one init promise.
let initPromise = null;

const useAuthStore = create((set, get) => ({
  user: null,
  /** Logged in, but without a clinical role (e.g. a patient account). */
  deniedUser: null,
  initialized: false,
  error: null,
  switchError: null,

  init: () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      let switchTokens = null;
      try {
        switchTokens = await tokensFromSwitchCode();
      } catch (e) {
        set({ switchError: e.message });
      }
      try {
        const options = switchTokens
          ? { ...switchTokens, checkLoginIframe: false, pkceMethod: 'S256' }
          : {
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            pkceMethod: 'S256',
          };
        const authenticated = await keycloak.init(options);
        keycloak.onAuthRefreshSuccess = () => {
          const user = decodeUser();
          if (isProvider(user)) set({ user });
        };
        keycloak.onAuthLogout = () => set({ user: null });
        keycloak.onTokenExpired = () => { keycloak.updateToken(30).catch(() => set({ user: null })); };

        if (!authenticated) {
          set({ user: null, initialized: true });
          return;
        }
        const user = decodeUser();
        if (!isProvider(user)) {
          set({ user: null, deniedUser: user, initialized: true });
          return;
        }
        set({ user, initialized: true });
      } catch {
        set({ initialized: true, error: 'We could not reach the sign-in service. Please try again in a moment.' });
      }
    })();
    return initPromise;
  },

  login: () => keycloak.login({ redirectUri: `${window.location.origin}/` }),
  // keycloak-js redirects the whole page; state is left alone so the login page
  // does not start a new sign-in while the sign-out is still in progress.
  logout: () => keycloak.logout({ redirectUri: `${window.location.origin}/login` }),
  refreshUser: () => set({ user: decodeUser() }),
  isAuthenticated: () => !!keycloak.authenticated && !!get().user,
}));

export default useAuthStore;
