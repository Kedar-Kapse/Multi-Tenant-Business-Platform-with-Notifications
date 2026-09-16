package com.kedar.kapse.business_service.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Guards all /internal/** routes with a shared service-to-service API key.
 *
 * These endpoints must never be reachable from the API gateway or external clients.
 * Two layers of protection:
 *   1. This filter rejects any request to /internal/** that lacks the correct
 *      X-INTERNAL-API-KEY header.
 *   2. The API gateway (or load balancer) should block /internal/** entirely.
 *
 * Key comparison uses SHA-256 hashing before MessageDigest.isEqual to ensure
 * constant-time comparison regardless of key length.
 */
@Component
@Slf4j
public class InternalApiKeyFilter extends OncePerRequestFilter {

    private static final String INTERNAL_API_KEY_HEADER = "X-INTERNAL-API-KEY";
    private static final String INTERNAL_PATH_PREFIX = "/internal/";

    @Value("${internal.api-key:}")
    private String configuredKey;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain chain) throws ServletException, IOException {

        String uri = request.getRequestURI();
        if (!uri.startsWith(INTERNAL_PATH_PREFIX)) {
            chain.doFilter(request, response);
            return;
        }

        if (configuredKey == null || configuredKey.isBlank()) {
            log.error("internal.api-key is not configured — rejecting all /internal requests");
            response.setStatus(HttpStatus.FORBIDDEN.value());
            return;
        }

        String provided = request.getHeader(INTERNAL_API_KEY_HEADER);
        if (!keysMatch(provided, configuredKey)) {
            log.warn("Rejected /internal request: invalid or missing {} from {}",
                    INTERNAL_API_KEY_HEADER, request.getRemoteAddr());
            response.setStatus(HttpStatus.FORBIDDEN.value());
            return;
        }

        chain.doFilter(request, response);
    }

    private static boolean keysMatch(String provided, String configured) {
        if (provided == null || provided.isBlank()) return false;
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] configuredHash = digest.digest(configured.getBytes(StandardCharsets.UTF_8));
            digest.reset();
            byte[] providedHash = digest.digest(provided.getBytes(StandardCharsets.UTF_8));
            return MessageDigest.isEqual(configuredHash, providedHash);
        } catch (NoSuchAlgorithmException e) {
            return false;
        }
    }
}
