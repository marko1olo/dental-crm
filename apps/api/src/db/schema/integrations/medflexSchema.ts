import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { chairs } from "../schedule/chairsTable.js";

/**
 * medflex_integrations — Настройки интеграции клиники с агрегаторами МедФлекс и ПроДокторов.
 * Соответствует Фиче 17 из BACKLOG.md.
 */
export const medflexIntegrations = pgTable(
	"medflex_integrations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		clinicExternalId: text("clinic_external_id").notNull(),
		apiKey: text("api_key").notNull().default(""),
		webhookSecret: text("webhook_secret").notNull().default(""),
		isActive: boolean("is_active").notNull().default(true),
		autoConfirmBookings: boolean("auto_confirm_bookings").notNull().default(true),
		defaultChairId: uuid("default_chair_id").references(() => chairs.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("medflex_integrations_organization_id_idx").on(
			t.organizationId,
		),
		clinicExternalIdIdx: index("medflex_integrations_clinic_external_id_idx").on(
			t.clinicExternalId,
		),
	}),
);

export type MedflexIntegration = typeof medflexIntegrations.$inferSelect;
export type NewMedflexIntegration = typeof medflexIntegrations.$inferInsert;

/**
 * medflex_doctor_mappings — Сопоставление сотрудника (врача) клиники с его внешним идентификатором на портале ПроДокторов/МедФлекс.
 */
export const medflexDoctorMappings = pgTable(
	"medflex_doctor_mappings",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		staffId: uuid("staff_id")
			.notNull()
			.references(() => users.id),
		externalDoctorId: text("external_doctor_id").notNull(),
		isSyncEnabled: boolean("is_sync_enabled").notNull().default(true),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("medflex_doctor_mappings_organization_id_idx").on(
			t.organizationId,
		),
		staffIdIdx: index("medflex_doctor_mappings_staff_id_idx").on(t.staffId),
		externalDoctorIdIdx: index("medflex_doctor_mappings_external_doctor_id_idx").on(
			t.externalDoctorId,
		),
	}),
);

export type MedflexDoctorMapping = typeof medflexDoctorMappings.$inferSelect;
export type NewMedflexDoctorMapping = typeof medflexDoctorMappings.$inferInsert;

/**
 * medflex_webhook_logs — Аудит-журнал и реестр дедупликации входящих вебхуков от МедФлекс / ПроДокторов.
 * Обеспечивает строгую идемпотентность по delivery_id.
 */
export const medflexWebhookLogs = pgTable(
	"medflex_webhook_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		eventType: text("event_type").notNull(),
		deliveryId: text("delivery_id").notNull(),
		payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
		status: text("status").notNull().default("processed"),
		errorMessage: text("error_message"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("medflex_webhook_logs_organization_id_idx").on(
			t.organizationId,
		),
		deliveryIdIdx: index("medflex_webhook_logs_delivery_id_idx").on(t.deliveryId),
	}),
);

export type MedflexWebhookLog = typeof medflexWebhookLogs.$inferSelect;
export type NewMedflexWebhookLog = typeof medflexWebhookLogs.$inferInsert;
