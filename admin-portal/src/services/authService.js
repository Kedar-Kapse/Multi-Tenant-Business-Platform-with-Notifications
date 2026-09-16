import keycloak from '../keycloak';

const authService = {
  getToken: () => keycloak.token || null,

  isAuthenticated: () => !!keycloak.authenticated,

  getUser: () => {
    if (!keycloak.tokenParsed) return null;
    const p = keycloak.tokenParsed;
    return {
      username: p.preferred_username,
      email: p.email,
      roles: p.realm_access?.roles || [],
      sub: p.sub,
    };
  },
};

export default authService;
