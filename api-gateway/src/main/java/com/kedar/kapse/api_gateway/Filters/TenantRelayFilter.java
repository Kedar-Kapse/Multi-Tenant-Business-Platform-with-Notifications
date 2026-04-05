package com.kedar.kapse.api_gateway.Filters;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Gateway filter that ensures the X-TENANT-ID header is propagated to
 * all downstream microservices.
 *
 * If the header is already present in the incoming request, it is passed through.
 * This runs before the security filter so tenant context is available for JWT validation.
 *
 * FLOW:
 *   Client -> [X-TENANT-ID: hospital-a] -> Gateway -> [X-TENANT-ID: hospital-a] -> Microservice
 */
@Component
public class TenantRelayFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(TenantRelayFilter.class);
    private static final String TENANT_HEADER = "X-TENANT-ID";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String tenantId = exchange.getRequest().getHeaders().getFirst(TENANT_HEADER);

        if (tenantId != null && !tenantId.isBlank()) {
            logger.debug("Tenant header present: {}", tenantId);
            // Ensure the header is forwarded to downstream services
            ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header(TENANT_HEADER, tenantId.trim().toLowerCase())
                    .build();
            return chain.filter(exchange.mutate().request(mutatedRequest).build());
        }

        logger.debug("No tenant header on request: {}", exchange.getRequest().getURI().getPath());
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // Run before security filters (-2 < -1 logging filter)
        return -2;
    }
}
