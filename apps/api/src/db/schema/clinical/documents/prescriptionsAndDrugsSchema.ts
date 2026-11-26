import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../../auth.js";
import { patients } from "../../patients.js";
import { visits } from "../visitsSchema.js";

// ─────────────────────────────────────────────────────────────
// PHASE 26: DENTAL PHARMACOLOGY & 1094н PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────

export const drugInteractions = pgTable(
	"drug_interactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		drugAInnLatin: text("drug_a_inn_latin").notNull(),
		drugBInnLatin: text("drug_b_inn_latin").notNull(),
		severity: text("severity").notNull().default("warning"),
		interactionType: text("interaction_type").notNull(),
		clinicalEffectRu: text("clinical_effect_ru").notNull(),
		mechanismDescription: text("mechanism_description").notNull(),
		managementRecommendation: text("management_recommendation").notNull(),
		evidenceLevel: text("evidence_level").notNull().default("established"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPairUnique: unique("drug_interactions_org_pair_unique").on(
			t.organizationId,
			t.drugAInnLatin,
			t.drugBInnLatin,
		),
		orgIdx: index("drug_interactions_organization_id_idx").on(t.organizationId),
	}),
);

export const electronicPrescriptions = pgTable(
	"electronic_prescriptions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id").references(() => visits.id, {
			onDelete: "set null",
		}),
		prescribingDoctorId: uuid("prescribing_doctor_id")
			.notNull()
			.references(() => users.id, { onDelete: "restrict" }),
		prescriptionSeries: varchar("prescription_series", { length: 16 }).default(
			"107-1У",
		),
		prescriptionNumber: varchar("prescription_number", { length: 32 }).notNull(),
		formType: text("form_type").notNull().default("form_107_1_u"),
		status: text("status").notNull().default("draft"),
		validityPeriod: text("validity_period").notNull().default("days_60"),
		isSpecialChronicIndication: boolean("is_special_chronic_indication")
			.notNull()
			.default(false),
		chronicDispenseFrequencyNotes: text("chronic_dispense_frequency_notes"),
		patientFullName: text("patient_full_name").notNull(),
		patientBirthDate: text("patient_birth_date").notNull(),
		patientCardNumber: text("patient_card_number").notNull(),
		doctorFullName: text("doctor_full_name").notNull(),
		clinicalDiagnosisMkb10: varchar("clinical_diagnosis_mkb10", { length: 16 }),
		clinicalDiagnosisDescription: text("clinical_diagnosis_description"),
		safetyAuditPassed: boolean("safety_audit_passed").notNull().default(false),
		safetyAuditSnapshotJson: jsonb("safety_audit_snapshot_json")
			.notNull()
			.default(sql`'{}'::jsonb`),
		cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancellationReason: text("cancellation_reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPatientIdx: index("prescriptions_org_patient_idx").on(
			t.organizationId,
			t.patientId,
			t.createdAt,
		),
		prescriptionNumUnique: unique("prescriptions_org_number_unique").on(
			t.organizationId,
			t.prescriptionNumber,
		),
		visitIdIdx: index("prescriptions_visit_id_idx").on(t.visitId),
		prescribingDoctorIdIdx: index("prescriptions_doctor_id_idx").on(
			t.prescribingDoctorId,
		),
		orgStatusIdx: index("prescriptions_org_status_idx").on(
			t.organizationId,
			t.status,
		),
		orgCreatedIdx: index("prescriptions_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
	}),
);

export const electronicPrescriptionItems = pgTable(
	"electronic_prescription_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		prescriptionId: uuid("prescription_id")
			.notNull()
			.references(() => electronicPrescriptions.id, { onDelete: "cascade" }),
		catalogDrugId: uuid("catalog_drug_id"),
		itemIndex: integer("item_index").notNull().default(1),
		innLatin: text("inn_latin").notNull(),
		tradeName: text("trade_name"),
		dosageFormLatin: text("dosage_form_latin").notNull(),
		dosageDoseConcentration: text("dosage_dose_concentration").notNull(),
		dispenseInstructionLatin: text("dispense_instruction_latin").notNull(),
		signatureDirectionRussian: text("signature_direction_russian").notNull(),
		quantityPackages: integer("quantity_packages").notNull().default(1),
		durationDays: integer("duration_days").notNull().default(7),
		frequencyTimesPerDay: integer("frequency_times_per_day").notNull().default(3),
		mealRelation: text("meal_relation").notNull().default("after_meal"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgPrescriptionIdx: index("prescription_items_org_presc_idx").on(
			t.organizationId,
			t.prescriptionId,
		),
		catalogDrugIdIdx: index("prescription_items_catalog_drug_id_idx").on(
			t.catalogDrugId,
		),
	}),
);

export type DrugInteraction = typeof drugInteractions.$inferSelect;
export type NewDrugInteraction = typeof drugInteractions.$inferInsert;
export type ElectronicPrescription = typeof electronicPrescriptions.$inferSelect;
export type NewElectronicPrescription = typeof electronicPrescriptions.$inferInsert;
export type ElectronicPrescriptionItem = typeof electronicPrescriptionItems.$inferSelect;
export type NewElectronicPrescriptionItem = typeof electronicPrescriptionItems.$inferInsert;
