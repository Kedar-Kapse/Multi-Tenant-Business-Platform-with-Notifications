-- Hospital (tenant) data separation for access-security tables (staff, audit_logs).
-- Same approach as business-service V1: add tenant_realm, give existing rows
-- ${legacyTenant} (LEGACY_TENANT_REALM), make staff email unique per hospital.
-- Safe on a fresh database (tables not created yet -> skipped).

DO $$
DECLARE
    c record;
BEGIN
    IF to_regclass('public.staff') IS NOT NULL THEN
        ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_realm varchar(64);
        UPDATE staff SET tenant_realm = '${legacyTenant}' WHERE tenant_realm IS NULL;
        ALTER TABLE staff ALTER COLUMN tenant_realm SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff (tenant_realm);
        CREATE INDEX IF NOT EXISTS idx_staff_keycloak ON staff (keycloak_user_id);

        FOR c IN
            SELECT con.conname FROM pg_constraint con
              JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = con.conkey[1]
             WHERE con.conrelid = to_regclass('public.staff') AND con.contype = 'u'
               AND array_length(con.conkey, 1) = 1 AND att.attname = 'email'
        LOOP
            EXECUTE format('ALTER TABLE staff DROP CONSTRAINT %I', c.conname);
        END LOOP;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_staff_tenant_email') THEN
            ALTER TABLE staff ADD CONSTRAINT uk_staff_tenant_email UNIQUE (tenant_realm, email);
        END IF;
    END IF;

    IF to_regclass('public.audit_logs') IS NOT NULL THEN
        UPDATE audit_logs SET tenant_realm = '${legacyTenant}' WHERE tenant_realm IS NULL;
        ALTER TABLE audit_logs ALTER COLUMN tenant_realm SET NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_audit_tenant_created ON audit_logs (tenant_realm, created_at DESC);
    END IF;
END $$;
