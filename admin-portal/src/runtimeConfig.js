// Everything the portal needs to know about where it runs comes from the
// address in the browser. Nothing is baked in at build time, so the same image
// works for every hospital and every environment ("build once, deploy anywhere").
//
//   https://hospital-a.app.kapse.online
//           \________/ \_/ \__________/
//             tenant  portal  base domain
//
//   tenant      -> Keycloak realm + X-TENANT-ID header
//   base domain -> auth.<base> (Keycloak) and api.<base> (API gateway)
//
// On localhost (local development) there is no subdomain, so the values come
// from the local .env file (REACT_APP_*) or the usual local defaults.

const TENANT_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

const host = window.location.hostname.toLowerCase();
const isLocal = host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host);
const labels = host.split('.');
const baseDomain = labels.slice(2).join('.'); // hospital-a.app.kapse.online -> kapse.online
const origin = (sub) => `${window.location.protocol}//${sub}.${baseDomain}`;

export const TENANT_ID = isLocal
  ? process.env.REACT_APP_TENANT_ID || 'test'
  : TENANT_PATTERN.test(labels[0]) ? labels[0] : null;

export const KEYCLOAK_URL = isLocal
  ? process.env.REACT_APP_KEYCLOAK_URL || 'http://localhost:8080'
  : origin('auth');

export const API_BASE_URL = isLocal
  ? process.env.REACT_APP_API_BASE_URL || 'http://localhost:8085'
  : origin('api');

// The app's own name in Keycloak -- the same in every environment.
export const KEYCLOAK_CLIENT_ID = 'platform-frontend';

// The platform owner's own sign-in area -- not a hospital. Platform admins use
// https://platform.admin.<domain> and only manage hospitals (tenants) there.
// The API decides who is a platform admin; this only picks which menu to show.
export const PLATFORM_TENANT = process.env.REACT_APP_PLATFORM_TENANT || 'platform';
