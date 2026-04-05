package com.kedar.kapse.business_service.config;

import com.kedar.kapse.business_service.entity.*;
import com.kedar.kapse.business_service.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Component @RequiredArgsConstructor @Slf4j @Order(40)
public class PatientDataSeeder implements CommandLineRunner {

    private final AppointmentRepository apptRepo;
    private final InvoiceRepository invRepo;
    private final PatientDocumentRepository docRepo;
    private final MessageRepository msgRepo;

    @Override
    public void run(String... args) {
        seedAppointments();
        seedInvoices();
        seedDocuments();
        seedMessages();
    }

    private void seedAppointments() {
        if (apptRepo.count() > 0) { log.info("Appointments already seeded"); return; }
        LocalDate today = LocalDate.now();
        apptRepo.saveAll(List.of(
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-001").providerName("Dr. Priya Desai").providerSpecialty("Cardiology").appointmentDate(today.plusDays(2)).startTime(LocalTime.of(10,0)).endTime(LocalTime.of(10,30)).status("SCHEDULED").type("CONSULTATION").reason("Chest pain follow-up").facilityName("City General Hospital").mode("IN_PERSON").build(),
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-002").providerName("Dr. Amit Patel").providerSpecialty("General Medicine").appointmentDate(today.plusDays(5)).startTime(LocalTime.of(14,0)).endTime(LocalTime.of(14,30)).status("SCHEDULED").type("FOLLOW_UP").reason("Annual check-up").facilityName("Downtown Family Clinic").mode("IN_PERSON").build(),
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-003").providerName("Dr. Sanjay Kumar").providerSpecialty("Psychiatry").appointmentDate(today.plusDays(8)).startTime(LocalTime.of(11,0)).endTime(LocalTime.of(12,0)).status("SCHEDULED").type("CONSULTATION").reason("Anxiety management").facilityName("City General Hospital").mode("TELEHEALTH").build(),
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-001").providerName("Dr. Priya Desai").providerSpecialty("Cardiology").appointmentDate(today.minusDays(7)).startTime(LocalTime.of(9,0)).endTime(LocalTime.of(9,30)).status("COMPLETED").type("CONSULTATION").reason("ECG review").notes("ECG normal. Continue current medication.").facilityName("City General Hospital").mode("IN_PERSON").build(),
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-002").providerName("Dr. Amit Patel").providerSpecialty("General Medicine").appointmentDate(today.minusDays(14)).startTime(LocalTime.of(15,0)).endTime(LocalTime.of(15,30)).status("COMPLETED").type("LAB_REVIEW").reason("Blood test results").notes("All values within normal range. HbA1c slightly elevated at 6.1%.").facilityName("Downtown Family Clinic").mode("IN_PERSON").build(),
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-001").providerName("Dr. Priya Desai").providerSpecialty("Cardiology").appointmentDate(today.minusDays(30)).startTime(LocalTime.of(10,0)).endTime(LocalTime.of(10,30)).status("COMPLETED").type("PROCEDURE").reason("Stress test").notes("Stress test results normal. No signs of ischemia.").facilityName("City General Hospital").mode("IN_PERSON").build(),
            Appointment.builder().patientId("PAT-001").patientName("Rahul Sharma").providerId("DOC-002").providerName("Dr. Amit Patel").providerSpecialty("General Medicine").appointmentDate(today.minusDays(3)).startTime(LocalTime.of(11,0)).endTime(LocalTime.of(11,30)).status("CANCELLED").type("FOLLOW_UP").reason("Medication review").facilityName("Downtown Family Clinic").mode("TELEHEALTH").build(),
            Appointment.builder().patientId("PAT-002").patientName("Sneha Kulkarni").providerId("DOC-001").providerName("Dr. Priya Desai").providerSpecialty("Cardiology").appointmentDate(today.plusDays(1)).startTime(LocalTime.of(11,0)).endTime(LocalTime.of(11,30)).status("SCHEDULED").type("CONSULTATION").reason("Hypertension management").facilityName("City General Hospital").mode("IN_PERSON").build(),
            Appointment.builder().patientId("PAT-002").patientName("Sneha Kulkarni").providerId("DOC-003").providerName("Dr. Sanjay Kumar").providerSpecialty("Psychiatry").appointmentDate(today.minusDays(10)).startTime(LocalTime.of(16,0)).endTime(LocalTime.of(17,0)).status("COMPLETED").type("CONSULTATION").reason("Depression screening").notes("PHQ-9 score: 8 (mild). Started on low-dose SSRI.").facilityName("City General Hospital").mode("TELEHEALTH").build()
        ));
        log.info("Seeded 9 appointments");
    }

    private void seedInvoices() {
        if (invRepo.count() > 0) { log.info("Invoices already seeded"); return; }
        LocalDate today = LocalDate.now();
        invRepo.saveAll(List.of(
            Invoice.builder().invoiceNumber("INV-2026-0001").patientId("PAT-001").patientName("Rahul Sharma").providerName("Dr. Priya Desai").description("Cardiology Consultation + ECG").amount(new BigDecimal("4500.00")).paidAmount(new BigDecimal("4500.00")).status("PAID").paymentMethod("UPI").issueDate(today.minusDays(7)).dueDate(today.plusDays(23)).paidDate(today.minusDays(5)).build(),
            Invoice.builder().invoiceNumber("INV-2026-0002").patientId("PAT-001").patientName("Rahul Sharma").providerName("Dr. Amit Patel").description("Blood Test - CBC, CMP, Lipid Panel, HbA1c").amount(new BigDecimal("3200.00")).paidAmount(new BigDecimal("3200.00")).status("PAID").paymentMethod("CARD").issueDate(today.minusDays(14)).dueDate(today.plusDays(16)).paidDate(today.minusDays(12)).build(),
            Invoice.builder().invoiceNumber("INV-2026-0003").patientId("PAT-001").patientName("Rahul Sharma").providerName("Dr. Priya Desai").description("Cardiac Stress Test").amount(new BigDecimal("8500.00")).paidAmount(BigDecimal.ZERO).status("PENDING").issueDate(today.minusDays(2)).dueDate(today.plusDays(28)).build(),
            Invoice.builder().invoiceNumber("INV-2026-0004").patientId("PAT-001").patientName("Rahul Sharma").providerName("Dr. Sanjay Kumar").description("Psychiatry Initial Consultation (60 min)").amount(new BigDecimal("5000.00")).paidAmount(BigDecimal.ZERO).status("PENDING").issueDate(today).dueDate(today.plusDays(30)).build(),
            Invoice.builder().invoiceNumber("INV-2026-0005").patientId("PAT-001").patientName("Rahul Sharma").providerName("City General Hospital").description("Pharmacy - Atorvastatin 20mg, Metformin 500mg (3 months)").amount(new BigDecimal("1800.00")).paidAmount(new BigDecimal("1800.00")).status("PAID").paymentMethod("CASH").issueDate(today.minusDays(30)).dueDate(today).paidDate(today.minusDays(30)).build(),
            Invoice.builder().invoiceNumber("INV-2026-0006").patientId("PAT-001").patientName("Rahul Sharma").providerName("Dr. Priya Desai").description("Follow-up Consultation").amount(new BigDecimal("2500.00")).paidAmount(BigDecimal.ZERO).status("OVERDUE").issueDate(today.minusDays(45)).dueDate(today.minusDays(15)).build(),
            Invoice.builder().invoiceNumber("INV-2026-0007").patientId("PAT-002").patientName("Sneha Kulkarni").providerName("Dr. Sanjay Kumar").description("Psychiatry Session - Depression Screening + SSRI Prescription").amount(new BigDecimal("5500.00")).paidAmount(new BigDecimal("5500.00")).status("PAID").paymentMethod("INSURANCE").issueDate(today.minusDays(10)).dueDate(today.plusDays(20)).paidDate(today.minusDays(8)).build()
        ));
        log.info("Seeded 7 invoices");
    }

    private void seedDocuments() {
        if (docRepo.count() > 0) { log.info("Documents already seeded"); return; }
        docRepo.saveAll(List.of(
            PatientDocument.builder().patientId("PAT-001").fileName("ECG_Report_March2026.pdf").fileType("PDF").category("Lab Reports").description("12-lead ECG report — normal sinus rhythm").uploadedBy("Dr. Priya Desai").fileSize(245000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("CBC_CMP_Results.pdf").fileType("PDF").category("Lab Reports").description("Complete Blood Count and Comprehensive Metabolic Panel results").uploadedBy("Lab Technician").fileSize(180000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("Lipid_Panel_Report.pdf").fileType("PDF").category("Lab Reports").description("Lipid panel — Total cholesterol 210, LDL 135, HDL 48, Triglycerides 180").uploadedBy("Lab Technician").fileSize(120000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("Stress_Test_Report.pdf").fileType("PDF").category("Imaging").description("Cardiac stress test report with treadmill protocol").uploadedBy("Dr. Priya Desai").fileSize(520000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("Chest_XRay_2Views.jpg").fileType("JPEG").category("Imaging").description("PA and lateral chest X-ray — no acute findings").uploadedBy("Radiology Dept").fileSize(1200000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("Prescription_March2026.pdf").fileType("PDF").category("Prescriptions").description("Monthly prescription — Atorvastatin 20mg, Metformin 500mg, Amlodipine 5mg").uploadedBy("Dr. Amit Patel").fileSize(85000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("Insurance_Card_Front.jpg").fileType("JPEG").category("Insurance").description("Star Health Insurance card — Policy #SH2026-45892").uploadedBy("Patient").fileSize(350000L).build(),
            PatientDocument.builder().patientId("PAT-001").fileName("Vaccination_Record.pdf").fileType("PDF").category("Immunization").description("COVID-19 vaccination certificate — both doses + booster").uploadedBy("Patient").fileSize(150000L).build(),
            PatientDocument.builder().patientId("PAT-002").fileName("PHQ9_Assessment.pdf").fileType("PDF").category("Clinical Notes").description("PHQ-9 depression screening assessment form").uploadedBy("Dr. Sanjay Kumar").fileSize(95000L).build()
        ));
        log.info("Seeded 9 patient documents");
    }

    private void seedMessages() {
        if (msgRepo.count() > 0) { log.info("Messages already seeded"); return; }
        String t1 = "thread-cardio-01", t2 = "thread-lab-01", t3 = "thread-rx-01";
        msgRepo.saveAll(List.of(
            Message.builder().senderId("DOC-001").senderName("Dr. Priya Desai").senderRole("PHYSICIAN").recipientId("PAT-001").recipientName("Rahul Sharma").recipientRole("PATIENT").subject("ECG Results Available").body("Dear Rahul,\n\nYour ECG results are now available in your documents section. The results show normal sinus rhythm. We'll discuss this in detail during your upcoming appointment.\n\nBest regards,\nDr. Priya Desai").threadId(t1).read(true).build(),
            Message.builder().senderId("PAT-001").senderName("Rahul Sharma").senderRole("PATIENT").recipientId("DOC-001").recipientName("Dr. Priya Desai").recipientRole("PHYSICIAN").subject("Re: ECG Results Available").body("Thank you, Dr. Desai. I noticed my heart rate was 78 bpm — is that normal for my age? Also, should I continue taking the beta-blocker?").threadId(t1).read(true).build(),
            Message.builder().senderId("DOC-001").senderName("Dr. Priya Desai").senderRole("PHYSICIAN").recipientId("PAT-001").recipientName("Rahul Sharma").recipientRole("PATIENT").subject("Re: ECG Results Available").body("78 bpm is perfectly normal. Yes, please continue the beta-blocker as prescribed. We can review the dosage during your next visit on the 7th.").threadId(t1).read(false).build(),
            Message.builder().senderId("DOC-002").senderName("Dr. Amit Patel").senderRole("PHYSICIAN").recipientId("PAT-001").recipientName("Rahul Sharma").recipientRole("PATIENT").subject("Lab Results - Action Required").body("Hi Rahul,\n\nYour HbA1c is slightly elevated at 6.1% (pre-diabetic range). I recommend:\n1. Reduce sugar intake\n2. 30 min daily walk\n3. Continue Metformin 500mg\n\nLet's review in 3 months.\n\nDr. Amit Patel").threadId(t2).read(false).build(),
            Message.builder().senderId("DOC-002").senderName("Dr. Amit Patel").senderRole("PHYSICIAN").recipientId("PAT-001").recipientName("Rahul Sharma").recipientRole("PATIENT").subject("Prescription Renewal").body("Your prescription for Atorvastatin and Metformin has been renewed for 3 months. You can pick it up from MedPlus Pharmacy. The prescription document is uploaded to your records.").threadId(t3).read(false).build(),
            Message.builder().senderId("DOC-003").senderName("Dr. Sanjay Kumar").senderRole("PHYSICIAN").recipientId("PAT-002").recipientName("Sneha Kulkarni").recipientRole("PATIENT").subject("Therapy Session Follow-up").body("Hi Sneha,\n\nThank you for today's session. Remember to practice the breathing exercises we discussed. Your next appointment is scheduled for next week. The SSRI may take 2-4 weeks to show full effect.\n\nTake care,\nDr. Kumar").threadId("thread-psych-01").read(false).build()
        ));
        log.info("Seeded 6 messages");
    }
}
