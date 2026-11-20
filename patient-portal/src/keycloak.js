import Keycloak from 'keycloak-js';
import { TENANT_ID, KEYCLOAK_URL, KEYCLOAK_CLIENT_ID } from './runtimeConfig';

const keycloak = new Keycloak({
  url: KEYCLOAK_URL,
  realm: TENANT_ID,
  clientId: KEYCLOAK_CLIENT_ID,
});

export default keycloak;
