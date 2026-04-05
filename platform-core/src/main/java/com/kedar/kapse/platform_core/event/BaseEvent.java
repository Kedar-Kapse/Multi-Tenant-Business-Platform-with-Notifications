package com.kedar.kapse.platform_core.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;


@Data                                // Generates Getters, Setters, and toString automatically
@AllArgsConstructor                  // Creates a constructor with all fields
@NoArgsConstructor                   // Creates an empty constructor (required for Kafka/JSON)
@SuperBuilder                        // Lets you build objects easily: BaseEvent.builder()...build()
public class BaseEvent<T> {          // <T> is a "Generic" - it can carry any data type (User, Order, etc.)

    private String eventId;          // A unique ID to make sure we don't process the same message twice
    private String tenantId;         // The ID of the organization (tenant) this event belongs to
    private String eventType;        // The "Label" (e.g., "USER_CREATED") so we know what happened
    private String source;           // The name of the service that sent this (e.g., "business-service")
    private long timestamp;          // The exact time it was created (useful for tracking and logs)
    private T payload;               // The actual "Body" or data of the message (the User or Object)
}