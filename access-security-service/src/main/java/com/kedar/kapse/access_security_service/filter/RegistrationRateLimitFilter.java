// ====================================================================
// PACKAGE DECLARATION
// ====================================================================
// Tells Java this class lives in the 'filter' folder.
// Spring uses this to know WHERE to find this class when scanning.
package com.kedar.kapse.access_security_service.filter;


// ====================================================================
// IMPORTS - external classes we need
// ====================================================================

// Bucket4j classes - the rate limit library
import io.github.bucket4j.Bandwidth;   // Defines "max tokens + refill rule"
import io.github.bucket4j.Bucket;      // The actual token bucket
import io.github.bucket4j.Refill;      // How tokens get added back over time

// Jakarta Servlet classes - the HTTP request/response objects
import jakarta.servlet.FilterChain;             // The chain of filters
import jakarta.servlet.ServletException;        // Exception type filters throw
import jakarta.servlet.http.HttpServletRequest;  // Incoming HTTP request
import jakarta.servlet.http.HttpServletResponse; // Outgoing HTTP response

// Spring classes - the framework we use
import org.springframework.beans.factory.annotation.Value;  // Read values from application.yml
import org.springframework.stereotype.Component;            // Mark class as Spring-managed
import org.springframework.web.filter.OncePerRequestFilter; // Spring's filter base class

// Java standard library
import java.io.IOException;                         // Exception for I/O errors
import java.time.Duration;                          // Time amount (minutes, hours, etc.)
import java.util.Map;                               // Map interface
import java.util.concurrent.ConcurrentHashMap;      // Thread-safe Map implementation


// ====================================================================
// CLASS DECLARATION
// ====================================================================

// @Component tells Spring:
//   "Hey Spring, please create ONE instance of this class
//    and add it to the IoC Container (bean factory).
//    Also auto-register it in the filter chain because
//    it extends OncePerRequestFilter."
//
// Without @Component, Spring would NEVER know this class exists
// and our rate limiter would never run.
@Component
// Extends OncePerRequestFilter means:
//   "I am a Spring filter that runs ONCE per request"
//   (even if request goes through multiple servlets internally)
public class RegistrationRateLimitFilter extends OncePerRequestFilter {


    // ================================================================
    // CONFIG FIELDS - read from application.yml
    // ================================================================

    // @Value reads from application.yml the value at: rate-limit.registration.capacity
    // ${...} = Spring placeholder syntax
    // capacity = max number of tokens the bucket can hold (default 3)
    @Value("${rate-limit.registration.capacity}")
    private int capacity;

    // refillTokens = how many tokens get added back during each refill cycle
    // (default 3 — same as capacity, so bucket fully refills)
    @Value("${rate-limit.registration.refill-tokens}")
    private int refillTokens;

    // refillPeriodMinutes = how often (in minutes) the bucket refills
    // (default 60 — so every hour, 3 fresh tokens)
    @Value("${rate-limit.registration.refill-period-minutes}")
    private int refillPeriodMinutes;


    // ================================================================
    // BUCKET STORAGE - one bucket per client IP
    // ================================================================

    // This is a Map that stores ONE bucket for each unique IP address.
    //   Key   = IP address (String like "192.168.1.5")
    //   Value = the Bucket for that IP
    //
    // ConcurrentHashMap (not regular HashMap) because:
    //   - Many users hit the server SIMULTANEOUSLY (multi-threaded)
    //   - Regular HashMap can break/corrupt with concurrent access
    //   - ConcurrentHashMap is THREAD-SAFE
    //
    // 'final' = the reference cannot change, but the contents CAN change
    //           (we add/remove entries to/from the map, but never replace the map itself)
    private final Map<String, Bucket> bucketsPerIp = new ConcurrentHashMap<>();


    // ================================================================
    // HELPER METHOD - creates a fresh bucket
    // ================================================================

    // This method builds a NEW empty bucket using our config values.
    // Called whenever a new IP shows up for the first time.
    private Bucket createNewBucket() {

        // Step 1: Define the bandwidth (the bucket's rules)
        //   Bandwidth.classic(capacity, refill rule)
        //   - capacity = max tokens (3)
        //   - Refill.intervally(...) = "add N tokens every X minutes"
        Bandwidth limit = Bandwidth.classic(
                capacity,                                              // 3 tokens max
                Refill.intervally(                                    // refill mode
                        refillTokens,                                  // add 3 tokens
                        Duration.ofMinutes(refillPeriodMinutes)        // every 60 minutes
                )
        );

        // Step 2: Build the bucket with this bandwidth rule
        //   Bucket.builder() = fluent API to construct
        //   .addLimit(limit) = apply our rule
        //   .build() = finalize and return
        return Bucket.builder().addLimit(limit).build();
    }


    // ================================================================
    // MAIN FILTER METHOD - runs for EVERY HTTP request
    // ================================================================

    // @Override means: "I am replacing the parent class's empty method
    //                   with my own implementation"
    @Override
    // doFilterInternal is called by Spring for every HTTP request.
    // We MUST implement this method because OncePerRequestFilter says so.
    //
    // Parameters:
    //   request     = info about the incoming HTTP request (URL, headers, body)
    //   response    = the HTTP response we will send back to client
    //   filterChain = the rest of the filters/controllers after us
    //
    // throws ServletException, IOException = if anything fails, throw these
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // ============ STEP 1: Get the URL of the incoming request ============

        // Examples of what getRequestURI() returns:
        //   "/api/auth/register/complete"
        //   "/api/auth/login"
        //   "/api/patients/123"
        String path = request.getRequestURI();


        // ============ STEP 2: Check if this is a URL we care about ============

        // We only rate-limit 2 endpoints:
        //   - /api/auth/register/complete
        //   - /api/auth/forgot-password/complete
        //
        // For all OTHER URLs, we don't care - just let them pass through.
        boolean isRegistrationRoute =
                path.equals("/api/auth/register/complete")
                        || path.equals("/api/auth/forgot-password/complete");


        // ============ STEP 3: Skip rate limit for non-registration URLs ============

        // If this is NOT a registration URL:
        //   - call filterChain.doFilter() to pass to the next filter/controller
        //   - return immediately (don't run the rate limit logic)
        if (!isRegistrationRoute) {
            // doFilter() = "pass this request to the next thing in the chain"
            // (next filter, or if no more filters, the controller)
            filterChain.doFilter(request, response);
            return;  // STOP here - exit the method
        }


        // ============ STEP 4: Get the client's IP address ============

        // We use a helper method (defined below) that handles proxies correctly.
        // Example IP: "192.168.1.42" or "10.0.0.5"
        String clientIp = getClientIp(request);


        // ============ STEP 5: Get or create a bucket for this IP ============

        // computeIfAbsent does TWO things in one line:
        //   1. If clientIp ALREADY exists as a key in the map -> return that bucket
        //   2. If clientIp is NEW (first request) -> call createNewBucket(),
        //      store it in the map, then return it.
        //
        // The "ip -> createNewBucket()" is a lambda (anonymous function).
        // It says: "given this IP, create a new bucket for it"
        Bucket bucket = bucketsPerIp.computeIfAbsent(clientIp,
                ip -> createNewBucket());


        // ============ STEP 6: Try to consume 1 token from the bucket ============

        // tryConsume(1) attempts to take 1 token from the bucket.
        //   Returns TRUE  -> token was available, took it (bucket now has 1 less)
        //   Returns FALSE -> bucket is empty, no token taken
        if (bucket.tryConsume(1)) {

            // === Token was taken successfully (request allowed) ===
            // Let the request continue to the controller.
            filterChain.doFilter(request, response);

        } else {

            // === No token available (rate limit hit!) ===
            // BLOCK the request - controller will NEVER run.

            // Set HTTP status to 429 (Too Many Requests)
            response.setStatus(429);

            // Tell the client the response is JSON
            response.setContentType("application/json");

            // Write the error message as JSON in the response body
            // The \" is an escaped quote because we're inside a String
            response.getWriter().write(
                    "{\"error\":\"Too many requests. Please try again later.\"}"
            );

            // NOTE: We do NOT call filterChain.doFilter() here.
            // That means the request STOPS at this filter.
            // Controller is never called. DB is never queried.
            // Bad actor blocked. Server protected.
        }
    }


    // ================================================================
    // HELPER METHOD - extracts client IP from request
    // ================================================================

    // Why a separate method?
    //   Behind a proxy/load balancer, request.getRemoteAddr() returns the
    //   proxy's IP (same for all users!). The REAL user IP is in a
    //   special header: "X-Forwarded-For"
    private String getClientIp(HttpServletRequest request) {

        // Read the X-Forwarded-For header (set by proxies like Nginx, Cloudflare)
        // If multiple proxies, this can contain comma-separated IPs like:
        //   "192.168.1.5, 10.0.0.1, 172.16.0.1"
        String xForwardedFor = request.getHeader("X-Forwarded-For");

        // Check if the header is present and not empty
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {

            // Split by comma and take the FIRST IP (= the original client)
            // .trim() removes any whitespace around it
            return xForwardedFor.split(",")[0].trim();
        }

        // If no proxy header found, fall back to direct connection IP
        // (this works for local dev when there's no proxy)
        return request.getRemoteAddr();
    }
}
