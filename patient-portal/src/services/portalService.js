import api, { ACCESS_SECURITY } from './api';
import keycloak from '../keycloak';

const PORTAL_SWITCH = `${ACCESS_SECURITY}/api/auth/portal-switch`;

const portalService = {
  getPortals: async () => {
    const res = await api.get(`${PORTAL_SWITCH}/portals`);
    return res.data.portals || [];
  },

  switchToPortal: async (targetPortalKey) => {
    // Make sure the refresh token handed to the other portal is current.
    try { await keycloak.updateToken(30); } catch { /* the request below reports the failure */ }
    const res = await api.post(`${PORTAL_SWITCH}/generate`, {
      target_portal: targetPortalKey,
      refresh_token: keycloak.refreshToken,
    });
    return res.data;
  },
};

export default portalService;
