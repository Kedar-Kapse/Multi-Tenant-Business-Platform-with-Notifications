import api, { ACCESS_SECURITY } from './api';

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
    const refreshToken = localStorage.getItem('refresh_token');
    const res = await api.post(`${PORTAL_SWITCH}/generate`, {
      target_portal: targetPortalKey,
      refresh_token: refreshToken,
    });
    return res.data;
  },
};

export default portalService;
