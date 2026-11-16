import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "../auth.js";
import { patients } from "../patients.js";

// #40 — прием::зубная_формула_пломба_кариес_и_детская_формула
export const extendedOdontogramStates = pgTable(
	"extended_odontogram_states",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id, { onDelete: "cascade" }),
		patientName: text("patient_name"),
		toothNumber: integer("tooth_number").notNull(),
		isPrimaryPediatric: boolean("is_primary_pediatric")
			.default(false)
			.notNull(),
		secondaryCariesUnderFilling: boolean("secondary_caries_under_filling")
			.default(false)
			.notNull(),
		mobilityDegree: integer("mobility_degree").default(0).notNull(),
		pediatricCrownPresent: boolean("pediatric_crown_present")
			.default(false)
			.notNull(),
		notes: text("notes").default("").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index(
			"extended_odontogram_states_organizationId_idx",
		).on(t.organizationId),
		patientIdIdx: index(
			"extended_odontogram_states_patientId_idx",
		).on(t.patientId),
		orgPatientIdx: index(
			"extended_odontogram_states_org_patient_idx",
		).on(t.organizationId, t.patientId),
		orgPatientToothIdx: index(
			"extended_odontogram_states_org_patient_tooth_idx",
		).on(t.organizationId, t.patientId, t.toothNumber),
	}),
);

// tooth states (per-tooth status for odontogram)
export const toothStates = pgTable(
	"tooth_states",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		toothNumber: integer("tooth_number").notNull(),
		state: text("state").notNull().default("healthy"),
		surfaces: jsonb("surfaces"),
		notes: text("notes"),
		canalMeasurements: jsonb("canal_measurements"),
		// Учёт офлайн-синхронизации, см. комментарий у visit_diaries.
		isSynced: boolean("is_synced").notNull().default(false),
		version: integer("version").notNull().default(1),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("tooth_states_organizationId_idx").on(
			t.organizationId,
		),
		patientIdIdx: index("tooth_states_patientId_idx").on(t.patientId),
		orgPatientIdx: index("tooth_states_org_patient_idx").on(
			t.organizationId,
			t.patientId,
		),
		orgPatientToothIdx: index("tooth_states_org_patient_tooth_idx").on(
			t.organizationId,
			t.patientId,
			t.toothNumber,
		),
		orgPatientToothUniqueIdx: uniqueIndex(
			"tooth_states_org_patient_tooth_unique_idx",
		).on(t.organizationId, t.patientId, t.toothNumber),
	}),
);

/**
 * История изменений состояния зуба (только добавление, без перезаписи).
 *
 * ЗАЧЕМ: таблица tooth_states хранит РОВНО ОДНУ строку на зуб, а обновление
 * выполняется как delete + insert. Из-за этого история терялась полностью:
 * зуб 36 проходил путь «кариес → пломба (январь) → пульпит → коронка (август)»,
 * а во вкладке «История зуба» врач видел одну строку «Статус изменен на: Crown»
 * с автором «System». Январская пломба исчезала из карты, и ни одно изменение
 * нельзя было связать с конкретным врачом — при разборе жалобы это критично.
 *
 * Записи сюда добавляются в той же транзакции, что и смена состояния.
 */
export const toothStateHistory = pgTable(
	"tooth_state_history",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientId: uuid("patient_id")
			.notNull()
			.references(() => patients.id),
		toothNumber: integer("tooth_number").notNull(),
		/** Состояние до изменения; null — если зуб фиксируется впервые. */
		previousState: text("previous_state"),
		newState: text("new_state").notNull(),
		previousSurfaces: jsonb("previous_surfaces"),
		newSurfaces: jsonb("new_surfaces"),
		canalMeasurements: jsonb("canal_measurements"),
		/** Кто внёс изменение. Раньше в истории всегда значился «System». */
		changedByUserId: uuid("changed_by_user_id"),
		/** В рамках какого приёма изменено, если он известен. */
		visitId: uuid("visit_id"),
		reason: text("reason"),
		changedAt: timestamp("changed_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		patientToothIdx: index("idx_tooth_state_history_patient_tooth").on(
			table.patientId,
			table.toothNumber,
			table.changedAt,
		),
		organizationIdIdx: index("tooth_state_history_organizationId_idx").on(
			table.organizationId,
		),
		orgPatientIdx: index("tooth_state_history_org_patient_idx").on(
			table.organizationId,
			table.patientId,
		),
		visitIdIdx: index("tooth_state_history_visit_id_idx").on(table.visitId),
		changedByIdx: index("tooth_state_history_changed_by_idx").on(
			table.changedByUserId,
		),
	}),
);

