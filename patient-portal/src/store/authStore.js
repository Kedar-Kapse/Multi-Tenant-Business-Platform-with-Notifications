import { create } from 'zustand';
import axios from 'axios';
import keycloak from '../keycloak';
import { TENANT_ID, API_BASE_URL } from '../runtimeConfig';

const HIDDEN_ROLES = ['offline_access', 'uma_authorization'];

const decodeUser = () => {
  if (!keycloak.tokenParsed) return null;
  const p = keycloak.tokenParsed;
  const roles = (p.realm_access?.roles || []).filter((r) => !HIDDEN_ROLES.includes(r) && !r.startsWith('default-roles-'));
  return {
    sub: p.sub,
    username: p.preferred_username,
    email: p.email,
    firstName: p.given_name,
    lastName: p.family_name,
    fullName: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
    roles,
    isPatient: roles.includes('PATIENT'),
  };
};

/**
 * Coming from another portal (/portal-entry?code=...): swap the one-time code for
 * tokens BEFORE keycloak-js starts, so keycloak-js owns them (refresh, logout, API
 * calls). Tokens are never written to localStorage.
 */
async function exchangePortalCode() {
  if (window.location.pathname !== '/portal-entry') return { tokens: null, error: null };
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return { tokens: null, error: 'No switch code was provided.' };
  try {
    const res = await axios.post(
      `${API_BASE_URL}/access-security/api/auth/portal-switch/exchange`,
      { code },
      { headers: { 'Content-Type': 'application/json', 'X-TENANT-ID': TENANT_ID } },
    );
    if (!res.data?.access_token || !res.data?.refresh_token) {
      return { tokens: null, error: 'The server returned an invalid response.' };
    }
    return { tokens: res.data, error: null };
  } catch (err) {
    return { tokens: null, error: err?.response?.data?.message || 'The switch code is invalid or has expired.' };
  }
}

// keycloak-js may only be initialised once; React StrictMode runs effects twice.
let initPromise = null;

const useAuthStore = create((set) => ({
  user: null,
  initialized: false,
  error: null,
  portalEntryError: null,

  init: () => {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      const { tokens, error: portalEntryError } = await exchangePortalCode();
      keycloak.onAuthRefreshSuccess = () => {
        // Only replace the user when something visible changed, so pages that
        // depend on `user` do not refetch (and lose edits) on every token refresh.
        const next = decodeUser();
        set((s) => (s.user && next && s.user.sub === next.sub && s.user.fullName === next.fullName
          && s.user.roles.join() === next.roles.join() ? {} : { user: next }));
      };
      keycloak.onAuthLogout = () => set({ user: null });
      keycloak.onTokenExpired = () => { keycloak.updateToken(30).catch(() => set({ user: null })); };
      try {
        const authenticated = await keycloak.init(tokens
          ? { token: tokens.access_token, refreshToken: tokens.refresh_token, idToken: tokens.id_token, checkLoginIframe: false, pkceMethod: 'S256' }
          : {
            onLoad: 'check-sso',
            silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            pkceMethod: 'S256',
          });
        set({ user: authenticated ? decodeUser() : null, initialized: true, portalEntryError });
      } catch {
        set({
          user: null,
          initialized: true,
          portalEntryError: tokens ? 'Your session from the other portal could not be used. Please sign in.' : portalEntryError,
          error: tokens ? null : 'Could not connect to the sign-in service. Please try again.',
        });
      }
    })();
    return initPromise;
  },

  login: (redirectPath = '/') => keycloak.login({ redirectUri: `${window.location.origin}${redirectPath}` }),
  logout: () => keycloak.logout({ redirectUri: `${window.location.origin}/login` }),
  /** Keycloak's own screens: 'UPDATE_PASSWORD' or 'CONFIGURE_TOTP'. */
  accountAction: (action) => keycloak.login({ action, redirectUri: `${window.location.origin}/profile` }),
  refreshUser: () => set({ user: decodeUser() }),
}));

export default useAuthStore;
