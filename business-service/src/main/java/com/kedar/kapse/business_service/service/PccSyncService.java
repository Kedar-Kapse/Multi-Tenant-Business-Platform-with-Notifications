package com.kedar.kapse.business_service.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kedar.kapse.business_service.client.PccApiClient;
import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.business_service.exception.PccNonRetryableException;
import com.kedar.kapse.business_service.repository.PatientRepository;
import com.kedar.kapse.platform_core.enums.PccSyncStatus;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.PccSyncPayload;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.slf4j.MDC;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Kafka  for PCC sync events.
 *
 * Intentionally NOT @Transactional at the class/method level. Each patientRepository.save()
 * runs in its own transaction. If the listener were @Transactional, a re-throw after setting
 * FAILED would roll back the status update, leaving the patient permanently stuck as IN_PROGRESS.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PccSyncService {

    private final PatientRepository patientRepository;
    private final PccApiClient pccApiClient;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = EventTopics.PCC_SYNC_REQUESTED, groupId = "pcc-sync-worker")
    public void handlePccSyncRequested(ConsumerRecord<String, String> record) {
        BaseEvent<PccSyncPayload> event;
        try {
            event = objectMapper.readValue(record.value(), new TypeReference<>() {});
        } catch (Exception e) {
            log.error("PCC sync: unparseable payload at offset={} partition={} — routing to DLQ via re-throw",
                    record.offset(), record.partition(), e);
            // Re-throw so the DefaultErrorHandler sends this to DLQ immediately.
            // There is nothing to retry — the payload is malformed.
            throw new PccNonRetryableException("Malformed PCC sync event at offset=" + record.offset(), e);
        }

        UUID patientId = UUID.fromString(event.getPayload().getPatientId());

        // Set MDC fields so every log line in this call stack carries tenant + patient context.
        MDC.put("patientId", patientId.toString());
        MDC.put("tenantId", event.getTenantId());
        MDC.put("eventId", event.getEventId());
        try {
            processSync(patientId, event);
        } finally {
            MDC.clear();
        }
    }

    private void processSync(UUID patientId, BaseEvent<PccSyncPayload> event) {
        log.info("PCC sync received: patientId={} tenant={} eventVersion={}",
                patientId, event.getTenantId(), event.getVersion());

        // Atomic claim — sets IN_PROGRESS + records claimedAt in one UPDATE.
        // Returns 0 if status is already IN_PROGRESS (another instance is processing)
        // or SYNCED (already done). Prevents double-processing in multi-instance clusters.
        int claimed = patientRepository.claimForPccSync(
                patientId,
                PccSyncStatus.IN_PROGRESS,
                LocalDateTime.now(),
                PccSyncStatus.PENDING,
                PccSyncStatus.FAILED);

        if (claimed == 0) {
            log.info("PCC sync skipped: patientId={} already claimed or SYNCED", patientId);
            return;
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new EntityNotFoundException("Patient not found: " + patientId));

        // Idempotency guard: if a previous attempt reached PCC successfully but our DB save
        // failed (rare), pccPatientId is already set. Skip the API call, just mark SYNCED.
        if (patient.getPccPatientId() != null) {
            log.warn("PCC sync idempotency guard triggered: patientId={} already has pccPatientId={} — marking SYNCED",
                    patientId, patient.getPccPatientId());
            patient.setPccSyncStatus(PccSyncStatus.SYNCED);
            patient.setPccSyncedAt(LocalDateTime.now());
            patient.setPccLastError(null);
            patientRepository.save(patient);
            return;
        }

        try {
            String pccPatientId = pccApiClient.createPatient(patient);

            patient.setPccPatientId(pccPatientId);
            patient.setPccSyncStatus(PccSyncStatus.SYNCED);
            patient.setPccSyncedAt(LocalDateTime.now());
            patient.setPccLastError(null);
            patientRepository.save(patient);

            log.info("PCC sync SYNCED: patientId={} pccPatientId={} retryCount={}",
                    patientId, pccPatientId, patient.getPccRetryCount());

        } catch (PccNonRetryableException e) {
            // 4xx client error — retrying will never succeed. Persist FAILED and re-throw
            // so the DefaultErrorHandler routes straight to DLQ (no retry).
            int retryCount = patient.getPccRetryCount() + 1;
            patient.setPccSyncStatus(PccSyncStatus.FAILED);
            patient.setPccFailedAt(LocalDateTime.now());
            patient.setPccRetryCount(retryCount);
            patient.setPccLastError(truncate("Non-retryable: " + e.getMessage(), 500));
            patientRepository.save(patient);
            log.error("PCC sync NON-RETRYABLE FAILURE: patientId={} retryCount={} — routing to DLQ. error={}",
                    patientId, retryCount, e.getMessage());
            throw e;

        } catch (Exception e) {
            // Transient failure (5xx, timeout, circuit open) — persist FAILED so this
            // patient is visible to admins and the recovery scheduler, then re-throw
            // so the DefaultErrorHandler applies exponential backoff retries.
            int retryCount = patient.getPccRetryCount() + 1;
            patient.setPccSyncStatus(PccSyncStatus.FAILED);
            patient.setPccFailedAt(LocalDateTime.now());
            patient.setPccRetryCount(retryCount);
            patient.setPccLastError(truncate(e.getMessage(), 500));
            patientRepository.save(patient);
            log.error("PCC sync FAILED: patientId={} retryCount={} error={}",
                    patientId, retryCount, e.getMessage());
            throw new RuntimeException("PCC sync failed for patient " + patientId + " (attempt " + retryCount + ")", e);
        }
    }

    /**
     * Dead-letter consumer — receives messages that exhausted all retries.
     * pccSyncStatus is already FAILED + pccLastError is populated from the last failed attempt.
     * Logs for alerting / manual intervention by admin.
     */
    @KafkaListener(topics = EventTopics.PCC_SYNC_REQUESTED_DLQ, groupId = "pcc-sync-dlq")
    public void handleDlq(ConsumerRecord<String, String> record) {
        try {
            BaseEvent<PccSyncPayload> event = objectMapper.readValue(record.value(), new TypeReference<>() {});
            log.error("PCC sync DEAD LETTER: patientId={} tenant={} offset={} — all retries exhausted. " +
                      "Admin action required: check pccLastError on patient and re-trigger sync via UI.",
                    event.getPayload().getPatientId(), event.getTenantId(), record.offset());
        } catch (Exception e) {
            log.error("PCC DLQ: unparseable dead letter at offset={} partition={}: {}",
                    record.offset(), record.partition(), e.getMessage());
        }
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return null;
        return s.length() <= maxLen ? s : s.substring(0, maxLen - 3) + "...";
    }
}
