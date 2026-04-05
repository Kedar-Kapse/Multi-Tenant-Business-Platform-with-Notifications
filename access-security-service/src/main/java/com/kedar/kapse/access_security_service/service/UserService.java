package com.kedar.kapse.access_security_service.service;

import com.kedar.kapse.platform_core.dto.CreateUserRequest;
import com.kedar.kapse.platform_core.dto.UserResponse;
import com.kedar.kapse.platform_core.entity.Tenant;
import com.kedar.kapse.platform_core.entity.User;
import com.kedar.kapse.platform_core.repository.TenantRepository;
import com.kedar.kapse.platform_core.repository.UserRepository;
import com.kedar.kapse.platform_core.enums.UserStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final KeycloakService keycloakService;

    public UserResponse createUser(CreateUserRequest request) {
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new EntityNotFoundException("Tenant not found"));

        keycloakService.createUser(request);

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .tenant(tenant)
                .status(UserStatus.ACTIVE)
                .build();

        user = userRepository.save(user);
        return UserResponse.fromEntity(user);
    }

    public List<UserResponse> listUsersByTenant(UUID tenantId) {
        return userRepository.findByTenantId(tenantId).stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public UserResponse getUserDetails(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        return UserResponse.fromEntity(user);
    }

    public void disableUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        user.setStatus(UserStatus.DISABLED);
        userRepository.save(user);
    }
}
