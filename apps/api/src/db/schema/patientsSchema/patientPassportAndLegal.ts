import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "../auth.js";
import { patients } from "./patientCore.js";

export const patientConsents = pgTable(
	"patient_consents",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		kind: text("kind").notNull(),
		grantedAt: timestamp("granted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		documentId: uuid("document_id"),
	},
	(t) => ({
		organizationIdIdx: index("patient_consents_organization_id_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("patient_consents_patient_id_idx").on(t.patientId),
		documentIdIdx: index("patient_consents_document_id_idx").on(t.documentId),
	}),
);

// #55 — пациенты::вкладка_приемы_рабочий_стол_администратора
export const patientServiceLineages = pgTable(
	"patient_service_lineages",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		leadSource: text("lead_source").notNull(),
		rescheduleCount: integer("reschedule_count").default(0).notNull(),
		waitlistEntryId: uuid("waitlist_entry_id"),
		finalVisitId: uuid("final_visit_id"),
		lifecycleStage: text("lifecycle_stage").default("completed").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_service_lineages_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * Рекламации и осложнения по пациенту — основание для гарантии, возврата и
 * переделки.
 *
 * Экран карточки (PatientReclamationsWidget) умел фиксировать, урегулировать и
 * удалять инциденты, а сервера под ним не было: живая проверка сети видела на
 * карточке 404. Имена полей повторяют контракт, который экран уже отправляет —
 * менять их значило бы ломать работающий клиент. Физическая таблица:
 * drizzle/0143_patient_reclamations.sql.
 */
export const patientReclamations = pgTable(
	"patient_reclamations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").notNull(),
		// Без внешнего ключа намеренно: сотрудника могут уволить и удалить, а разбор
		// по его работе обязан остаться в карте.
		doctorId: uuid("doctor_id"),
		complicationDetails: text("complication_details").notNull(),
		proposedAction: text("proposed_action"),
		status: text("status").notNull().default("under_review"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_reclamations_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("patient_reclamations_patient_id_idx").on(t.patientId),
		doctorIdIdx: index("patient_reclamations_doctor_id_idx").on(t.doctorId),
	}),
);

// patient archive reasons catalog (323-FZ compliant directory)
export const patientArchiveReasons = pgTable(
	"patient_archive_reasons",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		code: text("code").notNull(),
		name: text("name").notNull(),
		description: text("description"),
		legalBasis: text("legal_basis").notNull(),
		isBookingBlocked: boolean("is_booking_blocked").notNull().default(true),
		requiresDocumentation: boolean("requires_documentation").notNull().default(false),
		isDefault: boolean("is_default").notNull().default(false),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"patient_archive_reasons_organizationId_idx",
		).on(t.organizationId),
		codeIdx: index(
			"patient_archive_reasons_code_idx",
		).on(t.organizationId, t.code),
	}),
);

// patient archive reasons and blacklists
export const patientArchiveReasonsAndBlacklists = pgTable(
	"patient_archive_reasons_and_blacklists",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id"),
		patientName: text("patient_name"),
		archiveReason: text("archive_reason"),
		reasonCode: text("reason_code"),
		legalBasis: text("legal_basis"),
		isBlacklisted: boolean("is_blacklisted").notNull().default(false),
		isBookingBlocked: boolean("is_booking_blocked").notNull().default(true),
		warningBadge: text("warning_badge").notNull().default("Черный список"),
		blacklistReason: text("blacklist_reason"),
		archivedBy: uuid("archived_by"),
		archivedAt: timestamp("archived_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"patient_archive_reasons_and_blacklists_organizationId_idx",
		).on(t.organizationId),
	}),
);
