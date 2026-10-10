import type {
	PatientAdministrativeProfile,
} from "@dental/shared";
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
	uuid,
} from "drizzle-orm/pg-core";
import { patientStatus } from "../_common.js";
import { organizations } from "../auth.js";
import { getPatientTableIndexes } from "./patientIndexes.js";

export const patients = pgTable(
	"patients",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		status: patientStatus("status").notNull().default("active"),
		fullName: text("full_name").notNull(),
		birthDate: text("birth_date"),
		phone: text("phone"),
		email: text("email"),
		notes: text("notes"),
		weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
		administrativeProfile: jsonb(
			"administrative_profile",
		).$type<PatientAdministrativeProfile | null>(),
		familyGroupId: uuid("family_group_id"),
		/**
		 * Куда объединена карточка (миграция 0128). Заполнено — значит это дубль, все
		 * записи, оплаты и снимки перенесены в указанную карточку.
		 *
		 * Карточка при слиянии НЕ УДАЛЯЕТСЯ: это медицинские данные, и удаление
		 * лишает клинику доказательств. Открыв её по старой ссылке, администратор
		 * должен увидеть, куда она объединена, а не пустоту.
		 */
		mergedIntoPatientId: uuid("merged_into_patient_id"),
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => getPatientTableIndexes(table),
);

// #46 — рабочее_место::история_последних_просмотренных_карточек
export const recentPatientHistory = pgTable(
	"recent_patient_history",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		userId: uuid("user_id").notNull(),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		patientName: text("patient_name").notNull(),
		phone: text("phone"),
		lastViewedAt: timestamp("last_viewed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("recent_patient_history_organization_id_idx").on(
			t.organizationId,
		),
		userIdIdx: index("recent_patient_history_user_id_idx").on(t.userId),
		patientIdIdx: index("recent_patient_history_patient_id_idx").on(
			t.patientId,
		),
	}),
);

// patient duplicate merge queues (deduplication workflow)
export const patientDuplicateMergeQueues = pgTable(
	"patient_duplicate_merge_queues",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sourcePatientId: uuid("source_patient_id").notNull(),
		targetPatientId: uuid("target_patient_id").notNull(),
		matchScore: numeric("match_score", { precision: 5, scale: 4 }),
		status: text("status").notNull().default("pending"),
		resolvedBy: uuid("resolved_by"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"patient_duplicate_merge_queues_organizationId_idx",
		).on(t.organizationId),
	}),
);

/**
 * Задачи (поручения) по пациенту: перезвонить, дослать документы, проверить
 * самочувствие.
 *
 * Экран карточки (PatientTaskTicketsWidget) умел создавать поручение, отмечать
 * его выполненным, возвращать в работу и удалять — а сервера под ним не было:
 * живая проверка сети видела на карточке 404 на GET .../tickets. Имена полей
 * повторяют контракт, который экран уже отправляет. Физическая таблица:
 * drizzle/0144_patient_task_tickets.sql.
 */
export const patientTaskTickets = pgTable(
	"patient_task_tickets",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id").notNull(),
		// Без внешнего ключа намеренно: сотрудника могут уволить и удалить, а
		// поручение обязано остаться в карте. Экран показывает «Неизвестный сотрудник».
		assignedToId: uuid("assigned_to_id"),
		title: text("title").notNull(),
		description: text("description"),
		status: text("status").notNull().default("pending"),
		priority: text("priority").notNull().default("normal"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("patient_task_tickets_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("patient_task_tickets_patient_id_idx").on(t.patientId),
		assignedToIdIdx: index("patient_task_tickets_assigned_to_id_idx").on(
			t.assignedToId,
		),
	}),
);
