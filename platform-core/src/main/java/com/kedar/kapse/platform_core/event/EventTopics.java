package com.kedar.kapse.platform_core.event;

/** Kafka topic constants shared across services. */
public final class EventTopics {
    public static final String PATIENT_CREATED        = "patient.created";
    public static final String PATIENT_CREATED_DLQ    = "patient.created.dlq";
    public static final String OTP_REQUESTED          = "otp.requested";
    public static final String OTP_REQUESTED_DLQ      = "otp.requested.dlq";
    public static final String PCC_SYNC_REQUESTED     = "pcc.sync.requested";
    public static final String PCC_SYNC_REQUESTED_DLQ = "pcc.sync.requested.dlq";
    /** "Show this user an in-app notification" (bell + Notifications page). */
    public static final String NOTIFICATION_REQUESTED     = "notification.requested";
    public static final String NOTIFICATION_REQUESTED_DLQ = "notification.requested.dlq";

    private EventTopics() {}
}
