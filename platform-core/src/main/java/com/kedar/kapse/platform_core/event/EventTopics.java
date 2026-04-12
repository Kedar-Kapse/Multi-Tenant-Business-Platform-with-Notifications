package com.kedar.kapse.platform_core.event;

/** Kafka topic constants shared across services. */
public final class EventTopics {
    public static final String PATIENT_CREATED = "patient.created";
    public static final String OTP_REQUESTED   = "otp.requested";

    private EventTopics() {}
}
