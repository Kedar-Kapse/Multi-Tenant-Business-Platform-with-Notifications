-- Hospital (tenant) data separation for business-service tables.
--
-- Each hospital-owned table gets tenant_realm (the hospital's Keycloak realm).
-- Hibernate fills and filters it from then on (@TenantId, see TenantIdentifierResolver).
--
-- Safe on an EXISTING database: old rows are given a hospital -- the patient's
-- hospital where the row belongs to a known patient, otherwise ${legacyTenant}
-- (LEGACY_TENANT_REALM). Safe on a FRESH database: the tables do not exist yet
-- (Flyway runs before Hibernate creates them), so every step is skipped.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY['patients','appointments','invoices','messages','patient_documents','claims',
                           'fee_schedules','ehr_templates','facilities','beds','pharmacy_stock',
                           'patient_provider_mapping'];
BEGIN
    -- 1. the column
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_realm varchar(64)', t);
        END IF;
    END LOOP;

    -- 2. fill it for existing rows
    IF to_regclass('public.patients') IS NOT NULL THEN
        UPDATE patients SET tenant_realm = '${legacyTenant}' WHERE tenant_realm IS NULL;

        -- rows that belong to a patient take that patient's hospital
        -- (patient ids are stored as the patient's login id or as the patient row id)
        IF to_regclass('public.appointments') IS NOT NULL THEN
            UPDATE appointments a SET tenant_realm = p.tenant_realm FROM patients p
             WHERE a.tenant_realm IS NULL AND (a.patient_id = p.keycloak_user_id OR a.patient_id = p.id::text);
        END IF;
        IF to_regclass('public.invoices') IS NOT NULL THEN
            UPDATE invoices i SET tenant_realm = p.tenant_realm FROM patients p
             WHERE i.tenant_realm IS NULL AND (i.patient_id = p.keycloak_user_id OR i.patient_id = p.id::text);
        END IF;
        IF to_regclass('public.patient_documents') IS NOT NULL THEN
            UPDATE patient_documents d SET tenant_realm = p.tenant_realm FROM patients p
             WHERE d.tenant_realm IS NULL AND (d.patient_id = p.keycloak_user_id OR d.patient_id = p.id::text);
        END IF;
        IF to_regclass('public.claims') IS NOT NULL THEN
            UPDATE claims c SET tenant_realm = p.tenant_realm FROM patients p
             WHERE c.tenant_realm IS NULL AND (c.patient_id = p.keycloak_user_id OR c.patient_id = p.id::text);
        END IF;
        IF to_regclass('public.messages') IS NOT NULL THEN
            UPDATE messages m SET tenant_realm = p.tenant_realm FROM patients p
             WHERE m.tenant_realm IS NULL AND p.keycloak_user_id IN (m.sender_id, m.recipient_id);
        END IF;
        IF to_regclass('public.patient_provider_mapping') IS NOT NULL THEN
            UPDATE patient_provider_mapping x SET tenant_realm = p.tenant_realm FROM patients p
             WHERE x.tenant_realm IS NULL AND x.patient_id::text = p.id::text;
        END IF;
    END IF;

    -- facilities know their tenant row; beds and stock follow their facility
    IF to_regclass('public.facilities') IS NOT NULL AND to_regclass('public.tenants') IS NOT NULL THEN
        UPDATE facilities f SET tenant_realm = tn.realm_name FROM tenants tn
         WHERE f.tenant_realm IS NULL AND f.tenant_id = tn.id;
    END IF;
    IF to_regclass('public.facilities') IS NOT NULL THEN
        UPDATE facilities SET tenant_realm = '${legacyTenant}' WHERE tenant_realm IS NULL;
        IF to_regclass('public.beds') IS NOT NULL THEN
            UPDATE beds b SET tenant_realm = f.tenant_realm FROM facilities f
             WHERE b.tenant_realm IS NULL AND b.facility_id = f.id;
        END IF;
        IF to_regclass('public.pharmacy_stock') IS NOT NULL THEN
            UPDATE pharmacy_stock s SET tenant_realm = f.tenant_realm FROM facilities f
             WHERE s.tenant_realm IS NULL AND s.facility_id = f.id;
        END IF;
    END IF;

    -- everything still without a hospital
    FOREACH t IN ARRAY tables LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('UPDATE %I SET tenant_realm = %L WHERE tenant_realm IS NULL', t, '${legacyTenant}');
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_realm SET NOT NULL', t);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_realm)', 'idx_' || t || '_tenant', t);
        END IF;
    END LOOP;
END $$;

-- 3. unique rules become per hospital
DO $$
DECLARE
    c record;
BEGIN
    -- drop the old global single-column unique rules (named and Hibernate auto-named)
    FOR c IN
        SELECT con.conrelid::regclass::text AS tbl, con.conname
          FROM pg_constraint con
          JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
         WHERE con.contype = 'u' AND array_length(con.conkey, 1) = 1
           AND ((con.conrelid = to_regclass('public.patients') AND att.attname IN ('email', 'mrn', 'ssn_hash'))
             OR (con.conrelid = to_regclass('public.fee_schedules') AND att.attname = 'code'))
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', c.tbl, c.conname);
    END LOOP;

    IF to_regclass('public.patients') IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_patient_tenant_email') THEN
            ALTER TABLE patients ADD CONSTRAINT uk_patient_tenant_email UNIQUE (tenant_realm, email);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_patient_tenant_mrn') THEN
            ALTER TABLE patients ADD CONSTRAINT uk_patient_tenant_mrn UNIQUE (tenant_realm, mrn);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_patient_tenant_ssn_hash') THEN
            ALTER TABLE patients ADD CONSTRAINT uk_patient_tenant_ssn_hash UNIQUE (tenant_realm, ssn_hash);
        END IF;
    END IF;
    IF to_regclass('public.fee_schedules') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_fee_tenant_code') THEN
        ALTER TABLE fee_schedules ADD CONSTRAINT uk_fee_tenant_code UNIQUE (tenant_realm, code);
    END IF;
END $$;

-- 4. indexes for the queries the app actually runs (none existed)
DO $$
BEGIN
    IF to_regclass('public.patients') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_patients_keycloak_user ON patients (keycloak_user_id) WHERE deleted_at IS NULL;
        CREATE INDEX IF NOT EXISTS idx_patients_tenant_created ON patients (tenant_realm, created_at DESC) WHERE deleted_at IS NULL;
    END IF;
    IF to_regclass('public.appointments') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_appt_patient_date ON appointments (patient_id, appointment_date DESC, start_time DESC);
        CREATE INDEX IF NOT EXISTS idx_appt_provider_date ON appointments (provider_id, appointment_date);
        -- one booking per provider slot (the app's check alone could race)
        BEGIN
            CREATE UNIQUE INDEX IF NOT EXISTS uk_appt_slot ON appointments (provider_id, appointment_date, start_time)
             WHERE status = 'SCHEDULED';
        EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'uk_appt_slot not created: existing double bookings must be resolved first';
        END;
    END IF;
    IF to_regclass('public.invoices') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_invoice_patient_issue ON invoices (patient_id, issue_date DESC);
    END IF;
    IF to_regclass('public.messages') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_msg_recipient_unread ON messages (recipient_id, read, sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_msg_sender ON messages (sender_id, sent_at DESC);
        CREATE INDEX IF NOT EXISTS idx_msg_thread ON messages (thread_id, sent_at);
    END IF;
    IF to_regclass('public.patient_documents') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_doc_patient_cat ON patient_documents (patient_id, category, uploaded_at DESC);
    END IF;
    IF to_regclass('public.claims') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS idx_claims_tenant_status ON claims (tenant_realm, status);
    END IF;
END $$;
