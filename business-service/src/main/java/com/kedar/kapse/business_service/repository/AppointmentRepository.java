package com.kedar.kapse.business_service.repository;

import com.kedar.kapse.business_service.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    List<Appointment> findByPatientIdOrderByAppointmentDateDescStartTimeDesc(String patientId);
    List<Appointment> findByProviderIdOrderByAppointmentDateDescStartTimeDesc(String providerId);
    List<Appointment> findByPatientIdAndStatusOrderByAppointmentDateAscStartTimeAsc(String patientId, String status);
    List<Appointment> findByProviderIdAndAppointmentDate(String providerId, LocalDate date);
    long countByPatientIdAndStatus(String patientId, String status);
}
