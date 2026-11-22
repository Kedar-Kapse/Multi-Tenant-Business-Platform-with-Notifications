package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.AuditService;
import com.kedar.kapse.platform_core.enums.AuditAction;
import com.kedar.kapse.platform_core.enums.AuditEntityType;
import com.kedar.kapse.platform_core.security.CurrentUser;
import com.kedar.kapse.platform_core.security.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Two-factor login (TOTP authenticator app) for the logged-in user, done by Keycloak.
 *
 * Setting it up happens on Keycloak's own screen: the portal calls
 * keycloak.login({ action: 'CONFIGURE_TOTP' }) and Keycloak shows the QR code,
 * checks the first code and from then on asks for a code at every login.
 * Nothing secret ever passes through this service or a third-party QR site.
 *
 * This API only reports the status and turns it off.
 * (The previous version accepted any 6 digits as "verified", sent the secret to an
 *  external QR website and stored recovery codes in plain text -- removed.)
 */
@RestController
@RequestMapping("/api/mfa")
@RequiredArgsConstructor
@Slf4j
public class MfaController {

    private static final String CONFIGURE_TOTP = "CONFIGURE_TOTP";
    private static final List<String> LEGACY_ATTRIBUTES =
            List.of("mfa_enabled", "mfa_method", "totp_secret_pending", "recovery_codes", "mfa_email");

    private final Keycloak keycloakAdmin;
    private final AuditService auditService;

    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        UserResource userResource = currentUser();
        UserRepresentation user = userResource.toRepresentation();
        boolean enabled = userResource.credentials().stream().anyMatch(c -> "otp".equals(c.getType()));
        List<String> actions = user.getRequiredActions() != null ? user.getRequiredActions() : List.of();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("enabled", enabled);
        result.put("method", enabled ? "totp" : null);
        result.put("username", user.getUsername());
        result.put("email", user.getEmail());
        // true when set-up was requested but the user has not scanned the QR code yet
        result.put("totpRequired", actions.contains(CONFIGURE_TOTP));
        return result;
    }

    /**
     * Fallback for set-up: ask Keycloak to show the authenticator set-up screen at the
     * next login (used if the browser flow above is not available).
     */
    @PostMapping("/require-setup")
    public Map<String, Object> requireSetup() {
        UserResource userResource = currentUser();
        UserRepresentation user = userResource.toRepresentation();
        List<String> actions = new ArrayList<>(user.getRequiredActions() != null ? user.getRequiredActions() : List.of());
        if (!actions.contains(CONFIGURE_TOTP)) actions.add(CONFIGURE_TOTP);
        user.setRequiredActions(actions);
        userResource.update(user);
        auditService.recordByCurrentUser(AuditEntityType.SECURITY, user.getId(), AuditAction.MFA_SETUP_REQUESTED, user.getUsername());
        return Map.of("status", "pending", "message", "You will be asked to set up your authenticator app at your next sign-in.");
    }

    @PostMapping("/disable")
    public Map<String, Object> disable() {
        UserResource userResource = currentUser();
        UserRepresentation user = userResource.toRepresentation();

        for (CredentialRepresentation cred : userResource.credentials()) {
            if ("otp".equals(cred.getType())) {
                userResource.removeCredential(cred.getId());
            }
        }
        if (user.getRequiredActions() != null) {
            user.setRequiredActions(user.getRequiredActions().stream().filter(a -> !CONFIGURE_TOTP.equals(a)).toList());
        }
        Map<String, List<String>> attrs = user.getAttributes();
        if (attrs != null) {
            LEGACY_ATTRIBUTES.forEach(attrs::remove);
            user.setAttributes(attrs);
        }
        userResource.update(user);
        log.info("Two-factor login disabled for user '{}'", user.getUsername());
        auditService.recordByCurrentUser(AuditEntityType.SECURITY, user.getId(), AuditAction.MFA_DISABLED, user.getUsername());
        return Map.of("status", "disabled", "message", "Two-factor login has been turned off");
    }

    private UserResource currentUser() {
        return keycloakAdmin.realm(TenantContext.getRequiredTenantId()).users().get(CurrentUser.get().id());
    }
}
