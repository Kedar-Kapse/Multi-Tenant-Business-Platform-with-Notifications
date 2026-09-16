package com.kedar.kapse.business_service.client;

import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.business_service.exception.PccNonRetryableException;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * HTTP client for PointClickCare REST API.
 *
 * Dev/staging: set pcc.api.enabled=false (default) — all calls are stubbed, no real HTTP is made.
 * Production: set pcc.api.enabled=true and supply credentials via env vars.
 *
 * Circuit breaker (Resilience4j "pcc-api" instance) wraps createPatient().
 * When the circuit opens (PCC is unavailable), the patient stays FAILED and can be
 * re-triggered manually by admin once PCC recovers.
 */
@Component
@Slf4j
public class PccApiClient {

    private final RestTemplate restTemplate;

    @Value("${pcc.api.base-url:}")
    private String baseUrl;

    @Value("${pcc.api.client-id:}")
    private String clientId;

    @Value("${pcc.api.client-secret:}")
    private String clientSecret;

    @Value("${pcc.api.token-endpoint:}")
    private String tokenEndpoint;

    @Value("${pcc.api.enabled:false}")
    private boolean enabled;

    /** Cached OAuth2 bearer token and its expiry epoch-ms. Thread-safe via volatile + synchronized fetch. */
    private volatile String cachedToken;
    private volatile long tokenExpiresAtMs = 0;

    public PccApiClient() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(10_000);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * Registers the patient in PCC and returns the PCC-assigned patient ID.
     *
     * Idempotency: patient.getId() is sent as the Idempotency-Key header. If this exact
     * request was already processed by PCC, they return the same response without creating
     * a duplicate. This covers the case where PCC succeeded but our DB save failed.
     *
     * Circuit breaker: if PCC is consistently failing, the circuit opens after the configured
     * failure threshold and subsequent calls fail fast with CallNotPermittedException.
     */
    @CircuitBreaker(name = "pcc-api")
    public String createPatient(Patient patient) {
        if (!enabled) {
            String simulatedId = "PCC-DEV-" + patient.getId().toString().substring(0, 8).toUpperCase();
            log.info("[PCC-STUB] pcc.api.enabled=false — simulatedId={} for patient id={}",
                    simulatedId, patient.getId());
            return simulatedId;
        }

        String url = baseUrl + "/api/patientsdata/v3/patients";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set(HttpHeaders.AUTHORIZATION, "Bearer " + getAccessToken());
        // Idempotency key: stable per patient, safe to retry without PCC duplicate creation.
        headers.set("Idempotency-Key", patient.getId().toString());

        Map<String, Object> body = buildPccPatientPayload(patient);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url, HttpMethod.POST, new HttpEntity<>(body, headers), getMapType());

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null || !responseBody.containsKey("patientId")) {
                throw new IllegalStateException("PCC response missing patientId field: " + responseBody);
            }
            String pccId = responseBody.get("patientId").toString();
            log.info("PCC createPatient success: pccPatientId={} patientId={}", pccId, patient.getId());
            return pccId;

        } catch (HttpClientErrorException.Conflict e) {
            // 409 — PCC already has a patient for this idempotency key or MRN.
            // Idempotent retry from the same patient will return the same patientId.
            // A true MRN collision (different patient) requires manual resolution.
            log.warn("PCC 409 Conflict for patientId={}: {}. Treating as non-retryable — check PCC manually.",
                    patient.getId(), e.getResponseBodyAsString());
            throw new PccNonRetryableException(
                    "PCC conflict (409) for patient " + patient.getId() + ": " + e.getResponseBodyAsString(), e);

        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 429) {
                // Rate limited — let Kafka retry with exponential backoff.
                log.warn("PCC 429 rate-limited for patientId={} — will retry", patient.getId());
                throw new RuntimeException("PCC rate-limited (429) for patient " + patient.getId(), e);
            }
            // Other 4xx (400, 422 etc.) — bad data, won't succeed on retry.
            log.error("PCC {}  for patientId={}: {}", status, patient.getId(), e.getResponseBodyAsString());
            throw new PccNonRetryableException(
                    "PCC client error (" + status + ") for patient " + patient.getId() + ": " + e.getResponseBodyAsString(), e);
        }
    }

    private Map<String, Object> buildPccPatientPayload(Patient patient) {
        Map<String, Object> identifiers = new HashMap<>();
        identifiers.put("mrn", patient.getMrn());

        Map<String, Object> payload = new HashMap<>();
        payload.put("firstName",   patient.getFirstName());
        payload.put("lastName",    patient.getLastName());
        payload.put("birthDate",   patient.getDateOfBirth() != null ? patient.getDateOfBirth().toString() : null);
        payload.put("gender",      patient.getGender() != null ? patient.getGender().name() : null);
        payload.put("email",       patient.getEmail());
        payload.put("identifiers", identifiers);
        return payload;
    }

    /**
     * Returns a valid PCC OAuth2 bearer token, fetching and caching a new one when the
     * current token is expired or missing. Refresh happens 60 seconds before actual expiry
     * to avoid using a token that expires mid-request.
     *
     * PCC uses the OAuth2 Client Credentials grant:
     *   POST {tokenEndpoint} with client_id + client_secret → returns access_token + expires_in
     */
    private synchronized String getAccessToken() {
        long now = System.currentTimeMillis();
        if (cachedToken != null && now < tokenExpiresAtMs) {
            return cachedToken;
        }

        log.debug("Fetching new PCC OAuth2 token");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    tokenEndpoint, HttpMethod.POST,
                    new HttpEntity<>(form, headers), getMapType());

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("access_token")) {
                throw new IllegalStateException("PCC token response missing access_token field");
            }
            cachedToken = body.get("access_token").toString();
            int expiresIn = body.containsKey("expires_in")
                    ? Integer.parseInt(body.get("expires_in").toString())
                    : 3600;
            // Refresh 60s early to avoid using an about-to-expire token.
            tokenExpiresAtMs = now + ((long) expiresIn - 60) * 1_000L;
            log.debug("PCC OAuth2 token acquired, expires in {}s", expiresIn);
            return cachedToken;

        } catch (Exception e) {
            log.error("Failed to fetch PCC OAuth2 token: {}", e.getMessage());
            throw new RuntimeException("PCC token fetch failed", e);
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private Class<Map<String, Object>> getMapType() {
        return (Class) Map.class;
    }
}
