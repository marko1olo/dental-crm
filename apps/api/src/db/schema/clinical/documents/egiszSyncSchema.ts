import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { egiszStatus } from "../../_common.js";
import { organizations, users } from "../../auth.js";
import { patients } from "../../patients.js";
import { visits } from "../visitsSchema.js";
import { generatedDocuments } from "./generatedDocumentsTable.js";

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
		doctorIdIdx: index("egisz_blank_permissions_doctor_id_idx").on(t.doctorId),
		orgDoctorIdx: index("egisz_blank_permissions_org_doctor_idx").on(
			t.organizationId,
			t.doctorId,
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
		orgCreatedIdx: index("egisz_logs_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		orgStatusIdx: index("egisz_logs_org_status_idx").on(
			t.organizationId,
			t.status,
		),
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
		doctorIdIdx: index("egisz_outbox_doctor_id_idx").on(t.doctorId),
		documentIdIdx: index("egisz_outbox_document_id_idx").on(t.documentId),
		orgCreatedIdx: index("egisz_outbox_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
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

export type EgiszBlankPermission = typeof egiszBlankPermissions.$inferSelect;
export type NewEgiszBlankPermission = typeof egiszBlankPermissions.$inferInsert;
export type EgiszLog = typeof egiszLogs.$inferSelect;
export type NewEgiszLog = typeof egiszLogs.$inferInsert;
export type EgiszOutboxItem = typeof egiszOutbox.$inferSelect;
export type NewEgiszOutboxItem = typeof egiszOutbox.$inferInsert;
export type EgiszAuditLog = typeof egiszAuditLogs.$inferSelect;
export type NewEgiszAuditLog = typeof egiszAuditLogs.$inferInsert;
