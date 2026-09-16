import { create } from 'zustand';
import keycloak from '../keycloak';

const BLOCKED_ROLES = ['PATIENT'];

const decodeUser = () => {
  if (!keycloak.tokenParsed) return null;
  const p = keycloak.tokenParsed;
  return {
    sub: p.sub,
    username: p.preferred_username,
    email: p.email,
    firstName: p.given_name,
    lastName: p.family_name,
    fullName: p.name || `${p.given_name || ''} ${p.family_name || ''}`.trim(),
    roles: p.realm_access?.roles?.filter(r => !['offline_access', 'uma_authorization'].includes(r) && !r.startsWith('default-roles-')) || [],
    clientRoles: p.resource_access?.['platform-backend']?.roles || [],
  };
};

const useAuthStore = create((set) => ({
  user: null,
  initialized: false,
  loading: false,
  error: null,

  init: async () => {
    try {
      const authenticated = await keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
      });
      keycloak.onAuthRefreshSuccess = () => set({ user: decodeUser() });
      keycloak.onAuthLogout = () => set({ user: null });

      if (!authenticated) {
        set({ user: null, initialized: true });
        return;
      }

      const user = decodeUser();
      if (user.roles.length === 1 && BLOCKED_ROLES.includes(user.roles[0])) {
        set({ user: null, initialized: true, error: 'Patients cannot access the Provider Portal' });
        keycloak.logout({ redirectUri: `${window.location.origin}/login` });
        return;
      }
      set({ user, initialized: true });
    } catch {
      set({ initialized: true, error: 'Failed to initialize authentication' });
    }
  },

  login: () => keycloak.login({ redirectUri: `${window.location.origin}/` }),
  logout: () => keycloak.logout({ redirectUri: `${window.location.origin}/login` }),
  refreshUser: () => set({ user: decodeUser() }),
  isAuthenticated: () => !!keycloak.authenticated,
}));

export default useAuthStore;
