package com.kedar.kapse.business_service.service;

import com.kedar.kapse.business_service.entity.Patient;
import com.kedar.kapse.business_service.repository.PatientRepository;
import com.kedar.kapse.platform_core.enums.PccSyncStatus;
import com.kedar.kapse.platform_core.event.BaseEvent;
import com.kedar.kapse.platform_core.event.EventTopics;
import com.kedar.kapse.platform_core.event.PccSyncPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Scheduled recovery job that handles two failure modes in the PCC sync pipeline:
 *
 * 1. Stuck IN_PROGRESS — consumer claimed a patient (set IN_PROGRESS + claimedAt) but the
 *    process was killed before writing SYNCED or FAILED. Without recovery, this patient would
 *    sit in IN_PROGRESS forever because claimForPccSync only reclaims PENDING/FAILED rows.
 *    Fix: reset to FAILED after a configurable timeout so the next run re-publishes the event.
 *
 * 2. Lost PENDING event — patient was saved with pccSyncStatus=PENDING, afterCommit() fired
 *    and called kafkaTemplate.send(), but the send was silently dropped (broker unreachable,
 *    app crash between commit and send ACK). This is the event-loss window that a full Outbox
 *    pattern would eliminate. This scheduler is a lighter-weight alternative: scan for PENDING
 *    rows older than a threshold and re-publish.
 *
 * Both runs are idempotent — claimForPccSync prevents the consumer from double-processing.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PccSyncRecoveryScheduler {

    private final PatientRepository patientRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /** How long IN_PROGRESS may stay before being considered stuck. Default 15 minutes. */
    @Value("${pcc.recovery.stuck-threshold-minutes:15}")
    private int stuckThresholdMinutes;

    /** How long PENDING may stay before being considered a lost event. Default 10 minutes. */
    @Value("${pcc.recovery.pending-threshold-minutes:10}")
    private int pendingThresholdMinutes;

    /**
     * Resets patients stuck in IN_PROGRESS to FAILED and re-publishes their sync event.
     * Runs every 5 minutes (configurable via pcc.recovery.stuck-cron).
     */
    @Scheduled(cron = "${pcc.recovery.stuck-cron:0 */5 * * * *}")
    @Transactional
    public void recoverStuckInProgress() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(stuckThresholdMinutes);
        List<Patient> stuck = patientRepository.findStuckInProgress(PccSyncStatus.IN_PROGRESS, threshold);

        if (stuck.isEmpty()) return;

        log.warn("PCC sync recovery: found {} patient(s) stuck IN_PROGRESS beyond {}min threshold",
                stuck.size(), stuckThresholdMinutes);

        for (Patient patient : stuck) {
            patient.setPccSyncStatus(PccSyncStatus.FAILED);
            patient.setPccFailedAt(LocalDateTime.now());
            patient.setPccLastError("Recovery: stuck IN_PROGRESS — consumer crashed before completing sync");
            patient.setPccRetryCount(patient.getPccRetryCount() + 1);
            patientRepository.save(patient);

            publishSyncEvent(patient, "recovery-stuck");
            log.info("PCC sync recovery: reset patientId={} to FAILED and re-published event", patient.getId());
        }
    }

    /**
     * Re-publishes sync events for patients in PENDING state older than the threshold.
     * Handles the event-loss window between afterCommit() and kafkaTemplate.send() ACK.
     * Runs every 10 minutes (configurable via pcc.recovery.pending-cron).
     */
    @Scheduled(cron = "${pcc.recovery.pending-cron:0 */10 * * * *}")
    public void recoverLostPendingEvents() {
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(pendingThresholdMinutes);
        List<Patient> stalePending = patientRepository.findStalePendingForSync(PccSyncStatus.PENDING, threshold);

        if (stalePending.isEmpty()) return;

        log.warn("PCC sync recovery: found {} patient(s) stuck in PENDING beyond {}min threshold — re-publishing events",
                stalePending.size(), pendingThresholdMinutes);

        for (Patient patient : stalePending) {
            publishSyncEvent(patient, "recovery-pending");
            log.info("PCC sync recovery: re-published event for PENDING patientId={}", patient.getId());
        }
    }

    private void publishSyncEvent(Patient patient, String reason) {
        try {
            PccSyncPayload payload = PccSyncPayload.builder()
                    .patientId(patient.getId().toString())
                    .tenantRealm(patient.getTenantRealm())
                    .build();
            BaseEvent<PccSyncPayload> event = BaseEvent.<PccSyncPayload>builder()
                    .eventId(UUID.randomUUID().toString())
                    .eventType("PCC_SYNC_REQUESTED")
                    .tenantId(patient.getTenantRealm())
                    .source("business-service-recovery:" + reason)
                    .timestamp(System.currentTimeMillis())
                    .payload(payload)
                    .build();
            kafkaTemplate.send(EventTopics.PCC_SYNC_REQUESTED, String.valueOf(patient.getId()), event);
        } catch (Exception e) {
            log.error("PCC recovery: failed to re-publish event for patientId={}: {}",
                    patient.getId(), e.getMessage());
        }
    }
}
