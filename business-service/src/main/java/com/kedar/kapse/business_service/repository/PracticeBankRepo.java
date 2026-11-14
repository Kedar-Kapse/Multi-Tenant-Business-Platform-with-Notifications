package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.PracticeBankTransfer;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PracticeBankRepo extends JpaRepository<PracticeBankTransfer, UUID> {

    @Query("SELECT p FROM PracticeBankTransfer p WHERE p.id = :uuid")
    Optional<PracticeBankTransfer> findByUuid(@Param("uuid") UUID uuid);

    // Same query as above, but with a row-level WRITE lock.
    // Emits: SELECT ... FROM practice_bank_transfers WHERE id = ? FOR UPDATE
    // Any other transaction trying to read this row WAITS until this one commits/rolls back.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PracticeBankTransfer p WHERE p.id = :uuid")
    Optional<PracticeBankTransfer> findByUuidForUpdate(@Param("uuid") UUID uuid);

}
