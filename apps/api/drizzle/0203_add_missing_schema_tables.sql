-- 0203_add_missing_schema_tables.sql
-- Table definitions and fail-closed RLS tenant isolation for:
-- 1. patient_relationships (Family relationships, legal representatives, family shared balance)
-- 2. periodontogram_snapshots (SEPA/WHO periodontal examination snapshots)
-- 3. periodontogram_teeth (FDI teeth 11..48 mobility, furcation, gingiva)
-- 4. periodontogram_sites (6 sites per tooth: probing depth, bleeding, plaque, calculus, suppuration)
-- 5. copilot_hitl_cards (AI copilot human-in-the-loop approval cards)

-- ============================================================================
-- 1. PATIENT RELATIONSHIPS & LEGAL GUARDIANSHIP
-- ============================================================================

CREATE TABLE IF NOT EXISTS "patient_relationships" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"related_patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"relationship_type" text NOT NULL,
	"is_legal_representative" boolean NOT NULL DEFAULT false,
	"can_view_medical_record" boolean NOT NULL DEFAULT false,
	"can_sign_consents" boolean NOT NULL DEFAULT false,
	"can_spend_family_wallet" boolean NOT NULL DEFAULT false,
	"document_proof_number" text,
	"is_primary_payer" boolean NOT NULL DEFAULT false,
	"can_view_records" boolean NOT NULL DEFAULT false,
	"notes" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now(),
	CONSTRAINT "patient_relationships_no_self_link" CHECK ("patient_id" != "related_patient_id")
);

CREATE INDEX IF NOT EXISTS "patient_relationships_org_idx" ON "patient_relationships" ("organization_id");
CREATE INDEX IF NOT EXISTS "patient_relationships_patient_idx" ON "patient_relationships" ("organization_id", "patient_id");
CREATE INDEX IF NOT EXISTS "patient_relationships_related_patient_idx" ON "patient_relationships" ("organization_id", "related_patient_id");
CREATE UNIQUE INDEX IF NOT EXISTS "patient_relationships_pair_uniq_idx" ON "patient_relationships" ("patient_id", "related_patient_id");

ALTER TABLE "patient_relationships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_relationships" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "patient_relationships";
CREATE POLICY tenant_isolation ON "patient_relationships"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- ============================================================================
-- 2. PERIODONTOGRAM SNAPSHOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS "periodontogram_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"status" text NOT NULL DEFAULT 'draft',
	"recorded_at" timestamp with time zone NOT NULL DEFAULT now(),
	"recorded_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"closed_at" timestamp with time zone,
	"closed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"notes" text,
	"indices" jsonb,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_perio_snap_one_draft_per_patient" ON "periodontogram_snapshots" ("organization_id", "patient_id") WHERE status = 'draft';
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_org_idx" ON "periodontogram_snapshots" ("organization_id");
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_patient_idx" ON "periodontogram_snapshots" ("patient_id");
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_patient_status_idx" ON "periodontogram_snapshots" ("patient_id", "status");

ALTER TABLE "periodontogram_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "periodontogram_snapshots" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "periodontogram_snapshots";
CREATE POLICY tenant_isolation ON "periodontogram_snapshots"
  USING (current_setting('app.superuser_bypass', true) = 'on' OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid)
  WITH CHECK (organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid);

-- ============================================================================
-- 3. PERIODONTOGRAM TEETH
-- ============================================================================

CREATE TABLE IF NOT EXISTS "periodontogram_teeth" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"snapshot_id" uuid NOT NULL REFERENCES "periodontogram_snapshots"("id") ON DELETE CASCADE,
	"tooth_number" integer NOT NULL,
	"is_present" boolean NOT NULL DEFAULT true,
	"is_implant" boolean NOT NULL DEFAULT false,
	"mobility" integer,
	"prognosis" text,
	"furcation_buccal" text,
	"furcation_lingual" text,
	"keratinized_gingiva_mm" integer,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_perio_tooth_snap" ON "periodontogram_teeth" ("snapshot_id", "tooth_number");
CREATE INDEX IF NOT EXISTS "periodontogram_teeth_snapshot_id_idx" ON "periodontogram_teeth" ("snapshot_id");

ALTER TABLE "periodontogram_teeth" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "periodontogram_teeth" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "periodontogram_teeth";
CREATE POLICY tenant_isolation ON "periodontogram_teeth"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "periodontogram_snapshots" s
      WHERE s.id = snapshot_id
        AND s.organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "periodontogram_snapshots" s
      WHERE s.id = snapshot_id
        AND s.organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    )
  );

-- ============================================================================
-- 4. PERIODONTOGRAM SITES (6 sites per tooth)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "periodontogram_sites" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7(),
	"snapshot_id" uuid NOT NULL REFERENCES "periodontogram_snapshots"("id") ON DELETE CASCADE,
	"tooth_id" uuid REFERENCES "periodontogram_teeth"("id") ON DELETE CASCADE,
	"tooth_number" integer NOT NULL,
	"site_code" text NOT NULL,
	"probing_depth_mm" integer,
	"gingival_margin_mm" integer,
	"bleeding_on_probing" boolean NOT NULL DEFAULT false,
	"plaque" boolean NOT NULL DEFAULT false,
	"suppuration" boolean NOT NULL DEFAULT false,
	"calculus" boolean NOT NULL DEFAULT false,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_perio_site_snap_tooth_code" ON "periodontogram_sites" ("snapshot_id", "tooth_number", "site_code");
CREATE INDEX IF NOT EXISTS "periodontogram_sites_snapshot_id_idx" ON "periodontogram_sites" ("snapshot_id");
CREATE INDEX IF NOT EXISTS "periodontogram_sites_tooth_idx" ON "periodontogram_sites" ("snapshot_id", "tooth_id");

ALTER TABLE "periodontogram_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "periodontogram_sites" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "periodontogram_sites";
CREATE POLICY tenant_isolation ON "periodontogram_sites"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM "periodontogram_snapshots" s
      WHERE s.id = snapshot_id
        AND s.organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "periodontogram_snapshots" s
      WHERE s.id = snapshot_id
        AND s.organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))::uuid
    )
  );

-- ============================================================================
-- 5. COPILOT HITL CARDS (Human-in-the-loop approvals)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "copilot_hitl_cards" (
	"id" text PRIMARY KEY,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"phone" text NOT NULL,
	"intent" text NOT NULL,
	"urgency" text NOT NULL DEFAULT 'NORMAL',
	"incoming_snippet" text NOT NULL,
	"draft_reply" text NOT NULL,
	"channel" text NOT NULL DEFAULT 'whatsapp',
	"confidence_score" text,
	"action_prompt" text,
	"status" text NOT NULL DEFAULT 'pending',
	"rejection_reason" text,
	"category" text,
	"metadata" jsonb,
	"is_within_24h_window" text,
	"template_required" text,
	"created_at" timestamp with time zone NOT NULL DEFAULT now(),
	"resolved_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "copilot_hitl_cards_org_idx" ON "copilot_hitl_cards" ("organization_id");
CREATE INDEX IF NOT EXISTS "copilot_hitl_cards_status_idx" ON "copilot_hitl_cards" ("status");
CREATE INDEX IF NOT EXISTS "copilot_hitl_cards_created_idx" ON "copilot_hitl_cards" ("created_at");

ALTER TABLE "copilot_hitl_cards" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "copilot_hitl_cards" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "copilot_hitl_cards";
CREATE POLICY tenant_isolation ON "copilot_hitl_cards"
  USING (
    current_setting('app.superuser_bypass', true) = 'on'
    OR organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))
  )
  WITH CHECK (
    organization_id = COALESCE(NULLIF(current_setting('app.current_organization_id', true), ''), NULLIF(current_setting('app.current_tenant', true), ''))
  );
