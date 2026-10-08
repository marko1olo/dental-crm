import type {
	DocumentIssueSignatureAttestation,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	TaxXmlSnapshot,
	TaxXmlSourceSnapshot,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import {
	documentKind,
	documentStatus,
	egiszStatus,
} from "../_common.js";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { visits } from "./visitsSchema.js";

export const generatedDocuments = pgTable(
	"generated_documents",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		visitId: uuid("visit_id").references(() => visits.id),
		kind: documentKind("kind").notNull(),
		status: documentStatus("status").notNull().default("draft"),
		title: text("title").notNull(),
		storagePath: text("storage_path"),
		totalAmountRub: numeric("total_amount_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		taxYear: integer("tax_year"),
		taxPayerInn: text("tax_payer_inn"),
		payloadJson: text("payload_json"),
		taxPaymentSnapshotJson: text("tax_payment_snapshot_json"),
		taxXmlSourceSnapshot: jsonb(
			"tax_xml_source_snapshot",
		).$type<TaxXmlSourceSnapshot | null>(),
		taxXmlSnapshot: jsonb("tax_xml_snapshot").$type<TaxXmlSnapshot | null>(),
		signatureAttestation: jsonb(
			"signature_attestation",
		).$type<DocumentIssueSignatureAttestation | null>(),
		voidAttestation: jsonb(
			"void_attestation",
		).$type<DocumentVoidAttestation | null>(),
		releaseJournalEntry: jsonb(
			"release_journal_entry",
		).$type<DocumentReleaseJournalEntry | null>(),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		issuedSnapshotSha256: text("issued_snapshot_sha256"),
		issuedSnapshotCreatedAt: timestamp("issued_snapshot_created_at", {
			withTimezone: true,
		}),
		issuedByUserId: uuid("issued_by_user_id").references(() => users.id),
		voidedAt: timestamp("voided_at", { withTimezone: true }),
		voidedByUserId: uuid("voided_by_user_id").references(() => users.id),
		// Ink / canvas signature captured in browser (base64 SVG or PNG data-URL)
		signatureSvg: text("signature_svg"),
		// UKEP / GOST-2012 detached PKCS#7 CMS signature blob (base64)
		cryptoSignaturePkcs7: text("crypto_signature_pkcs7"),
		cdaXmlSnapshot: text("cda_xml_snapshot"),
		cdaXmlSha256: text("cda_xml_sha256"),
		cdaTemplateOid: text("cda_template_oid"),
		cdaDocumentVersion: integer("cda_document_version").default(1),
		doctorSignaturePkcs7: text("doctor_signature_pkcs7"),
		doctorCertSerial: text("doctor_cert_serial"),
		doctorCertSubject: text("doctor_cert_subject"),
		doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
		moSignaturePkcs7: text("mo_signature_pkcs7"),
		moCertSerial: text("mo_cert_serial"),
		moCertSubject: text("mo_cert_subject"),
		moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
		egiszOutboxId: uuid("egisz_outbox_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			documentVisitPatientOrganizationFk: foreignKey({
				columns: [table.visitId, table.patientId, table.organizationId],
				foreignColumns: [visits.id, visits.patientId, visits.organizationId],
				name: "generated_documents_visit_patient_organization_fk",
			}),
			organizationIdIdx: index("generated_documents_organization_id_idx").on(
				table.organizationId,
			),
			patientIdIdx: index("generated_documents_patient_id_idx").on(
				table.patientId,
			),
			visitIdIdx: index("generated_documents_visit_id_idx").on(
				table.visitId,
			),
			idxOrgPatientCreated: index(
				"idx_generated_documents_org_patient_created",
			).on(table.organizationId, table.patientId, table.createdAt),
			issuedByUserIdIdx: index("generated_documents_issued_by_idx").on(
				table.issuedByUserId,
			),
			voidedByUserIdIdx: index("generated_documents_voided_by_idx").on(
				table.voidedByUserId,
			),
		};
	},
);

// egisz blank permissions (EGISZ REMD form access control)
export const egiszBlankPermissions = pgTable(
	"egisz_blank_permissions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		doctorId: uuid("doctor_id").notNull(),
		blankCode: text("blank_code").notNull(),
		blankTitle: text("blank_title").notNull(),
		isAllowed: boolean("is_allowed").notNull().default(true),
		/**
		 * СОГЛАСИЕ ПАЦИЕНТА НА ВЫГРУЗКУ В ЕГИСЗ — флаг есть в базе, читать его нечем.
		 *
		 * Колонка создана миграцией 0103 (строка 7) как
		 * `boolean DEFAULT true NOT NULL` и здесь не объявлялась. Она решает, будет
		 * ли отказ пациента учтён при выгрузке его медицинских данных в
		 * государственный реестр, — то есть это не служебный признак, а согласие.
		 *
		 * Виджет apps/web/src/components/integrations/EgiszBlankPermissionsWidget.tsx
		 * уже показывает его словами «учитывается» / «не учитывается», но серверного
		 * маршрута к этой таблице нет ни одного, а через drizzle колонка недостижима:
		 * показывать было нечего. Объявление — первое, без чего маршрут не написать.
		 */
		patientOptOutRespect: boolean("patient_opt_out_respect")
			.notNull()
			.default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_blank_permissions_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * ЖУРНАЛ ОБМЕНА С ЕГИСЗ.
 *
 * Таблица существует в базе с миграции 0000 (строки 521-529), но в этом файле не
 * была объявлена ни разу — поэтому её не видела ни одна перепись схемы, которая
 * ходит по объявлениям drizzle, и отсутствие изоляции по клинике прожило
 * незамеченным. Колонки перечислены по факту DDL, а не по догадке.
 */
export const egiszLogs = pgTable(
	"egisz_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		/**
		 * Добавлена миграцией 0145. Это журнал передачи медицинских данных в
		 * государственную систему: без принадлежности клинике он одинаково открыт
		 * любому арендатору базы, а строка журнала называет пациента и приём.
		 */
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		/**
		 * В базе колонка имеет тип `egisz_status_enum` со значениями
		 * Pending/Sent/Error/Accepted (миграция 0000, строка 26) — тот же набор, что
		 * у панели apps/web/src/components/integrations/egiszAvailability.ts.
		 */
		status: egiszStatus("status").notNull().default("Pending"),
		transactionId: text("transaction_id"),
		errorDetails: jsonb("error_details"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("egisz_logs_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("egisz_logs_patientId_idx").on(t.patientId),
		visitIdIdx: index("egisz_logs_visitId_idx").on(t.visitId),
	}),
);

export const egiszOutboxStatus = pgEnum("egisz_outbox_status_enum", [
	"queued",
	"validating",
	"signing_pending",
	"ready_for_dispatch",
	"sending",
	"registered_in_remd",
	"delivered_to_epgu",
	"failed",
	"rejected_by_remd",
]);

export const egiszOutbox = pgTable(
	"egisz_outbox",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		visitId: uuid("visit_id")
			.notNull()
			.references(() => visits.id, { onDelete: "cascade" }),
		documentId: uuid("document_id").references(() => generatedDocuments.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		doctorId: uuid("doctor_id")
			.notNull()
			.references(() => users.id),
		docTypeNsiCode: text("doc_type_nsi_code").notNull().default("108"),
		status: egiszOutboxStatus("status").notNull().default("queued"),
		payloadXml: text("payload_xml").notNull(),
		payloadHashSha256: text("payload_hash_sha256").notNull(),
		doctorSignaturePkcs7: text("doctor_signature_pkcs7").notNull(),
		doctorCertSerial: text("doctor_cert_serial").notNull(),
		doctorCertSubject: text("doctor_cert_subject").notNull(),
		doctorSignedAt: timestamp("doctor_signed_at", { withTimezone: true }),
		moSignaturePkcs7: text("mo_signature_pkcs7"),
		moCertSerial: text("mo_cert_serial"),
		moCertSubject: text("mo_cert_subject"),
		moSignedAt: timestamp("mo_signed_at", { withTimezone: true }),
		remdDocumentId: text("remd_document_id"),
		remdTransactionId: text("remd_transaction_id"),
		attempts: integer("attempts").notNull().default(0),
		maxAttempts: integer("max_attempts").notNull().default(5),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		lockedAt: timestamp("locked_at", { withTimezone: true }),
		lockedBy: text("locked_by"),
		lastErrorClass: text("last_error_class"),
		lastErrorMessage: text("last_error_message"),
		gatewayResponseJson: jsonb("gateway_response_json"),
		dedupeKey: text("dedupe_key").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgDedupeUnique: unique("egisz_outbox_org_dedupe_unique").on(
			t.organizationId,
			t.dedupeKey,
		),
		pollIdx: index("egisz_outbox_poll_idx").on(
			t.organizationId,
			t.status,
			t.nextAttemptAt,
		),
		patientIdx: index("egisz_outbox_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		visitIdx: index("egisz_outbox_visit_idx").on(t.organizationId, t.visitId),
	}),
);

export const egiszAuditLogs = pgTable(
	"egisz_audit_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sequenceNumber: bigint("sequence_number", { mode: "number" }).notNull(),
		previousHash: text("previous_hash").notNull(),
		currentHash: text("current_hash").notNull(),
		eventType: text("event_type").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		patientId: uuid("patient_id").references(() => patients.id),
		actorUserId: uuid("actor_user_id").references(() => users.id),
		actorIpAddress: text("actor_ip_address"),
		actorUserAgent: text("actor_user_agent"),
		payloadJson: jsonb("payload_json"),
		payloadSha256: text("payload_sha256").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgSeqUnique: unique("egisz_audit_logs_org_seq_unique").on(
			t.organizationId,
			t.sequenceNumber,
		),
		orgHashUnique: unique("egisz_audit_logs_org_hash_unique").on(
			t.organizationId,
			t.currentHash,
		),
		orgCreatedIdx: index("egisz_audit_logs_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		patientIdx: index("egisz_audit_logs_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
	}),
);

// ─────────────────────────────────────────────────────────────
// PHASE 26: DENTAL PHARMACOLOGY & 1094н PRESCRIPTIONS
// ─────────────────────────────────────────────────────────────

export const drugCatalog = pgTable(
	"drug_catalog",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		tradeNameRu: text("trade_name_ru").notNull(),
		innLatin: text("inn_latin").notNull(),
		innRu: text("inn_ru").notNull(),
		category: text("category").notNull(),
		dosageForm: text("dosage_form").notNull(),
		strengthConcentration: text("strength_concentration").notNull(),
		standardPackageUnits: integer("standard_package_units").notNull().default(20),
		latinSignatureTemplate: text("latin_signature_template").notNull(),
		defaultDispenseInstructionLatin: text("default_dispense_instruction_latin")
			.notNull()
			.default("D.t.d. N 20 in tab.\nS."),
		defaultSigRussian: text("default_sig_russian").notNull(),
		maxSingleDoseMg: numeric("max_single_dose_mg", { precision: 8, scale: 2 }),
		maxDailyDoseMg: numeric("max_daily_dose_mg", { precision: 8, scale: 2 }),
		contraindicatedAgeMinYears: integer("contraindicated_age_min_years").default(0),
		pregnancyCategoryRisk: text("pregnancy_category_risk").default("B"),
		requiresSpecialPrescriptionForm: boolean(
			"requires_special_prescription_form",
		)
			.notNull()
			.default(false),
		atcCode: varchar("atc_code", { length: 10 }),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgCategoryIdx: index("drug_catalog_org_cat_idx").on(
			t.organizationId,
			t.category,
		),
		innLatinIdx: index("drug_catalog_inn_latin_idx").on(
			t.organizationId,
			t.innLatin,
		),
	}),
);

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
		catalogDrugId: uuid("catalog_drug_id").references(() => drugCatalog.id, {
			onDelete: "set null",
		}),
		itemIndex: integer("item_index").notNull().default(1),
		innLatin: text("inn_latin").notNull(),
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
	}),
);
