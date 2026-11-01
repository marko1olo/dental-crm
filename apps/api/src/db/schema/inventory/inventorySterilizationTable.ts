import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";

/**
 * sterilizationLogs — Журнал автоклавирования и стерилизации инструментария.
 */
export const sterilizationLogs = pgTable(
	"sterilization_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		deviceName: text("device_name").notNull().default("Автоклав 1"),
		autoclaveId: text("autoclave_id"),
		cycleNumber: integer("cycle_number").notNull().default(1),
		temperatureCelsius: numeric("temperature_celsius", {
			precision: 5,
			scale: 1,
		}),
		pressureBar: numeric("pressure_bar", { precision: 4, scale: 2 }),
		itemsDescription: text("items_description"),
		operatorId: uuid("operator_id"),
		barcode: text("barcode"),
		status: text("status").notNull().default("passed"),
		passedIndicator: boolean("passed_indicator").notNull().default(true),
		timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
		packagingType: text("packaging_type"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		indicatorType: text("indicator_type"),
		cycleMode: text("cycle_mode"),
		temperatureSet: numeric("temperature_set", { precision: 5, scale: 1 }),
		pressureSet: numeric("pressure_set", { precision: 4, scale: 2 }),
		durationMin: integer("duration_min"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("sterilization_logs_organizationId_idx").on(
			t.organizationId,
		),
		operatorIdIdx: index("sterilization_logs_operator_id_idx").on(t.operatorId),
		orgCreatedIdx: index("sterilization_logs_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
	}),
);

/**
 * preSterilizationCleaningLogs — Журнал предстерилизационной очистки (азопирам, фенолфталеин).
 */
export const preSterilizationCleaningLogs = pgTable(
	"pre_sterilization_cleaning_logs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		testType: text("test_type").notNull().default("both"), // azopyram | phenolphthalein | both
		batchItemCount: integer("batch_item_count").notNull(),
		testedSampleCount: integer("tested_sample_count").notNull(),
		isAzopyramNegative: boolean("is_azopyram_negative").notNull().default(true),
		isPhenolphthaleinNegative: boolean("is_phenolphthalein_negative")
			.notNull()
			.default(true),
		isBatchApproved: boolean("is_batch_approved").notNull().default(true),
		detergentBrand: text("detergent_brand"),
		rejectionReason: text("rejection_reason"),
		operatorId: uuid("operator_id").references(() => users.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		timestamp: timestamp("timestamp", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("pre_sterilization_cleaning_logs_org_idx").on(
			t.organizationId,
		),
		timestampIdx: index("pre_sterilization_cleaning_logs_timestamp_idx").on(
			t.timestamp,
		),
	}),
);

/**
 * autoclaveDailyTests — Ежедневный контроль автоклавов (Боуи-Дик, вакуум-тест, спиральные тесты).
 */
export const autoclaveDailyTests = pgTable(
	"autoclave_daily_tests",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		autoclaveId: text("autoclave_id").notNull(),
		testType: text("test_type").notNull().default("bowie_dick"), // bowie_dick | helix_pcd | vacuum_leak
		cycleTemperatureCelsius: numeric("cycle_temperature_celsius", {
			precision: 5,
			scale: 2,
		}).notNull(),
		cyclePressureBar: numeric("cycle_pressure_bar", {
			precision: 4,
			scale: 2,
		}).notNull(),
		vacuumLeakRateMbarPerMin: numeric("vacuum_leak_rate_mbar_per_min", {
			precision: 5,
			scale: 2,
		}),
		colorChangeVerified: boolean("color_change_verified")
			.notNull()
			.default(true),
		testResult: text("test_result").notNull().default("passed"), // passed | failed
		operatorId: uuid("operator_id").references(() => users.id, {
			onDelete: "set null",
		}),
		notes: text("notes"),
		timestamp: timestamp("timestamp", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgIdx: index("autoclave_daily_tests_org_idx").on(t.organizationId),
		autoclaveIdx: index("autoclave_daily_tests_autoclave_idx").on(
			t.organizationId,
			t.autoclaveId,
		),
	}),
);
