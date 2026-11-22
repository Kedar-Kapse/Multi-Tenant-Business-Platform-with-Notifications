package com.kedar.kapse.access_security_service.controller;

import com.kedar.kapse.access_security_service.service.UserService;
import com.kedar.kapse.platform_core.dto.CreateUserRequest;
import com.kedar.kapse.platform_core.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * Users across hospitals (takes any tenant id), so it is a platform-admin tool:
 * hospital admins manage their own people through Staff and Patients instead.
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@jakarta.validation.Valid @RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
    public List<UserResponse> listUsersByTenant(@PathVariable UUID tenantId) {
        return userService.listUsersByTenant(tenantId);
    }

    @GetMapping("/{userId}")
    @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
    public UserResponse getUserDetails(@PathVariable UUID userId) {
        return userService.getUserDetails(userId);
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("@platformAccess.isPlatformAdmin(authentication)")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disableUser(@PathVariable UUID userId) {
        userService.disableUser(userId);
    }
}
