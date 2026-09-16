import keycloak from '../keycloak';

const authService = {
  getToken: () => keycloak.token || null,
  isAuthenticated: () => !!keycloak.authenticated,
  getUser: () => {
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
    };
  },
};

export default authService;
