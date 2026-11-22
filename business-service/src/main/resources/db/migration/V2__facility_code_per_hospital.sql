-- Facility codes are unique per hospital (tenant_realm). The old rule keyed on
-- facilities.tenant_id, which is now optional (the hospital comes from the login).
DO $$
BEGIN
    IF to_regclass('public.facilities') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_facility_tenant_code') THEN
            ALTER TABLE facilities DROP CONSTRAINT uk_facility_tenant_code;
        END IF;
        ALTER TABLE facilities ALTER COLUMN tenant_id DROP NOT NULL;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_facility_realm_code') THEN
            ALTER TABLE facilities ADD CONSTRAINT uk_facility_realm_code UNIQUE (tenant_realm, facility_code);
        END IF;
    END IF;
END $$;
