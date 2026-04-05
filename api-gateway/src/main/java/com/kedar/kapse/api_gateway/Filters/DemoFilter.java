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
 * ============================================================================
 * GLOBAL LOGGING FILTER — Logs Every Request Passing Through the Gateway
 * ============================================================================
 *
 * This filter runs for EVERY request that passes through the API Gateway,
 * BEFORE it reaches the downstream microservice.
 *
 * WHY A GLOBAL FILTER?
 * --------------------
 * In a microservices architecture, the gateway is the single entry point.
 * Logging here gives you a centralized audit trail of ALL API calls:
 *   - Who called what endpoint
 *   - Whether they had an Authorization header (JWT)
 *   - Which downstream service handled the request
 *   - How long the request took
 *
 * HOW GLOBAL FILTERS WORK:
 * -------------------------
 * Spring Cloud Gateway has two types of filters:
 *   1. GatewayFilter — applies to specific routes only
 *   2. GlobalFilter — applies to ALL routes (this is what we use)
 *
 * The Ordered interface controls filter execution order.
 * Lower numbers execute FIRST (before other filters).
 * We use -1 to ensure logging happens before security checks.
 *
 * FILTER CHAIN:
 *   Request → LoggingFilter → SecurityFilter → Route → Microservice
 *   Response ← LoggingFilter ← SecurityFilter ← Route ← Microservice
 */
@Component
public class DemoFilter implements GlobalFilter, Ordered {

    private static final Logger logger = LoggerFactory.getLogger(DemoFilter.class);

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        // Log request details
        String method = request.getMethod().name();
        String path = request.getURI().getPath();
        String remoteAddr = request.getRemoteAddress() != null
                ? request.getRemoteAddress().getAddress().getHostAddress()
                : "unknown";
        boolean hasAuth = request.getHeaders().containsKey("Authorization");

        logger.info("Gateway Request: {} {} | Client: {} | Auth: {}",
                method, path, remoteAddr, hasAuth ? "YES" : "NO");

        // Record start time for response logging
        long startTime = System.currentTimeMillis();

        // Continue the filter chain and log the response when complete
        return chain.filter(exchange).then(Mono.fromRunnable(() -> {
            long duration = System.currentTimeMillis() - startTime;
            int statusCode = exchange.getResponse().getStatusCode() != null
                    ? exchange.getResponse().getStatusCode().value()
                    : 0;

            logger.info("Gateway Response: {} {} | Status: {} | Duration: {}ms",
                    method, path, statusCode, duration);
        }));
    }

    /**
     * Order -1 ensures this filter runs BEFORE most other filters.
     * This is important for logging — we want to capture the request
     * before security filters potentially reject it.
     */
    @Override
    public int getOrder() {
        return -1;
    }
}
