package com.kedar.kapse.business_service.config;

import com.kedar.kapse.platform_core.entity.Bed;
import com.kedar.kapse.platform_core.entity.Facility;
import com.kedar.kapse.platform_core.entity.PharmacyStock;
import com.kedar.kapse.platform_core.entity.Tenant;
import com.kedar.kapse.platform_core.enums.*;
import com.kedar.kapse.platform_core.repository.BedRepository;
import com.kedar.kapse.platform_core.repository.FacilityRepository;
import com.kedar.kapse.platform_core.repository.PharmacyStockRepository;
import com.kedar.kapse.platform_core.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(20)
public class InventoryDataSeeder implements CommandLineRunner {

    private final TenantRepository tenantRepo;
    private final FacilityRepository facilityRepo;
    private final BedRepository bedRepo;
    private final PharmacyStockRepository stockRepo;

    @Override
    public void run(String... args) {
        if (facilityRepo.count() > 0) {
            log.info("Inventory data already seeded ({} facilities)", facilityRepo.count());
            return;
        }

        Optional<Tenant> tenantOpt = tenantRepo.findByTenantCode("test");
        if (tenantOpt.isEmpty()) {
            log.warn("No 'test' tenant found — skipping inventory seed");
            return;
        }

        Tenant tenant = tenantOpt.get();
        seedFacilities(tenant);
    }

    private void seedFacilities(Tenant tenant) {
        // Facility 1: Main Hospital
        Facility mainHospital = facilityRepo.save(Facility.builder()
                .tenant(tenant).name("City General Hospital - Main Campus").facilityCode("CGH-MAIN")
                .facilityType("HOSPITAL").address("123 Medical Drive").city("Pune").state("Maharashtra")
                .zipCode("411001").phone("+91-20-2555-0100").email("main@citygeneral.com")
                .totalBeds(50).status(FacilityStatus.ACTIVE).build());

        // Facility 2: Clinic
        Facility clinic = facilityRepo.save(Facility.builder()
                .tenant(tenant).name("Downtown Family Clinic").facilityCode("DFC-01")
                .facilityType("CLINIC").address("456 Health Street").city("Pune").state("Maharashtra")
                .zipCode("411002").phone("+91-20-2555-0200").email("clinic@downtown.com")
                .totalBeds(10).status(FacilityStatus.ACTIVE).build());

        // Facility 3: Pharmacy
        Facility pharmacy = facilityRepo.save(Facility.builder()
                .tenant(tenant).name("MedPlus Pharmacy").facilityCode("MPH-01")
                .facilityType("PHARMACY").address("789 Wellness Road").city("Pune").state("Maharashtra")
                .zipCode("411003").phone("+91-20-2555-0300").email("info@medplus.com")
                .totalBeds(0).status(FacilityStatus.ACTIVE).build());

        log.info("Seeded 3 facilities");

        seedBeds(mainHospital);
        seedBeds(clinic);
        seedPharmacyStock(mainHospital);
        seedPharmacyStock(pharmacy);
    }

    private void seedBeds(Facility facility) {
        String[][] wards;
        if (facility.getFacilityCode().equals("CGH-MAIN")) {
            wards = new String[][]{
                    {"ICU", "101", "A", "ICU"}, {"ICU", "101", "B", "ICU"}, {"ICU", "102", "A", "ICU"}, {"ICU", "102", "B", "ICU"},
                    {"ICU", "103", "A", "ICU"}, {"ICU", "103", "B", "ICU"},
                    {"General", "201", "A", "GENERAL"}, {"General", "201", "B", "GENERAL"}, {"General", "202", "A", "GENERAL"}, {"General", "202", "B", "GENERAL"},
                    {"General", "203", "A", "GENERAL"}, {"General", "203", "B", "GENERAL"}, {"General", "204", "A", "GENERAL"}, {"General", "204", "B", "GENERAL"},
                    {"General", "205", "A", "GENERAL"}, {"General", "205", "B", "GENERAL"},
                    {"Private", "301", "A", "PRIVATE"}, {"Private", "302", "A", "PRIVATE"}, {"Private", "303", "A", "PRIVATE"}, {"Private", "304", "A", "PRIVATE"},
                    {"Maternity", "401", "A", "MATERNITY"}, {"Maternity", "401", "B", "MATERNITY"}, {"Maternity", "402", "A", "MATERNITY"}, {"Maternity", "402", "B", "MATERNITY"},
                    {"Emergency", "ER-1", "A", "EMERGENCY"}, {"Emergency", "ER-1", "B", "EMERGENCY"}, {"Emergency", "ER-2", "A", "EMERGENCY"}, {"Emergency", "ER-2", "B", "EMERGENCY"},
                    {"Pediatric", "501", "A", "GENERAL"}, {"Pediatric", "501", "B", "GENERAL"}, {"Pediatric", "502", "A", "GENERAL"}, {"Pediatric", "502", "B", "GENERAL"},
            };
        } else {
            wards = new String[][]{
                    {"Exam", "101", "A", "GENERAL"}, {"Exam", "101", "B", "GENERAL"}, {"Exam", "102", "A", "GENERAL"},
                    {"Procedure", "201", "A", "SEMI_PRIVATE"}, {"Procedure", "201", "B", "SEMI_PRIVATE"},
                    {"Recovery", "301", "A", "GENERAL"}, {"Recovery", "301", "B", "GENERAL"},
                    {"Observation", "401", "A", "GENERAL"}, {"Observation", "401", "B", "GENERAL"}, {"Observation", "402", "A", "GENERAL"},
            };
        }

        BedStatus[] statuses = {BedStatus.AVAILABLE, BedStatus.OCCUPIED, BedStatus.AVAILABLE, BedStatus.MAINTENANCE,
                BedStatus.AVAILABLE, BedStatus.OCCUPIED, BedStatus.AVAILABLE, BedStatus.AVAILABLE,
                BedStatus.RESERVED, BedStatus.AVAILABLE, BedStatus.OCCUPIED, BedStatus.AVAILABLE};
        String[][] patients = {
                {"PAT-001", "Rahul Sharma"}, {"PAT-002", "Priya Desai"}, {"PAT-003", "Amit Patel"},
                {"PAT-004", "Sneha Kulkarni"}, {"PAT-005", "Vikram Singh"}
        };

        int patIdx = 0;
        for (int i = 0; i < wards.length; i++) {
            BedStatus status = statuses[i % statuses.length];
            Bed.BedBuilder<?, ?> builder = Bed.builder()
                    .facility(facility)
                    .wardName(wards[i][0]).roomNumber(wards[i][1]).bedNumber(wards[i][2])
                    .bedType(BedType.valueOf(wards[i][3]))
                    .status(status);

            if (status == BedStatus.OCCUPIED && patIdx < patients.length) {
                builder.assignedPatientId(patients[patIdx][0])
                        .assignedPatientName(patients[patIdx][1]);
                patIdx++;
            }
            bedRepo.save(builder.build());
        }
        log.info("Seeded {} beds for facility '{}'", wards.length, facility.getName());
    }

    private void seedPharmacyStock(Facility facility) {
        List<PharmacyStock> stocks = List.of(
                PharmacyStock.builder().facility(facility).medicineName("Amoxicillin 500mg").category("Antibiotics")
                        .batchNumber("AMX-2026-001").manufacturer("Cipla").dosageForm("CAPSULE").strength("500mg")
                        .quantity(250).minimumStockLevel(50).expiryDate(LocalDate.of(2027, 6, 15))
                        .unitPrice(new BigDecimal("12.50")).storageCondition("ROOM_TEMP").scheduleClass("OTC")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Paracetamol 650mg").category("Analgesics")
                        .batchNumber("PCT-2026-001").manufacturer("GSK").dosageForm("TABLET").strength("650mg")
                        .quantity(500).minimumStockLevel(100).expiryDate(LocalDate.of(2027, 12, 31))
                        .unitPrice(new BigDecimal("5.00")).storageCondition("ROOM_TEMP").scheduleClass("OTC")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Insulin Glargine").category("Endocrine")
                        .batchNumber("INS-2026-003").manufacturer("Novo Nordisk").dosageForm("INJECTION").strength("100 IU/mL")
                        .quantity(30).minimumStockLevel(20).expiryDate(LocalDate.of(2026, 9, 30))
                        .unitPrice(new BigDecimal("850.00")).storageCondition("REFRIGERATED").scheduleClass("SCHEDULE_IV")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Atorvastatin 20mg").category("Cardiovascular")
                        .batchNumber("ATV-2026-002").manufacturer("Sun Pharma").dosageForm("TABLET").strength("20mg")
                        .quantity(180).minimumStockLevel(40).expiryDate(LocalDate.of(2027, 3, 20))
                        .unitPrice(new BigDecimal("15.00")).storageCondition("ROOM_TEMP").scheduleClass("SCHEDULE_IV")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Metformin 500mg").category("Endocrine")
                        .batchNumber("MET-2026-001").manufacturer("Dr. Reddy's").dosageForm("TABLET").strength("500mg")
                        .quantity(320).minimumStockLevel(60).expiryDate(LocalDate.of(2027, 8, 10))
                        .unitPrice(new BigDecimal("8.00")).storageCondition("ROOM_TEMP").scheduleClass("SCHEDULE_IV")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Cetirizine 10mg").category("Antihistamines")
                        .batchNumber("CET-2026-001").manufacturer("Mankind").dosageForm("TABLET").strength("10mg")
                        .quantity(15).minimumStockLevel(30).expiryDate(LocalDate.of(2027, 5, 1))
                        .unitPrice(new BigDecimal("3.50")).storageCondition("ROOM_TEMP").scheduleClass("OTC")
                        .status(MedicineStatus.LOW_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Omeprazole 20mg").category("GI")
                        .batchNumber("OMP-2026-001").manufacturer("Ranbaxy").dosageForm("CAPSULE").strength("20mg")
                        .quantity(200).minimumStockLevel(40).expiryDate(LocalDate.of(2027, 11, 15))
                        .unitPrice(new BigDecimal("10.00")).storageCondition("ROOM_TEMP").scheduleClass("OTC")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Amlodipine 5mg").category("Cardiovascular")
                        .batchNumber("AML-2026-001").manufacturer("Pfizer").dosageForm("TABLET").strength("5mg")
                        .quantity(0).minimumStockLevel(25).expiryDate(LocalDate.of(2027, 4, 1))
                        .unitPrice(new BigDecimal("6.00")).storageCondition("ROOM_TEMP").scheduleClass("SCHEDULE_IV")
                        .status(MedicineStatus.OUT_OF_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Normal Saline 500mL").category("IV Fluids")
                        .batchNumber("NS-2026-010").manufacturer("Baxter").dosageForm("IV_FLUID").strength("0.9% NaCl")
                        .quantity(100).minimumStockLevel(30).expiryDate(LocalDate.of(2028, 1, 1))
                        .unitPrice(new BigDecimal("45.00")).storageCondition("ROOM_TEMP").scheduleClass("OTC")
                        .status(MedicineStatus.IN_STOCK).build(),
                PharmacyStock.builder().facility(facility).medicineName("Diclofenac Gel").category("Topical")
                        .batchNumber("DCG-2025-005").manufacturer("Novartis").dosageForm("CREAM").strength("1%")
                        .quantity(75).minimumStockLevel(20).expiryDate(LocalDate.of(2025, 12, 31))
                        .unitPrice(new BigDecimal("120.00")).storageCondition("ROOM_TEMP").scheduleClass("OTC")
                        .status(MedicineStatus.EXPIRED).build()
        );

        stockRepo.saveAll(stocks);
        log.info("Seeded {} pharmacy items for facility '{}'", stocks.size(), facility.getName());
    }
}
