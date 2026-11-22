package com.kedar.kapse.platform_core.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * An in-app notification for one user (by Keycloak user id). The hospital travels
 * in BaseEvent.tenantId.
 *
 * type: APPOINTMENT_BOOKED, APPOINTMENT_CANCELLED, MESSAGE_RECEIVED, INVOICE_CREATED,
 *       NOTE_SIGNED, ...  link: path inside the recipient's portal, e.g. "/appointments".
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationRequestedPayload {
    private String recipientId;
    private String type;
    private String title;
    private String body;
    private String link;
}
