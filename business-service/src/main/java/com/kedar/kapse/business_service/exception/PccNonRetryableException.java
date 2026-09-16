package com.kedar.kapse.business_service.exception;

/**
 * Thrown when the PCC API returns a client error (4xx, excluding 429) that will never
 * succeed on retry — e.g. 400 Bad Request (invalid patient data) or 409 Conflict
 * (patient already exists in PCC with a different identity).
 *
 * The Kafka DefaultErrorHandler is configured to skip retries for this exception type
 * and route the message directly to the DLQ. The patient's pccSyncStatus is set to
 * FAILED with the error stored in pccLastError for admin visibility.
 */
public class PccNonRetryableException extends RuntimeException {

    public PccNonRetryableException(String message) {
        super(message);
    }

    public PccNonRetryableException(String message, Throwable cause) {
        super(message, cause);
    }
}
