-- 0187_rls_phase26_and_sanpin_tables.sql
-- RLS Tenant Isolation (PostgreSQL 18) for all 37 secondary tables of wave 0176/0181.
-- Enforces ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY, and fail-closed tenant_isolation policy.
--
-- Supported GUC variables (fail-closed, 22P02-safe with NULLIF wrapper):
--   1. app.current_organization_id (canonical tenant context)
--   2. app.current_tenant (backward-compatible legacy transaction helper setting)
--   3. app.superuser_bypass (superuser read bypass when set to 'on')

-- 1. anesthesia_logs
ALTER TABLE "anesthesia_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anesthesia_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "anesthesia_logs";
CREATE POLICY tenant_isolation ON "anesthesia_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 2. autoclave_daily_tests
ALTER TABLE "autoclave_daily_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "autoclave_daily_tests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "autoclave_daily_tests";
CREATE POLICY tenant_isolation ON "autoclave_daily_tests"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 3. bactericidal_equipments
ALTER TABLE "bactericidal_equipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bactericidal_equipments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "bactericidal_equipments";
CREATE POLICY tenant_isolation ON "bactericidal_equipments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 4. bactericidal_irradiator_logs
ALTER TABLE "bactericidal_irradiator_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bactericidal_irradiator_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "bactericidal_irradiator_logs";
CREATE POLICY tenant_isolation ON "bactericidal_irradiator_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 5. bonus_transactions
ALTER TABLE "bonus_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bonus_transactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "bonus_transactions";
CREATE POLICY tenant_isolation ON "bonus_transactions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 6. cash_shifts
ALTER TABLE "cash_shifts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_shifts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "cash_shifts";
CREATE POLICY tenant_isolation ON "cash_shifts"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 7. drug_catalog
ALTER TABLE "drug_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drug_catalog" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "drug_catalog";
CREATE POLICY tenant_isolation ON "drug_catalog"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 8. drug_interactions
ALTER TABLE "drug_interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drug_interactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "drug_interactions";
CREATE POLICY tenant_isolation ON "drug_interactions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 9. egisz_audit_logs
ALTER TABLE "egisz_audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "egisz_audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "egisz_audit_logs";
CREATE POLICY tenant_isolation ON "egisz_audit_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 10. egisz_outbox
ALTER TABLE "egisz_outbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "egisz_outbox" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "egisz_outbox";
CREATE POLICY tenant_isolation ON "egisz_outbox"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 11. electronic_prescription_items
ALTER TABLE "electronic_prescription_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "electronic_prescription_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "electronic_prescription_items";
CREATE POLICY tenant_isolation ON "electronic_prescription_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 12. electronic_prescriptions
ALTER TABLE "electronic_prescriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "electronic_prescriptions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "electronic_prescriptions";
CREATE POLICY tenant_isolation ON "electronic_prescriptions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 13. emergency_biohazard_logs
ALTER TABLE "emergency_biohazard_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "emergency_biohazard_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "emergency_biohazard_logs";
CREATE POLICY tenant_isolation ON "emergency_biohazard_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 14. general_cleaning_logs
ALTER TABLE "general_cleaning_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "general_cleaning_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "general_cleaning_logs";
CREATE POLICY tenant_isolation ON "general_cleaning_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 15. implant_catalog_items
ALTER TABLE "implant_catalog_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "implant_catalog_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "implant_catalog_items";
CREATE POLICY tenant_isolation ON "implant_catalog_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 16. implant_isq_measurements
ALTER TABLE "implant_isq_measurements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "implant_isq_measurements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "implant_isq_measurements";
CREATE POLICY tenant_isolation ON "implant_isq_measurements"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 17. inventory_transfers
ALTER TABLE "inventory_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transfers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "inventory_transfers";
CREATE POLICY tenant_isolation ON "inventory_transfers"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR sender_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    OR receiver_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
  )
  WITH CHECK (
    sender_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    OR receiver_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
  );

-- 18. inventory_transfer_items
ALTER TABLE "inventory_transfer_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transfer_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "inventory_transfer_items";
CREATE POLICY tenant_isolation ON "inventory_transfer_items"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "inventory_transfers" it
       WHERE it.id = "inventory_transfer_items".transfer_id
         AND (
           it.sender_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
           OR it.receiver_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "inventory_transfers" it
       WHERE it.id = "inventory_transfer_items".transfer_id
         AND (
           it.sender_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
           OR it.receiver_organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
         )
    )
  );

-- 19. lab_items
ALTER TABLE "lab_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lab_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "lab_items";
CREATE POLICY tenant_isolation ON "lab_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 20. lab_order_events
ALTER TABLE "lab_order_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lab_order_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "lab_order_events";
CREATE POLICY tenant_isolation ON "lab_order_events"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 21. loyalty_programs
ALTER TABLE "loyalty_programs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "loyalty_programs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "loyalty_programs";
CREATE POLICY tenant_isolation ON "loyalty_programs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 22. mdlp_items
ALTER TABLE "mdlp_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mdlp_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "mdlp_items";
CREATE POLICY tenant_isolation ON "mdlp_items"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 23. medical_waste_logs
ALTER TABLE "medical_waste_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "medical_waste_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "medical_waste_logs";
CREATE POLICY tenant_isolation ON "medical_waste_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 24. patient_bonus_balances
ALTER TABLE "patient_bonus_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_bonus_balances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_bonus_balances";
CREATE POLICY tenant_isolation ON "patient_bonus_balances"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 25. patient_drug_allergies
ALTER TABLE "patient_drug_allergies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_drug_allergies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_drug_allergies";
CREATE POLICY tenant_isolation ON "patient_drug_allergies"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 26. patient_implant_installations
ALTER TABLE "patient_implant_installations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_implant_installations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_implant_installations";
CREATE POLICY tenant_isolation ON "patient_implant_installations"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 27. patient_referral_codes
ALTER TABLE "patient_referral_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_referral_codes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_referral_codes";
CREATE POLICY tenant_isolation ON "patient_referral_codes"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 28. patient_referrals
ALTER TABLE "patient_referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_referrals" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_referrals";
CREATE POLICY tenant_isolation ON "patient_referrals"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 29. perio_charts
ALTER TABLE "perio_charts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "perio_charts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "perio_charts";
CREATE POLICY tenant_isolation ON "perio_charts"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 30. pre_sterilization_cleaning_logs
ALTER TABLE "pre_sterilization_cleaning_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pre_sterilization_cleaning_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "pre_sterilization_cleaning_logs";
CREATE POLICY tenant_isolation ON "pre_sterilization_cleaning_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 31. referral_campaigns
ALTER TABLE "referral_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referral_campaigns" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "referral_campaigns";
CREATE POLICY tenant_isolation ON "referral_campaigns"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 32. shift_discrepancy_reports
ALTER TABLE "shift_discrepancy_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shift_discrepancy_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "shift_discrepancy_reports";
CREATE POLICY tenant_isolation ON "shift_discrepancy_reports"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "cash_shifts" cs
       WHERE cs.id = "shift_discrepancy_reports".shift_id
         AND cs.organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "cash_shifts" cs
       WHERE cs.id = "shift_discrepancy_reports".shift_id
         AND cs.organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    )
  );
CREATE INDEX IF NOT EXISTS "idx_shift_discrepancy_reports_shift_id" ON "shift_discrepancy_reports" ("shift_id");

-- 33. temperature_humidity_equipments
ALTER TABLE "temperature_humidity_equipments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "temperature_humidity_equipments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "temperature_humidity_equipments";
CREATE POLICY tenant_isolation ON "temperature_humidity_equipments"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 34. temperature_humidity_logs
ALTER TABLE "temperature_humidity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "temperature_humidity_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "temperature_humidity_logs";
CREATE POLICY tenant_isolation ON "temperature_humidity_logs"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 35. appointment_action_codes
ALTER TABLE "appointment_action_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_action_codes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "appointment_action_codes";
CREATE POLICY tenant_isolation ON "appointment_action_codes"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 36. communication_campaigns
ALTER TABLE "communication_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "communication_campaigns" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "communication_campaigns";
CREATE POLICY tenant_isolation ON "communication_campaigns"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- 37. patient_duplicate_decisions
ALTER TABLE "patient_duplicate_decisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_duplicate_decisions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_duplicate_decisions";
CREATE POLICY tenant_isolation ON "patient_duplicate_decisions"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);
