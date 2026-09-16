package com.kedar.kapse.platform_core.event;

/** Kafka topic constants shared across services. */
public final class EventTopics {
    public static final String PATIENT_CREATED        = "patient.created";
    public static final String OTP_REQUESTED          = "otp.requested";
    public static final String PCC_SYNC_REQUESTED     = "pcc.sync.requested";
    public static final String PCC_SYNC_REQUESTED_DLQ = "pcc.sync.requested.dlq";

    private EventTopics() {}
}
