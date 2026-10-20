/**
 * clinicalStopFactorsTables.ts — Layer 0: Anesthesia monitoring, allergies, contraindications & insurance contracts.
 *
 * Verbatim extraction from clinicalRulesSchema.ts to satisfy the <= 500 lines limit.
 */

import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../../auth.js";
import { patients } from "../../patients.js";
import { visits } from "../visitsSchema.js";

// insurance contracts (DMS / voluntary health insurance)
export const insuranceContracts = pgTable(
	"insurance_contracts",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		companyName: text("company_name").notNull(),
		policyNumberMask: text("policy_number_mask"),
		coverageTherapyPct: numeric("coverage_therapy_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageSurgeryPct: numeric("coverage_surgery_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageOrthoPct: numeric("coverage_ortho_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		coverageHygienePct: numeric("coverage_hygiene_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		annualLimitRub: numeric("annual_limit_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		patientFranchisePct: numeric("patient_franchise_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		requiresGuaranteeLetter: boolean("requires_guarantee_letter")
			.notNull()
			.default(true),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("insurance_contracts_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// DMS guarantee letters (Гарантийные письма ДМС)
export const dmsGuaranteeLetters = pgTable(
	"dms_guarantee_letters",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		contractId: uuid("contract_id").references(() => insuranceContracts.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		patientFullName: text("patient_full_name").notNull(),
		patientBirthDate: text("patient_birth_date"),
		policyNumber: text("policy_number").notNull(),
		insurerKey: text("insurer_key").notNull().default("custom"),
		insurerName: text("insurer_name").notNull(),
		letterNumber: text("letter_number").notNull(),
		issueDate: text("issue_date").notNull(),
		validFrom: text("valid_from").notNull(),
		validUntil: text("valid_until").notNull(),
		maxCoverageRub: numeric("max_coverage_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}).notNull(),
		usedAmountRub: numeric("used_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		franchisePct: numeric("franchise_pct", {
			precision: 5,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		franchiseType: text("franchise_type").notNull().default("percent"),
		franchiseFixedRub: numeric("franchise_fixed_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		})
			.notNull()
			.default(0),
		programExclusions: jsonb("program_exclusions")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		approvedServiceCodes: jsonb("approved_service_codes")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		approvedTeethFdi: jsonb("approved_teeth_fdi")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		approvedDiagnosisCodes: jsonb("approved_diagnosis_codes")
			.$type<string[]>()
			.notNull()
			.default(sql`'[]'::jsonb`),
		curatorFullName: text("curator_full_name"),
		curatorPhone: text("curator_phone"),
		notes: text("notes").notNull().default(""),
		status: text("status").notNull().default("active"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dms_guarantee_letters_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("dms_guarantee_letters_patient_id_idx").on(
			t.patientId,
		),
		statusIdx: index("dms_guarantee_letters_status_idx").on(t.status),
		letterNumberIdx: index("dms_guarantee_letters_letter_number_idx").on(
			t.organizationId,
			t.letterNumber,
		),
	}),
);

// ─── Anesthesia & Vital Signs Monitoring Logs ────────────────────────────────

export const anesthesiaLogs = pgTable(
	"anesthesia_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		technique: text("technique").notNull().default("infiltration"),
		drug: text("drug").notNull().default("articaine"),
		drugBrandName: text("drug_brand_name").notNull().default("Ультракаин Д-С"),
		concentrationPct: numeric("concentration_pct", { precision: 4, scale: 2 })
			.notNull()
			.default("4.00"),
		vasoconstrictor: text("vasoconstrictor").notNull().default("1:200000"),
		carpuleVolumeMl: numeric("carpule_volume_ml", { precision: 4, scale: 2 })
			.notNull()
			.default("1.70"),
		carpulesAdministered: numeric("carpules_administered", {
			precision: 4,
			scale: 2,
		})
			.notNull()
			.default("1.00"),
		totalDoseMg: numeric("total_dose_mg", { precision: 6, scale: 2 }).notNull(),
		maxAllowedDoseMg: numeric("max_allowed_dose_mg", {
			precision: 6,
			scale: 2,
		}).notNull(),
		epinephrineMg: numeric("epinephrine_mg", { precision: 6, scale: 4 })
			.notNull()
			.default("0.0000"),
		maxEpinephrineMg: numeric("max_epinephrine_mg", {
			precision: 6,
			scale: 4,
		})
			.notNull()
			.default("0.2000"),
		aspirationTestPositive: boolean("aspiration_test_positive")
			.notNull()
			.default(false),
		toothNumbers: jsonb("tooth_numbers").notNull().default(sql`'[]'::jsonb`),
		injectionSite: text("injection_site"),
		lotNumber: text("lot_number"),
		expirationDate: date("expiration_date"),
		vitalsPre: jsonb("vitals_pre"),
		vitalsIntra: jsonb("vitals_intra"),
		vitalsPost: jsonb("vitals_post"),
		notes: text("notes"),
		complications: text("complications"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("anesthesia_logs_org_patient_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		visitIdx: index("anesthesia_logs_visit_idx").on(t.visitId),
	}),
);
