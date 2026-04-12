import api, { ACCESS_SECURITY } from './api';

const PORTAL_SWITCH = `${ACCESS_SECURITY}/api/auth/portal-switch`;

const portalService = {
  getPortals: async () => {
    const res = await api.get(`${PORTAL_SWITCH}/portals`);
    return res.data.portals || [];
  },

  switchToPortal: async (targetPortalKey) => {
    const refreshToken = localStorage.getItem('provider_refresh_token');
    const res = await api.post(`${PORTAL_SWITCH}/generate`, {
      target_portal: targetPortalKey,
      refresh_token: refreshToken,
    });
    return res.data;
  },
};

export default portalService;
