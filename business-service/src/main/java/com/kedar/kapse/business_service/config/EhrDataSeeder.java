package com.kedar.kapse.business_service.config;

import com.kedar.kapse.business_service.entity.CptCode;
import com.kedar.kapse.business_service.entity.EhrTemplate;
import com.kedar.kapse.business_service.entity.IcdCode;
import com.kedar.kapse.business_service.repository.CptCodeRepository;
import com.kedar.kapse.business_service.repository.EhrTemplateRepository;
import com.kedar.kapse.business_service.repository.IcdCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(10)
public class EhrDataSeeder implements CommandLineRunner {

    private final EhrTemplateRepository templateRepo;
    private final IcdCodeRepository icdRepo;
    private final CptCodeRepository cptRepo;

    @Override
    public void run(String... args) {
        seedTemplates();
        seedIcdCodes();
        seedCptCodes();
    }

    private void seedTemplates() {
        if (templateRepo.count() > 0) {
            log.info("EHR templates already seeded ({} records)", templateRepo.count());
            return;
        }

        List<EhrTemplate> templates = List.of(
            EhrTemplate.builder().name("Patient Intake Form").description("Initial patient registration and medical history collection form used during first visit").category("Registration").fieldCount(24).active(true).specialty("General").version("2.1").build(),
            EhrTemplate.builder().name("SOAP Note").description("Subjective, Objective, Assessment, Plan — standard clinical encounter documentation").category("Clinical Notes").fieldCount(12).active(true).specialty("General").version("3.0").build(),
            EhrTemplate.builder().name("Discharge Summary").description("Comprehensive summary prepared at patient discharge including diagnosis, treatment, and follow-up instructions").category("Discharge").fieldCount(18).active(true).specialty("General").version("1.5").build(),
            EhrTemplate.builder().name("Progress Note").description("Ongoing documentation of patient condition changes and treatment modifications").category("Clinical Notes").fieldCount(10).active(true).specialty("General").version("2.0").build(),
            EhrTemplate.builder().name("Surgical Pre-Op Assessment").description("Pre-operative evaluation checklist including anesthesia risk, allergies, and consent").category("Surgery").fieldCount(32).active(true).specialty("Surgery").version("1.8").build(),
            EhrTemplate.builder().name("Medication Reconciliation").description("Comparison of patient medication lists across transitions of care").category("Pharmacy").fieldCount(8).active(true).specialty("Pharmacy").version("2.2").build(),
            EhrTemplate.builder().name("Mental Health Assessment").description("Comprehensive psychiatric evaluation including PHQ-9, GAD-7 screening tools").category("Behavioral Health").fieldCount(28).active(true).specialty("Psychiatry").version("1.3").build(),
            EhrTemplate.builder().name("Pediatric Well-Child Visit").description("Age-appropriate developmental screening and immunization tracking").category("Pediatrics").fieldCount(22).active(true).specialty("Pediatrics").version("2.0").build(),
            EhrTemplate.builder().name("Emergency Triage Form").description("Rapid assessment form for emergency department patient prioritization using ESI scale").category("Emergency").fieldCount(15).active(true).specialty("Emergency Medicine").version("3.1").build(),
            EhrTemplate.builder().name("Radiology Report Template").description("Structured reporting format for imaging studies including findings and impressions").category("Radiology").fieldCount(14).active(true).specialty("Radiology").version("1.7").build(),
            EhrTemplate.builder().name("Lab Order Form").description("Laboratory test request form with specimen collection instructions").category("Laboratory").fieldCount(16).active(true).specialty("Pathology").version("2.4").build(),
            EhrTemplate.builder().name("Physical Therapy Evaluation").description("Initial PT assessment including functional limitations, range of motion, and treatment goals").category("Rehabilitation").fieldCount(20).active(true).specialty("Physical Therapy").version("1.9").build(),
            EhrTemplate.builder().name("Referral Letter").description("Inter-provider referral documentation with clinical history and reason for referral").category("Communication").fieldCount(12).active(true).specialty("General").version("1.2").build(),
            EhrTemplate.builder().name("Consent for Treatment").description("Informed consent documentation for medical procedures and treatments").category("Legal").fieldCount(8).active(true).specialty("General").version("3.0").build(),
            EhrTemplate.builder().name("Death Certificate Template").description("Official documentation of cause and manner of death per local regulations").category("Legal").fieldCount(20).active(false).specialty("General").version("1.0").build()
        );

        templateRepo.saveAll(templates);
        log.info("Seeded {} EHR templates", templates.size());
    }

    private void seedIcdCodes() {
        if (icdRepo.count() > 0) {
            log.info("ICD codes already seeded ({} records)", icdRepo.count());
            return;
        }

        List<IcdCode> codes = List.of(
            // Infectious Diseases
            IcdCode.builder().code("A09").description("Infectious gastroenteritis and colitis, unspecified").category("Infectious Diseases").subcategory("Intestinal").build(),
            IcdCode.builder().code("A49.9").description("Bacterial infection, unspecified").category("Infectious Diseases").subcategory("Bacterial").build(),
            IcdCode.builder().code("B34.9").description("Viral infection, unspecified").category("Infectious Diseases").subcategory("Viral").build(),

            // Endocrine / Metabolic
            IcdCode.builder().code("E11.9").description("Type 2 diabetes mellitus without complications").category("Endocrine").subcategory("Diabetes").build(),
            IcdCode.builder().code("E10.9").description("Type 1 diabetes mellitus without complications").category("Endocrine").subcategory("Diabetes").build(),
            IcdCode.builder().code("E03.9").description("Hypothyroidism, unspecified").category("Endocrine").subcategory("Thyroid").build(),
            IcdCode.builder().code("E05.90").description("Thyrotoxicosis, unspecified without thyrotoxic crisis").category("Endocrine").subcategory("Thyroid").build(),
            IcdCode.builder().code("E78.5").description("Dyslipidemia, unspecified").category("Endocrine").subcategory("Lipid Disorders").build(),
            IcdCode.builder().code("E66.01").description("Morbid (severe) obesity due to excess calories").category("Endocrine").subcategory("Obesity").build(),

            // Mental Health
            IcdCode.builder().code("F32.1").description("Major depressive disorder, single episode, moderate").category("Mental Health").subcategory("Depression").build(),
            IcdCode.builder().code("F33.0").description("Major depressive disorder, recurrent, mild").category("Mental Health").subcategory("Depression").build(),
            IcdCode.builder().code("F41.1").description("Generalized anxiety disorder").category("Mental Health").subcategory("Anxiety").build(),
            IcdCode.builder().code("F41.0").description("Panic disorder without agoraphobia").category("Mental Health").subcategory("Anxiety").build(),
            IcdCode.builder().code("F43.10").description("Post-traumatic stress disorder, unspecified").category("Mental Health").subcategory("Trauma").build(),
            IcdCode.builder().code("F90.0").description("Attention-deficit hyperactivity disorder, predominantly inattentive type").category("Mental Health").subcategory("ADHD").build(),

            // Circulatory System
            IcdCode.builder().code("I10").description("Essential (primary) hypertension").category("Circulatory").subcategory("Hypertension").build(),
            IcdCode.builder().code("I25.10").description("Atherosclerotic heart disease of native coronary artery without angina pectoris").category("Circulatory").subcategory("Heart Disease").build(),
            IcdCode.builder().code("I48.91").description("Unspecified atrial fibrillation").category("Circulatory").subcategory("Arrhythmia").build(),
            IcdCode.builder().code("I50.9").description("Heart failure, unspecified").category("Circulatory").subcategory("Heart Failure").build(),
            IcdCode.builder().code("I63.9").description("Cerebral infarction, unspecified").category("Circulatory").subcategory("Stroke").build(),

            // Respiratory
            IcdCode.builder().code("J06.9").description("Acute upper respiratory infection, unspecified").category("Respiratory").subcategory("Upper Respiratory").build(),
            IcdCode.builder().code("J18.9").description("Pneumonia, unspecified organism").category("Respiratory").subcategory("Pneumonia").build(),
            IcdCode.builder().code("J45.20").description("Mild intermittent asthma, uncomplicated").category("Respiratory").subcategory("Asthma").build(),
            IcdCode.builder().code("J44.1").description("Chronic obstructive pulmonary disease with acute exacerbation").category("Respiratory").subcategory("COPD").build(),
            IcdCode.builder().code("J02.9").description("Acute pharyngitis, unspecified").category("Respiratory").subcategory("Upper Respiratory").build(),

            // Musculoskeletal
            IcdCode.builder().code("M54.5").description("Low back pain, unspecified").category("Musculoskeletal").subcategory("Back Pain").build(),
            IcdCode.builder().code("M79.3").description("Panniculitis, unspecified").category("Musculoskeletal").subcategory("Soft Tissue").build(),
            IcdCode.builder().code("M25.511").description("Pain in right shoulder").category("Musculoskeletal").subcategory("Joint Pain").build(),
            IcdCode.builder().code("M17.11").description("Primary osteoarthritis, right knee").category("Musculoskeletal").subcategory("Arthritis").build(),
            IcdCode.builder().code("M81.0").description("Age-related osteoporosis without current pathological fracture").category("Musculoskeletal").subcategory("Osteoporosis").build(),

            // Genitourinary
            IcdCode.builder().code("N39.0").description("Urinary tract infection, site not specified").category("Genitourinary").subcategory("Urinary").build(),
            IcdCode.builder().code("N18.3").description("Chronic kidney disease, stage 3 (moderate)").category("Genitourinary").subcategory("Kidney Disease").build(),

            // Injuries
            IcdCode.builder().code("S62.509A").description("Unspecified fracture of unspecified wrist, initial encounter").category("Injury").subcategory("Fracture").build(),
            IcdCode.builder().code("S06.0X0A").description("Concussion without loss of consciousness, initial encounter").category("Injury").subcategory("Head Injury").build(),

            // Symptoms / Signs
            IcdCode.builder().code("R50.9").description("Fever, unspecified").category("Symptoms").subcategory("General").build(),
            IcdCode.builder().code("R05.9").description("Cough, unspecified").category("Symptoms").subcategory("Respiratory").build(),
            IcdCode.builder().code("R51.9").description("Headache, unspecified").category("Symptoms").subcategory("Neurological").build(),
            IcdCode.builder().code("R10.9").description("Unspecified abdominal pain").category("Symptoms").subcategory("GI").build(),
            IcdCode.builder().code("R42").description("Dizziness and giddiness").category("Symptoms").subcategory("Neurological").build(),
            IcdCode.builder().code("R00.0").description("Tachycardia, unspecified").category("Symptoms").subcategory("Cardiovascular").build(),

            // Screening / Preventive
            IcdCode.builder().code("Z00.00").description("Encounter for general adult medical examination without abnormal findings").category("Screening").subcategory("Preventive").build(),
            IcdCode.builder().code("Z12.31").description("Encounter for screening mammogram for malignant neoplasm of breast").category("Screening").subcategory("Cancer Screening").build(),
            IcdCode.builder().code("Z23").description("Encounter for immunization").category("Screening").subcategory("Immunization").build()
        );

        icdRepo.saveAll(codes);
        log.info("Seeded {} ICD-10 codes", codes.size());
    }

    private void seedCptCodes() {
        if (cptRepo.count() > 0) {
            log.info("CPT codes already seeded ({} records)", cptRepo.count());
            return;
        }

        List<CptCode> codes = List.of(
            // Evaluation & Management
            CptCode.builder().code("99201").description("Office or other outpatient visit, new patient, straightforward MDM").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99202").description("Office or other outpatient visit, new patient, low MDM complexity").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99203").description("Office or other outpatient visit, new patient, moderate MDM complexity").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99204").description("Office or other outpatient visit, new patient, moderate to high MDM complexity").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99205").description("Office or other outpatient visit, new patient, high MDM complexity").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99211").description("Office or other outpatient visit, established patient, minimal presenting problem").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99212").description("Office or other outpatient visit, established patient, straightforward MDM").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99213").description("Office or other outpatient visit, established patient, low MDM complexity").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99214").description("Office or other outpatient visit, established patient, moderate MDM complexity").category("E&M").subcategory("Office Visit").build(),
            CptCode.builder().code("99215").description("Office or other outpatient visit, established patient, high MDM complexity").category("E&M").subcategory("Office Visit").build(),

            // Hospital
            CptCode.builder().code("99221").description("Initial hospital inpatient care, straightforward or low MDM complexity").category("E&M").subcategory("Hospital").build(),
            CptCode.builder().code("99222").description("Initial hospital inpatient care, moderate MDM complexity").category("E&M").subcategory("Hospital").build(),
            CptCode.builder().code("99223").description("Initial hospital inpatient care, high MDM complexity").category("E&M").subcategory("Hospital").build(),
            CptCode.builder().code("99281").description("Emergency department visit, self-limited or minor problem").category("E&M").subcategory("Emergency").build(),
            CptCode.builder().code("99285").description("Emergency department visit, high severity with significant threat to life").category("E&M").subcategory("Emergency").build(),

            // Preventive Medicine
            CptCode.builder().code("99385").description("Initial comprehensive preventive medicine evaluation, 18-39 years").category("Preventive").subcategory("Annual Physical").build(),
            CptCode.builder().code("99386").description("Initial comprehensive preventive medicine evaluation, 40-64 years").category("Preventive").subcategory("Annual Physical").build(),
            CptCode.builder().code("99395").description("Periodic comprehensive preventive medicine evaluation, 18-39 years").category("Preventive").subcategory("Annual Physical").build(),
            CptCode.builder().code("99396").description("Periodic comprehensive preventive medicine evaluation, 40-64 years").category("Preventive").subcategory("Annual Physical").build(),

            // Procedures
            CptCode.builder().code("36415").description("Collection of venous blood by venipuncture").category("Procedures").subcategory("Blood Draw").build(),
            CptCode.builder().code("36416").description("Collection of capillary blood specimen (e.g., finger, heel, ear stick)").category("Procedures").subcategory("Blood Draw").build(),
            CptCode.builder().code("12001").description("Simple repair of superficial wounds, 2.5 cm or less").category("Procedures").subcategory("Wound Repair").build(),
            CptCode.builder().code("12002").description("Simple repair of superficial wounds, 2.6 cm to 7.5 cm").category("Procedures").subcategory("Wound Repair").build(),
            CptCode.builder().code("20610").description("Arthrocentesis, aspiration and/or injection, major joint or bursa").category("Procedures").subcategory("Joint Injection").build(),
            CptCode.builder().code("11102").description("Tangential biopsy of skin (e.g., shave, scoop, saucerize, curette), single lesion").category("Procedures").subcategory("Biopsy").build(),

            // Imaging
            CptCode.builder().code("71046").description("Radiologic examination, chest; 2 views").category("Radiology").subcategory("X-Ray").build(),
            CptCode.builder().code("73030").description("Radiologic examination, shoulder; complete, minimum of 2 views").category("Radiology").subcategory("X-Ray").build(),
            CptCode.builder().code("73560").description("Radiologic examination, knee; 1 or 2 views").category("Radiology").subcategory("X-Ray").build(),
            CptCode.builder().code("70553").description("MRI brain without contrast and with contrast").category("Radiology").subcategory("MRI").build(),
            CptCode.builder().code("74177").description("CT abdomen and pelvis with contrast").category("Radiology").subcategory("CT Scan").build(),
            CptCode.builder().code("76856").description("Ultrasound, pelvic (nonobstetric), real-time with image documentation").category("Radiology").subcategory("Ultrasound").build(),

            // Lab
            CptCode.builder().code("80053").description("Comprehensive metabolic panel (CMP) — 14 chemical constituents").category("Laboratory").subcategory("Chemistry").build(),
            CptCode.builder().code("85025").description("Complete blood count (CBC) with differential WBC").category("Laboratory").subcategory("Hematology").build(),
            CptCode.builder().code("80061").description("Lipid panel (total cholesterol, HDL, LDL, triglycerides)").category("Laboratory").subcategory("Chemistry").build(),
            CptCode.builder().code("83036").description("Hemoglobin A1c level").category("Laboratory").subcategory("Chemistry").build(),
            CptCode.builder().code("84443").description("Thyroid stimulating hormone (TSH)").category("Laboratory").subcategory("Endocrine").build(),
            CptCode.builder().code("81001").description("Urinalysis, by dip stick or tablet reagent, automated, with microscopy").category("Laboratory").subcategory("Urinalysis").build(),

            // Therapy
            CptCode.builder().code("97110").description("Therapeutic exercises to develop strength, endurance, flexibility, and ROM").category("Therapy").subcategory("Physical Therapy").build(),
            CptCode.builder().code("97140").description("Manual therapy techniques (e.g., mobilization, manipulation, manual traction)").category("Therapy").subcategory("Physical Therapy").build(),
            CptCode.builder().code("90834").description("Psychotherapy, 45 minutes with patient").category("Therapy").subcategory("Behavioral Health").build(),
            CptCode.builder().code("90837").description("Psychotherapy, 60 minutes with patient").category("Therapy").subcategory("Behavioral Health").build(),
            CptCode.builder().code("90847").description("Family psychotherapy (conjoint psychotherapy) with patient present, 50 minutes").category("Therapy").subcategory("Behavioral Health").build(),

            // Immunization
            CptCode.builder().code("90471").description("Immunization administration (first vaccine/toxoid component)").category("Immunization").subcategory("Administration").build(),
            CptCode.builder().code("90686").description("Influenza virus vaccine, quadrivalent (IIV4), preservative free, intramuscular").category("Immunization").subcategory("Vaccine").build(),
            CptCode.builder().code("90715").description("Tdap vaccine (tetanus, diphtheria, acellular pertussis), intramuscular").category("Immunization").subcategory("Vaccine").build()
        );

        cptRepo.saveAll(codes);
        log.info("Seeded {} CPT codes", codes.size());
    }
}
