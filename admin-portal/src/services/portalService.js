import api, { ACCESS_SECURITY } from './api';
import keycloak from '../keycloak';

const PORTAL_SWITCH = `${ACCESS_SECURITY}/api/auth/portal-switch`;

const portalService = {
  /**
   * Fetches the list of available portals from the backend.
   * Only returns results for ADMIN users.
   */
  getPortals: async () => {
    const res = await api.get(`${PORTAL_SWITCH}/portals`);
    return res.data.portals || [];
  },

  /**
   * Generates a one-time switch code and redirects to the target portal.
   * The backend returns a redirect URL with the code embedded.
   */
  switchToPortal: async (targetPortalKey) => {
    // keycloak-js keeps the refresh token in memory (nothing is stored in localStorage)
    const refreshToken = keycloak.refreshToken;
    const res = await api.post(`${PORTAL_SWITCH}/generate`, {
      target_portal: targetPortalKey,
      refresh_token: refreshToken,
    });
    return res.data;
  },
};

export default portalService;
