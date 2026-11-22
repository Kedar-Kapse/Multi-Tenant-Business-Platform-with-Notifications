package com.kedar.kapse.access_security_service.security;

import com.kedar.kapse.platform_core.security.PlatformAccess;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DefaultOAuth2AuthenticatedPrincipal;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.server.resource.authentication.BearerTokenAuthentication;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Only "super-admin" issued by the platform realm makes a platform admin. */
class PlatformAccessTest {

    private final PlatformAccess access = new PlatformAccess("platform");

    private static BearerTokenAuthentication token(String realm, String... roles) {
        List<GrantedAuthority> authorities = java.util.Arrays.stream(roles)
                .map(r -> (GrantedAuthority) new SimpleGrantedAuthority("ROLE_" + r.toUpperCase()))
                .toList();
        var principal = new DefaultOAuth2AuthenticatedPrincipal("someone",
                Map.of("iss", "https://auth.example.com/realms/" + realm), authorities);
        var accessToken = new OAuth2AccessToken(OAuth2AccessToken.TokenType.BEARER, "t",
                Instant.now(), Instant.now().plusSeconds(60));
        return new BearerTokenAuthentication(principal, accessToken, authorities);
    }

    @Test
    void superAdminFromPlatformRealmIsPlatformAdmin() {
        assertThat(access.isPlatformAdmin(token("platform", "super-admin"))).isTrue();
    }

    @Test
    void superAdminRoleInsideAHospitalIsIgnored() {
        // A hospital admin who created a "super-admin" role in their own realm.
        assertThat(access.isPlatformAdmin(token("hospital-a", "super-admin", "ADMIN"))).isFalse();
    }

    @Test
    void hospitalAdminIsNotPlatformAdmin() {
        assertThat(access.isPlatformAdmin(token("hospital-a", "ADMIN"))).isFalse();
    }

    @Test
    void platformRealmWithoutTheRoleIsNotPlatformAdmin() {
        assertThat(access.isPlatformAdmin(token("platform", "ADMIN"))).isFalse();
    }

    @Test
    void lookAlikeRealmNameIsRejected() {
        assertThat(access.isPlatformAdmin(token("platform-fake", "super-admin"))).isFalse();
        assertThat(access.isPlatformAdmin(token("fake-platform", "super-admin"))).isFalse();
    }

    @Test
    void masterAndPlatformAreReservedHospitalNames() {
        assertThat(access.isReservedRealm("master")).isTrue();
        assertThat(access.isReservedRealm("Platform")).isTrue();
        assertThat(access.isReservedRealm("hospital-c")).isFalse();
    }
}
