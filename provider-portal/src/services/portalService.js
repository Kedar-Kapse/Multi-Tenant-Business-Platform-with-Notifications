import api, { ACCESS_SECURITY } from './api';
import keycloak from '../keycloak';

const PORTAL_SWITCH = `${ACCESS_SECURITY}/api/auth/portal-switch`;

const portalService = {
  getPortals: async () => {
    const res = await api.get(`${PORTAL_SWITCH}/portals`);
    return res.data.portals || [];
  },

  switchToPortal: async (targetPortalKey) => {
    // The token is refreshed by the api interceptor first, so this is the current one.
    const res = await api.post(`${PORTAL_SWITCH}/generate`, {
      target_portal: targetPortalKey,
      refresh_token: keycloak.refreshToken,
    });
    return res.data;
  },

  /** Public endpoint: trades a one-time switch code for tokens. */
  exchangeCode: async (code) => {
    const res = await api.post(`${PORTAL_SWITCH}/exchange`, { code });
    return res.data;
  },
};

export default portalService;
