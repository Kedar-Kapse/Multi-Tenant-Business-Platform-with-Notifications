package com.kedar.kapse.business_service.config;

import com.kedar.kapse.business_service.entity.Claim;
import com.kedar.kapse.business_service.entity.FeeSchedule;
import com.kedar.kapse.business_service.repository.ClaimRepository;
import com.kedar.kapse.business_service.repository.FeeScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(30)
public class FinancialDataSeeder implements CommandLineRunner {

    private final ClaimRepository claimRepo;
    private final FeeScheduleRepository feeRepo;

    @Override
    public void run(String... args) {
        seedClaims();
        seedFeeSchedules();
    }

    private void seedClaims() {
        if (claimRepo.count() > 0) { log.info("Claims already seeded"); return; }

        List<Claim> claims = List.of(
            Claim.builder().claimId("CLM-2026-0001").patientName("Rahul Sharma").patientId("PAT-001").payerName("Star Health Insurance").provider("Dr. Priya Desai").cptCode("99213").icdCode("I10").description("Office visit - hypertension follow-up").amount(new BigDecimal("4500.00")).allowedAmount(new BigDecimal("3800.00")).paidAmount(new BigDecimal("3800.00")).dateSubmitted(LocalDate.of(2026,3,5)).dateProcessed(LocalDate.of(2026,3,15)).status("PAID").build(),
            Claim.builder().claimId("CLM-2026-0002").patientName("Sneha Kulkarni").patientId("PAT-002").payerName("ICICI Lombard").provider("Dr. Amit Patel").cptCode("99214").icdCode("E11.9").description("Office visit - diabetes management, moderate complexity").amount(new BigDecimal("6200.00")).allowedAmount(new BigDecimal("5500.00")).paidAmount(new BigDecimal("5500.00")).dateSubmitted(LocalDate.of(2026,3,8)).dateProcessed(LocalDate.of(2026,3,20)).status("PAID").build(),
            Claim.builder().claimId("CLM-2026-0003").patientName("Vikram Singh").patientId("PAT-003").payerName("HDFC ERGO").provider("Dr. Priya Desai").cptCode("99215").icdCode("I50.9").description("Office visit - heart failure, high complexity").amount(new BigDecimal("8500.00")).allowedAmount(new BigDecimal("7200.00")).dateSubmitted(LocalDate.of(2026,3,10)).status("IN_REVIEW").build(),
            Claim.builder().claimId("CLM-2026-0004").patientName("Meena Joshi").patientId("PAT-004").payerName("New India Assurance").provider("Dr. Sanjay Kumar").cptCode("90834").icdCode("F32.1").description("Psychotherapy session, 45 min - depression").amount(new BigDecimal("3500.00")).dateSubmitted(LocalDate.of(2026,3,12)).status("SUBMITTED").build(),
            Claim.builder().claimId("CLM-2026-0005").patientName("Arjun Reddy").patientId("PAT-005").payerName("Bajaj Allianz").provider("Dr. Priya Desai").cptCode("85025").icdCode("Z00.00").description("Complete blood count - annual physical").amount(new BigDecimal("1200.00")).allowedAmount(new BigDecimal("900.00")).paidAmount(new BigDecimal("900.00")).dateSubmitted(LocalDate.of(2026,3,1)).dateProcessed(LocalDate.of(2026,3,8)).status("PAID").build(),
            Claim.builder().claimId("CLM-2026-0006").patientName("Pooja Nair").patientId("PAT-006").payerName("Star Health Insurance").provider("Dr. Amit Patel").cptCode("71046").icdCode("J18.9").description("Chest X-ray 2 views - pneumonia workup").amount(new BigDecimal("2800.00")).allowedAmount(new BigDecimal("1500.00")).dateSubmitted(LocalDate.of(2026,3,15)).dateProcessed(LocalDate.of(2026,3,25)).status("DENIED").denialReason("Pre-authorization not obtained").build(),
            Claim.builder().claimId("CLM-2026-0007").patientName("Ravi Menon").patientId("PAT-007").payerName("ICICI Lombard").provider("Dr. Sanjay Kumar").cptCode("99223").icdCode("I63.9").description("Initial hospital inpatient care - cerebral infarction").amount(new BigDecimal("25000.00")).allowedAmount(new BigDecimal("22000.00")).dateSubmitted(LocalDate.of(2026,3,18)).status("APPROVED").build(),
            Claim.builder().claimId("CLM-2026-0008").patientName("Anita Deshmukh").patientId("PAT-008").payerName("HDFC ERGO").provider("Dr. Priya Desai").cptCode("97110").icdCode("M54.5").description("Therapeutic exercises - low back pain rehabilitation").amount(new BigDecimal("2000.00")).dateSubmitted(LocalDate.of(2026,3,20)).status("SUBMITTED").build(),
            Claim.builder().claimId("CLM-2026-0009").patientName("Suresh Patil").patientId("PAT-009").payerName("New India Assurance").provider("Dr. Amit Patel").cptCode("80053").icdCode("E78.5").description("Comprehensive metabolic panel - dyslipidemia").amount(new BigDecimal("1800.00")).allowedAmount(new BigDecimal("1200.00")).paidAmount(new BigDecimal("1200.00")).dateSubmitted(LocalDate.of(2026,2,25)).dateProcessed(LocalDate.of(2026,3,5)).status("PAID").build(),
            Claim.builder().claimId("CLM-2026-0010").patientName("Kavita Rao").patientId("PAT-010").payerName("Bajaj Allianz").provider("Dr. Sanjay Kumar").cptCode("20610").icdCode("M17.11").description("Joint injection - right knee osteoarthritis").amount(new BigDecimal("5500.00")).allowedAmount(new BigDecimal("3000.00")).dateSubmitted(LocalDate.of(2026,3,22)).dateProcessed(LocalDate.of(2026,3,30)).status("DENIED").denialReason("Service not covered under current plan").build(),
            Claim.builder().claimId("CLM-2026-0011").patientName("Pooja Nair").patientId("PAT-006").payerName("Star Health Insurance").provider("Dr. Amit Patel").cptCode("71046").icdCode("J18.9").description("Chest X-ray - pneumonia (appeal with authorization)").amount(new BigDecimal("2800.00")).dateSubmitted(LocalDate.of(2026,3,28)).status("APPEALED").build(),
            Claim.builder().claimId("CLM-2026-0012").patientName("Deepak Verma").patientId("PAT-011").payerName("Star Health Insurance").provider("Dr. Priya Desai").cptCode("99385").icdCode("Z00.00").description("Preventive medicine evaluation, 18-39 years").amount(new BigDecimal("3200.00")).dateSubmitted(LocalDate.of(2026,3,25)).status("IN_REVIEW").build(),
            Claim.builder().claimId("CLM-2026-0013").patientName("Lakshmi Iyer").patientId("PAT-012").payerName("ICICI Lombard").provider("Dr. Sanjay Kumar").cptCode("90837").icdCode("F41.1").description("Psychotherapy, 60 min - generalized anxiety disorder").amount(new BigDecimal("5000.00")).allowedAmount(new BigDecimal("4500.00")).paidAmount(new BigDecimal("4500.00")).dateSubmitted(LocalDate.of(2026,2,20)).dateProcessed(LocalDate.of(2026,3,1)).status("PAID").build(),
            Claim.builder().claimId("CLM-2026-0014").patientName("Nitin Bhosale").patientId("PAT-013").payerName("HDFC ERGO").provider("Dr. Amit Patel").cptCode("74177").icdCode("R10.9").description("CT abdomen with contrast - abdominal pain evaluation").amount(new BigDecimal("12000.00")).dateSubmitted(LocalDate.of(2026,4,1)).status("SUBMITTED").build(),
            Claim.builder().claimId("CLM-2026-0015").patientName("Priya Chopra").patientId("PAT-014").payerName("New India Assurance").provider("Dr. Priya Desai").cptCode("83036").icdCode("E11.9").description("Hemoglobin A1c - diabetes monitoring").amount(new BigDecimal("800.00")).allowedAmount(new BigDecimal("600.00")).paidAmount(new BigDecimal("600.00")).dateSubmitted(LocalDate.of(2026,3,15)).dateProcessed(LocalDate.of(2026,3,22)).status("PAID").build()
        );
        claimRepo.saveAll(claims);
        log.info("Seeded {} claims", claims.size());
    }

    private void seedFeeSchedules() {
        if (feeRepo.count() > 0) { log.info("Fee schedules already seeded"); return; }

        List<FeeSchedule> fees = List.of(
            FeeSchedule.builder().code("99201").description("Office visit, new patient, straightforward").category("E&M").fee(new BigDecimal("1500.00")).medicareRate(new BigDecimal("1200.00")).active(true).build(),
            FeeSchedule.builder().code("99202").description("Office visit, new patient, low complexity").category("E&M").fee(new BigDecimal("2500.00")).medicareRate(new BigDecimal("2000.00")).active(true).build(),
            FeeSchedule.builder().code("99203").description("Office visit, new patient, moderate complexity").category("E&M").fee(new BigDecimal("3500.00")).medicareRate(new BigDecimal("2800.00")).active(true).build(),
            FeeSchedule.builder().code("99204").description("Office visit, new patient, moderate-high complexity").category("E&M").fee(new BigDecimal("5000.00")).medicareRate(new BigDecimal("4200.00")).active(true).build(),
            FeeSchedule.builder().code("99205").description("Office visit, new patient, high complexity").category("E&M").fee(new BigDecimal("6500.00")).medicareRate(new BigDecimal("5500.00")).active(true).build(),
            FeeSchedule.builder().code("99213").description("Office visit, established patient, low complexity").category("E&M").fee(new BigDecimal("4500.00")).medicareRate(new BigDecimal("3800.00")).active(true).build(),
            FeeSchedule.builder().code("99214").description("Office visit, established patient, moderate complexity").category("E&M").fee(new BigDecimal("6200.00")).medicareRate(new BigDecimal("5200.00")).active(true).build(),
            FeeSchedule.builder().code("99215").description("Office visit, established patient, high complexity").category("E&M").fee(new BigDecimal("8500.00")).medicareRate(new BigDecimal("7200.00")).active(true).build(),
            FeeSchedule.builder().code("99281").description("Emergency department visit, minor problem").category("Emergency").fee(new BigDecimal("3000.00")).medicareRate(new BigDecimal("2200.00")).active(true).build(),
            FeeSchedule.builder().code("99285").description("Emergency department visit, life-threatening").category("Emergency").fee(new BigDecimal("15000.00")).medicareRate(new BigDecimal("12000.00")).active(true).build(),
            FeeSchedule.builder().code("90834").description("Psychotherapy, 45 minutes").category("Behavioral Health").fee(new BigDecimal("3500.00")).medicareRate(new BigDecimal("2800.00")).active(true).build(),
            FeeSchedule.builder().code("90837").description("Psychotherapy, 60 minutes").category("Behavioral Health").fee(new BigDecimal("5000.00")).medicareRate(new BigDecimal("4200.00")).active(true).build(),
            FeeSchedule.builder().code("85025").description("Complete blood count (CBC) with differential").category("Laboratory").fee(new BigDecimal("1200.00")).medicareRate(new BigDecimal("800.00")).active(true).build(),
            FeeSchedule.builder().code("80053").description("Comprehensive metabolic panel (CMP)").category("Laboratory").fee(new BigDecimal("1800.00")).medicareRate(new BigDecimal("1200.00")).active(true).build(),
            FeeSchedule.builder().code("83036").description("Hemoglobin A1c level").category("Laboratory").fee(new BigDecimal("800.00")).medicareRate(new BigDecimal("600.00")).active(true).build(),
            FeeSchedule.builder().code("84443").description("Thyroid stimulating hormone (TSH)").category("Laboratory").fee(new BigDecimal("1000.00")).medicareRate(new BigDecimal("750.00")).active(true).build(),
            FeeSchedule.builder().code("80061").description("Lipid panel").category("Laboratory").fee(new BigDecimal("1500.00")).medicareRate(new BigDecimal("1000.00")).active(true).build(),
            FeeSchedule.builder().code("71046").description("Chest X-ray, 2 views").category("Radiology").fee(new BigDecimal("2800.00")).medicareRate(new BigDecimal("1800.00")).active(true).build(),
            FeeSchedule.builder().code("74177").description("CT abdomen and pelvis with contrast").category("Radiology").fee(new BigDecimal("12000.00")).medicareRate(new BigDecimal("8500.00")).active(true).build(),
            FeeSchedule.builder().code("70553").description("MRI brain without and with contrast").category("Radiology").fee(new BigDecimal("18000.00")).medicareRate(new BigDecimal("14000.00")).active(true).build(),
            FeeSchedule.builder().code("36415").description("Venipuncture (blood draw)").category("Procedures").fee(new BigDecimal("500.00")).medicareRate(new BigDecimal("350.00")).active(true).build(),
            FeeSchedule.builder().code("20610").description("Joint injection, major joint").category("Procedures").fee(new BigDecimal("5500.00")).medicareRate(new BigDecimal("3800.00")).active(true).build(),
            FeeSchedule.builder().code("12001").description("Simple wound repair, 2.5 cm or less").category("Procedures").fee(new BigDecimal("3000.00")).medicareRate(new BigDecimal("2200.00")).active(true).build(),
            FeeSchedule.builder().code("97110").description("Therapeutic exercises, each 15 min").category("Physical Therapy").fee(new BigDecimal("2000.00")).medicareRate(new BigDecimal("1500.00")).active(true).build(),
            FeeSchedule.builder().code("97140").description("Manual therapy techniques, each 15 min").category("Physical Therapy").fee(new BigDecimal("2200.00")).medicareRate(new BigDecimal("1600.00")).active(true).build(),
            FeeSchedule.builder().code("99385").description("Preventive eval, new patient, 18-39 years").category("Preventive").fee(new BigDecimal("3200.00")).medicareRate(new BigDecimal("2500.00")).active(true).build(),
            FeeSchedule.builder().code("99395").description("Preventive eval, established patient, 18-39 years").category("Preventive").fee(new BigDecimal("2800.00")).medicareRate(new BigDecimal("2200.00")).active(true).build(),
            FeeSchedule.builder().code("90471").description("Immunization administration, first vaccine").category("Immunization").fee(new BigDecimal("800.00")).medicareRate(new BigDecimal("500.00")).active(true).build(),
            FeeSchedule.builder().code("99221").description("Initial hospital inpatient care, low complexity").category("Hospital").fee(new BigDecimal("12000.00")).medicareRate(new BigDecimal("9500.00")).active(true).build(),
            FeeSchedule.builder().code("99223").description("Initial hospital inpatient care, high complexity").category("Hospital").fee(new BigDecimal("25000.00")).medicareRate(new BigDecimal("20000.00")).active(true).build()
        );
        feeRepo.saveAll(fees);
        log.info("Seeded {} fee schedules", fees.size());
    }
}
