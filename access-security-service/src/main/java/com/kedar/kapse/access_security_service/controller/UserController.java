package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.platform_core.dto.CreateUserRequest;
import com.kedar.kapse.platform_core.dto.UserResponse;
import com.kedar.kapse.access_security_service.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER')")
    public List<UserResponse> listUsersByTenant(@PathVariable UUID tenantId) {
        return userService.listUsersByTenant(tenantId);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER', 'PHYSICIAN')")
    public UserResponse getUserDetails(@PathVariable UUID userId) {
        return userService.getUserDetails(userId);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PROVIDER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disableUser(@PathVariable UUID userId) {
        userService.disableUser(userId);
    }
}
