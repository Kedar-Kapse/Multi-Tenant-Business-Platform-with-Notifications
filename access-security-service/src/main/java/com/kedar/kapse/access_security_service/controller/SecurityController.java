package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.repository.AuditLogRepository;
import com.kedar.kapse.access_security_service.service.AuditService;
import com.kedar.kapse.platform_core.enums.AuditAction;
import com.kedar.kapse.platform_core.enums.AuditEntityType;
import com.kedar.kapse.platform_core.security.CurrentUser;
import com.kedar.kapse.platform_core.security.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.representations.idm.RealmRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.keycloak.representations.idm.UserSessionRepresentation;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.OAuth2AuthenticatedPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Real security settings, all read from / written to Keycloak (the hospital's realm):
 *  - /api/sessions          the caller's own active logins (any user); end one or all others
 *  - /api/password-policy   the hospital's password rules (ADMIN)
 *  - /api/security-settings session timeouts and brute-force protection (ADMIN)
 *  - /api/security-posture  a score computed from the real settings above (ADMIN)
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class SecurityController {

    private final Keycloak keycloakAdmin;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;

    private RealmResource realm() {
        return keycloakAdmin.realm(TenantContext.getRequiredTenantId());
    }

    // ------------------------------------------------------------------ sessions

    @GetMapping("/api/sessions")
    public List<Map<String, Object>> mySessions() {
        String current = currentSessionId();
        List<Map<String, Object>> out = new ArrayList<>();
        for (UserSessionRepresentation s : realm().users().get(CurrentUser.get().id()).getUserSessions()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("ipAddress", s.getIpAddress());
            m.put("started", Instant.ofEpochMilli(s.getStart()).toString());
            m.put("lastAccess", Instant.ofEpochMilli(s.getLastAccess()).toString());
            m.put("applications", s.getClients() != null ? new ArrayList<>(s.getClients().values()) : List.of());
            m.put("current", s.getId().equals(current));
            out.add(m);
        }
        out.sort(Comparator.comparing((Map<String, Object> m) -> !(Boolean) m.get("current"))
                .thenComparing(m -> (String) m.get("lastAccess"), Comparator.reverseOrder()));
        return out;
    }

    /** End one of MY sessions (sign that device out). */
    @DeleteMapping("/api/sessions/{sessionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable String sessionId) {
        boolean mine = realm().users().get(CurrentUser.get().id()).getUserSessions().stream()
                .anyMatch(s -> s.getId().equals(sessionId));
        if (!mine) throw new EntityNotFoundException("Session not found");
        realm().deleteSession(sessionId);
        auditService.recordByCurrentUser(AuditEntityType.SECURITY, sessionId, AuditAction.SESSION_REVOKED, "One session");
    }

    /** Sign out everywhere except this device. */
    @DeleteMapping("/api/sessions")
    public Map<String, Integer> revokeOthers() {
        String current = currentSessionId();
        int n = 0;
        for (UserSessionRepresentation s : realm().users().get(CurrentUser.get().id()).getUserSessions()) {
            if (!s.getId().equals(current)) {
                realm().deleteSession(s.getId());
                n++;
            }
        }
        if (n > 0) {
            auditService.recordByCurrentUser(AuditEntityType.SECURITY, CurrentUser.get().id(), AuditAction.SESSION_REVOKED, n + " other sessions");
        }
        return Map.of("revoked", n);
    }

    // ------------------------------------------------------------ password policy

    private static final Pattern RULE = Pattern.compile("(\\w+)\\(([^)]*)\\)");

    @GetMapping("/api/password-policy")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getPasswordPolicy() {
        return parsePolicy(realm().toRepresentation().getPasswordPolicy());
    }

    /**
     * Body: {minLength, requireUppercase, requireLowercase, requireDigits, requireSpecial,
     *        passwordHistory, expireDays, notUsername}
     */
    @PutMapping("/api/password-policy")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updatePasswordPolicy(@RequestBody Map<String, Object> body) {
        int minLength = intIn(body, "minLength", 8, 6, 128);
        List<String> rules = new ArrayList<>();
        rules.add("length(" + minLength + ")");
        if (bool(body, "requireUppercase")) rules.add("upperCase(1)");
        if (bool(body, "requireLowercase")) rules.add("lowerCase(1)");
        if (bool(body, "requireDigits")) rules.add("digits(1)");
        if (bool(body, "requireSpecial")) rules.add("specialChars(1)");
        if (body.get("notUsername") == null || bool(body, "notUsername")) rules.add("notUsername(undefined)");
        int history = intIn(body, "passwordHistory", 0, 0, 24);
        if (history > 0) rules.add("passwordHistory(" + history + ")");
        int expire = intIn(body, "expireDays", 0, 0, 3650);
        if (expire > 0) rules.add("forceExpiredPasswordChange(" + expire + ")");

        RealmRepresentation rep = realm().toRepresentation();
        rep.setPasswordPolicy(String.join(" and ", rules));
        realm().update(rep);
        auditService.recordByCurrentUser(AuditEntityType.SECURITY, rep.getRealm(), AuditAction.PASSWORD_POLICY_UPDATED, rep.getPasswordPolicy());
        return parsePolicy(rep.getPasswordPolicy());
    }

    static Map<String, Object> parsePolicy(String policy) {
        Map<String, String> rules = new HashMap<>();
        if (policy != null) {
            Matcher m = RULE.matcher(policy);
            while (m.find()) rules.put(m.group(1), m.group(2));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("minLength", rules.containsKey("length") ? Integer.parseInt(rules.get("length")) : 0);
        out.put("requireUppercase", rules.containsKey("upperCase"));
        out.put("requireLowercase", rules.containsKey("lowerCase"));
        out.put("requireDigits", rules.containsKey("digits"));
        out.put("requireSpecial", rules.containsKey("specialChars"));
        out.put("notUsername", rules.containsKey("notUsername"));
        out.put("passwordHistory", rules.containsKey("passwordHistory") ? Integer.parseInt(rules.get("passwordHistory")) : 0);
        out.put("expireDays", rules.containsKey("forceExpiredPasswordChange") ? Integer.parseInt(rules.get("forceExpiredPasswordChange")) : 0);
        out.put("configured", policy != null && !policy.isBlank());
        return out;
    }

    // ---------------------------------------------------------- session settings

    @GetMapping("/api/security-settings")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> getSecuritySettings() {
        RealmRepresentation r = realm().toRepresentation();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("sessionIdleMinutes", r.getSsoSessionIdleTimeout() != null ? r.getSsoSessionIdleTimeout() / 60 : null);
        out.put("sessionMaxHours", r.getSsoSessionMaxLifespan() != null ? r.getSsoSessionMaxLifespan() / 3600 : null);
        out.put("bruteForceProtected", Boolean.TRUE.equals(r.isBruteForceProtected()));
        out.put("maxLoginFailures", r.getFailureFactor());
        return out;
    }

    /** Body: {sessionIdleMinutes (5-480), sessionMaxHours (1-72), bruteForceProtected, maxLoginFailures (3-30)} */
    @PutMapping("/api/security-settings")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> updateSecuritySettings(@RequestBody Map<String, Object> body) {
        RealmRepresentation r = realm().toRepresentation();
        if (body.containsKey("sessionIdleMinutes")) r.setSsoSessionIdleTimeout(intIn(body, "sessionIdleMinutes", 30, 5, 480) * 60);
        if (body.containsKey("sessionMaxHours")) r.setSsoSessionMaxLifespan(intIn(body, "sessionMaxHours", 10, 1, 72) * 3600);
        if (body.containsKey("bruteForceProtected")) r.setBruteForceProtected(bool(body, "bruteForceProtected"));
        if (body.containsKey("maxLoginFailures")) r.setFailureFactor(intIn(body, "maxLoginFailures", 5, 3, 30));
        realm().update(r);
        auditService.recordByCurrentUser(AuditEntityType.SECURITY, r.getRealm(), AuditAction.PASSWORD_POLICY_UPDATED, "Session settings: " + body);
        return getSecuritySettings();
    }

    // ----------------------------------------------------------- security posture

    /**
     * A score from REAL settings (not a made-up compliance number): each check is
     * read from Keycloak or the audit log, with what to do when it fails.
     */
    @GetMapping("/api/security-posture")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, Object> posture() {
        RealmRepresentation r = realm().toRepresentation();
        Map<String, Object> policy = parsePolicy(r.getPasswordPolicy());
        List<Map<String, Object>> checks = new ArrayList<>();

        checks.add(check("Password length", (Integer) policy.get("minLength") >= 8,
                "Minimum length " + policy.get("minLength"), "Set a minimum password length of 8 or more"));
        int complexity = (Boolean.TRUE.equals(policy.get("requireUppercase")) ? 1 : 0)
                + (Boolean.TRUE.equals(policy.get("requireLowercase")) ? 1 : 0)
                + (Boolean.TRUE.equals(policy.get("requireDigits")) ? 1 : 0)
                + (Boolean.TRUE.equals(policy.get("requireSpecial")) ? 1 : 0);
        checks.add(check("Password complexity", complexity >= 3,
                complexity + " of 4 character rules", "Require upper case, lower case, digits and special characters"));
        checks.add(check("Brute-force protection", Boolean.TRUE.equals(r.isBruteForceProtected()),
                Boolean.TRUE.equals(r.isBruteForceProtected()) ? "On" : "Off", "Turn on account lockout after failed logins"));
        boolean httpsOnly = "external".equals(r.getSslRequired()) || "all".equals(r.getSslRequired());
        checks.add(check("HTTPS required", httpsOnly, "SSL required: " + r.getSslRequired(), "Require HTTPS for logins"));
        int idle = r.getSsoSessionIdleTimeout() != null ? r.getSsoSessionIdleTimeout() / 60 : 0;
        checks.add(check("Idle session timeout", idle > 0 && idle <= 30, idle + " minutes", "Sign idle users out after 30 minutes or less"));

        // Two-factor adoption among staff accounts (users that are not patients)
        int staff = 0, withOtp = 0;
        for (UserRepresentation u : realm().users().list(0, 200)) {
            List<String> roles;
            try {
                roles = realm().users().get(u.getId()).roles().realmLevel().listEffective().stream().map(x -> x.getName()).toList();
            } catch (Exception e) {
                continue;
            }
            if (roles.contains("PATIENT") && !roles.contains("ADMIN")) continue;
            staff++;
            if (Boolean.TRUE.equals(u.isTotp())) withOtp++;
        }
        int pct = staff == 0 ? 0 : Math.round(100f * withOtp / staff);
        checks.add(check("Two-factor login for staff", staff > 0 && pct >= 80,
                withOtp + " of " + staff + " staff (" + pct + "%)", "Ask staff to set up an authenticator app (Settings > MFA)"));

        long recentAudit = auditLogRepository.search(null, null, LocalDateTime.now().minusDays(30), null, null,
                PageRequest.of(0, 1)).getTotalElements();
        checks.add(check("Audit trail active", recentAudit > 0,
                recentAudit + " events in the last 30 days", "Audit events are recorded automatically when staff, roles or security settings change"));

        long passed = checks.stream().filter(c -> Boolean.TRUE.equals(c.get("passed"))).count();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("score", Math.round(100f * passed / checks.size()));
        out.put("passed", passed);
        out.put("total", checks.size());
        out.put("checks", checks);
        return out;
    }

    // ------------------------------------------------------------------ helpers

    private static Map<String, Object> check(String name, boolean passed, String detail, String fix) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("passed", passed);
        m.put("detail", detail);
        m.put("recommendation", passed ? null : fix);
        return m;
    }

    private static boolean bool(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v instanceof Boolean b ? b : v != null && Boolean.parseBoolean(v.toString());
    }

    private static int intIn(Map<String, Object> body, String key, int dflt, int min, int max) {
        Object v = body.get(key);
        if (v == null) return dflt;
        int n;
        try {
            n = v instanceof Number num ? num.intValue() : Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be a number");
        }
        if (n < min || n > max) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, key + " must be between " + min + " and " + max);
        }
        return n;
    }

    private static String currentSessionId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof OAuth2AuthenticatedPrincipal p) {
            Object sid = p.getAttribute("sid");
            return sid != null ? sid.toString() : null;
        }
        return null;
    }
}
