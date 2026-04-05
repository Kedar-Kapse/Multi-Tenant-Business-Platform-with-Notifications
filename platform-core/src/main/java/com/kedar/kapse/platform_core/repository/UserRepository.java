package com.kedar.kapse.platform_core.repository;

import com.kedar.kapse.platform_core.entity.User;
import com.kedar.kapse.platform_core.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    List<User> findByTenantId(UUID tenantId);

    @Query("SELECT COUNT(DISTINCT u) FROM User u JOIN u.roles r WHERE r.name <> 'PATIENT'")
    long countStaffMembers();

    long countByStatus(UserStatus status);
}
