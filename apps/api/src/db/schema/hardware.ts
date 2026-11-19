import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "./auth.js";

/**
 * clinic_hardware_devices
 * PostgreSQL 18 SSOT table for configured clinic hardware, visiographs, printers, scanners, and hot folders.
 * Eliminates Potemkin localStorage-only persistence.
 */
export const clinicHardwareDevices = pgTable(
	"clinic_hardware_devices",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		presetId: varchar("preset_id", { length: 64 }).notNull(),
		name: varchar("name", { length: 255 }).notNull(),
		vendor: varchar("vendor", { length: 128 }).notNull(),
		category: varchar("category", { length: 64 }).notNull(),
		executablePath: text("executable_path").notNull().default(""),
		hotFolderPath: text("hot_folder_path").notNull().default(""),
		protocol: varchar("protocol", { length: 64 }).notNull().default("hot_folder"),
		protocolTemplate: text("protocol_template").notNull().default(""),
		supportedExtensions: jsonb("supported_extensions").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
		isActive: boolean("is_active").notNull().default(true),
		autoAttachToVisit: boolean("auto_attach_to_visit").notNull().default(true),
		status: varchar("status", { length: 32 }).notNull().default("untested"),
		statusMessage: text("status_message").notNull().default("Нажмите для проверки связи"),
		lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
		latencyMs: integer("latency_ms"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("clinic_hardware_devices_organization_id_idx").on(
			t.organizationId,
		),
	}),
);
