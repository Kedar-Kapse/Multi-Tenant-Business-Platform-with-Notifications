package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {
    List<Invoice> findByPatientIdOrderByIssueDateDesc(String patientId);
    long countByPatientIdAndStatus(String patientId, String status);
    boolean existsByInvoiceNumber(String invoiceNumber);
}
