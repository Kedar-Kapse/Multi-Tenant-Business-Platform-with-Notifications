package com.kedar.kapse.platform_core.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;


@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
public class BaseEvent<T> {

    /** Monotonically increasing schema version. Increment when payload fields are added/removed. */
    @lombok.Builder.Default
    private String version = "1";

    private String eventId;
    private String tenantId;
    private String eventType;
    private String source;
    private long timestamp;
    private T payload;
}