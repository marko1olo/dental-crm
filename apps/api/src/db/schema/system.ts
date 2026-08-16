import type {
	MigrationEntityBreakdown,
	MigrationFieldLineage,
	MigrationMappingSnapshot,
	MigrationReconciliationCheck,
} from "@dental/shared";
import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	real,
	text,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import {
	migrationEntityKind,
	migrationQuarantineReason,
	migrationQuarantineResolution,
	migrationRunStatus,
	migrationSourceKind,
	migrationStagingStatus,
} from "./_common.js";
import { organizations, users } from "./auth.js";
import { services } from "./clinical.js";

export const importBatches = pgTable(
	"import_batches",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sourceName: text("source_name").notNull(),
		status: text("status").notNull(),
		totalRows: integer("total_rows").notNull().default(0),
		importedRows: integer("imported_rows").notNull().default(0),
		skippedRows: integer("skipped_rows").notNull().default(0),
		warningRows: integer("warning_rows").notNull().default(0),
		blockedRows: integer("blocked_rows").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("import_batches_organization_id_idx").on(
			t.organizationId,
		),
	}),
);

export const auditEvents = pgTable(
	"audit_events",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		actorUserId: uuid("actor_user_id").references(() => users.id),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		action: text("action").notNull(),
		reason: text("reason"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxAuditOrgCreated: index("idx_audit_org_created").on(
				table.organizationId,
				table.createdAt,
			),
			actorUserIdIdx: index("audit_events_actorUserId_idx").on(
				table.actorUserId,
			),
		};
	},
);

// #55 — интеграции::продокторов_синхронизация_отзывов
export const prodoctorovSyncExports = pgTable(
	"prodoctorov_sync_exports",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		priceListSyncStatus: text("price_list_sync_status")
			.default("synced")
			.notNull(),
		availableSlotsCount: integer("available_slots_count")
			.default(120)
			.notNull(),
		medflexClubBadge: boolean("medflex_club_badge").default(true).notNull(),
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("prodoctorov_sync_exports_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// #58 — пациенты::геокодинг_адресов_через_dadata
export const dadataGeocodedAddresses = pgTable(
	"dadata_geocoded_addresses",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		patientName: text("patient_name").notNull(),
		rawAddress: text("raw_address").notNull(),
		fiasId: text("fias_id").notNull(),
		qcGeo: integer("qc_geo").default(0).notNull(),
		geoLat: text("geo_lat").notNull(),
		geoLon: text("geo_lon").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("dadata_geocoded_addresses_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// system RAM watchdogs (server health monitoring)
export const systemRamWatchdogs = pgTable(
	"system_ram_watchdogs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		heapUsedMb: numeric("heap_used_mb", { precision: 8, scale: 2 }),
		heapTotalMb: numeric("heap_total_mb", { precision: 8, scale: 2 }),
		rssMb: numeric("rss_mb", { precision: 8, scale: 2 }),
		externalMb: numeric("external_mb", { precision: 8, scale: 2 }),
		gcCount: integer("gc_count"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("system_ram_watchdogs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

/**
 * Суточные срезы BI-аналитики.
 *
 * Та же история, что и с outgoing_notifications: таблица есть в 0000, объявления
 * не было, поэтому не загружались services/biAnalyticsWorker.ts и
 * scripts/cronAnalyticsWorker.ts.
 */
export const biAnalyticsSnapshots = pgTable("bi_analytics_snapshots", {
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
	organizationId: uuid("organization_id").notNull(),
	snapshotDate: timestamp("snapshot_date", { withTimezone: true }).notNull(),
	cohortLtvJson: jsonb("cohort_ltv_json").notNull().default({}),
	planFunnelJson: jsonb("plan_funnel_json").notNull().default({}),
	chairUtilizationJson: jsonb("chair_utilization_json").notNull().default({}),
	doctorProfitabilityJson: jsonb("doctor_profitability_json")
		.notNull()
		.default({}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const migrationRuns = pgTable(
	"migration_runs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sourceName: text("source_name").notNull(),
		sourceKind: migrationSourceKind("source_kind").notNull(),
		/** sha256 исходных байт — узнаёт повторно загружаемый файл, но не запрещает его. */
		sourceFingerprint: text("source_fingerprint"),
		sourceBytes: integer("source_bytes"),
		detectedEncoding: text("detected_encoding"),
		encodingConfidence: real("encoding_confidence"),
		vendorProfile: text("vendor_profile"),
		status: migrationRunStatus("status").notNull().default("draft"),
		dryRun: boolean("dry_run").notNull().default(true),
		/** Инвариант сверки: sourceRows = loaded + updated + duplicate + quarantined + skipped. */
		sourceRows: integer("source_rows").notNull().default(0),
		stagedRows: integer("staged_rows").notNull().default(0),
		loadedRows: integer("loaded_rows").notNull().default(0),
		updatedRows: integer("updated_rows").notNull().default(0),
		duplicateRows: integer("duplicate_rows").notNull().default(0),
		quarantinedRows: integer("quarantined_rows").notNull().default(0),
		skippedRows: integer("skipped_rows").notNull().default(0),
		mappingJson: jsonb("mapping_json").$type<MigrationMappingSnapshot | null>(),
		llmCalls: integer("llm_calls").notNull().default(0),
		/** Прямая мера галлюцинаций: сколько ответов модели отвергла проверка. */
		llmRejectedSuggestions: integer("llm_rejected_suggestions")
			.notNull()
			.default(0),
		startedByUserId: uuid("started_by_user_id").references(() => users.id),
		startedAt: timestamp("started_at", { withTimezone: true }),
		finishedAt: timestamp("finished_at", { withTimezone: true }),
		errorClass: text("error_class"),
		errorMessage: text("error_message"),
		// ---- Асинхронное выполнение (миграция 0129) ----
		/** Человекочитаемая фаза: «Укладка строк», «Загрузка платежей». */
		phase: text("phase"),
		/** Процесс-владелец: хост и pid. Пусто — прогон никем не занят. */
		workerId: text("worker_id"),
		/** Отметка живучести владельца. Устаревшая означает, что процесс умер. */
		heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
		queuedAt: timestamp("queued_at", { withTimezone: true }),
		/** Путь к временному файлу источника: фазы не требуют повторной заливки. */
		uploadPath: text("upload_path"),
		uploadFileName: text("upload_file_name"),
		/** Прогресс считается по стейджингу — верен и после перезапуска процесса. */
		progressTotal: integer("progress_total").notNull().default(0),
		progressDone: integer("progress_done").notNull().default(0),
		/** Сколько раз прогон подбирался после падения владельца. */
		resumeCount: integer("resume_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxMigrationRunsOrgCreated: index("migration_runs_org_created_idx").on(
				table.organizationId,
				table.createdAt,
			),
			startedByUserIdIdx: index("migration_runs_startedByUserId_idx").on(
				table.startedByUserId,
			),
		};
	},
);

export const migrationStagingRecords = pgTable(
	"migration_staging_records",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		runId: uuid("run_id")
			.notNull()
			.references(() => migrationRuns.id, { onDelete: "cascade" }),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		entityKind: migrationEntityKind("entity_kind").notNull().default("unknown"),
		sourceTable: text("source_table").notNull().default(""),
		sourceRowNumber: integer("source_row_number").notNull(),
		/** Исходная строка дословно. Единственное доказательство того, что было в старой системе. */
		rawJson: jsonb("raw_json").$type<Record<string, string>>().notNull(),
		rawHash: text("raw_hash").notNull(),
		naturalKey: text("natural_key"),
		normalizedJson: jsonb("normalized_json").$type<Record<
			string,
			unknown
		> | null>(),
		lineageJson: jsonb("lineage_json").$type<MigrationFieldLineage[] | null>(),
		status: migrationStagingStatus("status").notNull().default("pending"),
		targetEntityId: uuid("target_entity_id"),
		confidence: real("confidence").notNull().default(1),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			stagingRowUnique: unique("migration_staging_row_unique").on(
				table.runId,
				table.sourceTable,
				table.sourceRowNumber,
			),
			idxStagingRunStatus: index("migration_staging_run_status_idx").on(
				table.runId,
				table.status,
			),
			idxStagingHash: index("migration_staging_hash_idx").on(
				table.runId,
				table.rawHash,
			),
			organizationIdIdx: index(
				"migration_staging_records_organizationId_idx",
			).on(table.organizationId),
		};
	},
);

export const migrationQuarantineRecords = pgTable(
	"migration_quarantine_records",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		runId: uuid("run_id")
			.notNull()
			.references(() => migrationRuns.id, { onDelete: "cascade" }),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		stagingRecordId: uuid("staging_record_id").references(
			() => migrationStagingRecords.id,
			{ onDelete: "cascade" },
		),
		entityKind: migrationEntityKind("entity_kind").notNull().default("unknown"),
		reason: migrationQuarantineReason("reason").notNull(),
		/** false — строку можно загрузить, но оператор должен знать. Не блокирует перенос. */
		blocking: boolean("blocking").notNull().default(true),
		fieldPath: text("field_path"),
		/** Текст для человека. Без сырых персональных данных — они остаются в стейджинге. */
		message: text("message").notNull(),
		suggestedFix: text("suggested_fix"),
		resolution: migrationQuarantineResolution("resolution")
			.notNull()
			.default("open"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
		retryCount: integer("retry_count").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxQuarantineRun: index("migration_quarantine_run_idx").on(
				table.runId,
				table.resolution,
				table.reason,
			),
			organizationIdIdx: index(
				"migration_quarantine_records_organizationId_idx",
			).on(table.organizationId),
			stagingRecordIdIdx: index(
				"migration_quarantine_records_stagingRecordId_idx",
			).on(table.stagingRecordId),
			resolvedByUserIdIdx: index(
				"migration_quarantine_records_resolvedByUserId_idx",
			).on(table.resolvedByUserId),
		};
	},
);

export const migrationEntityLinks = pgTable(
	"migration_entity_links",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		entityKind: migrationEntityKind("entity_kind").notNull(),
		sourceSystem: text("source_system").notNull(),
		sourceEntityId: text("source_entity_id").notNull(),
		naturalKey: text("natural_key"),
		/**
		 * Внешнего ключа нет намеренно: ссылка указывает в разные таблицы в
		 * зависимости от entityKind, а откат должен пережить удаление цели.
		 */
		targetEntityId: uuid("target_entity_id").notNull(),
		createdByRunId: uuid("created_by_run_id").references(
			() => migrationRuns.id,
			{ onDelete: "set null" },
		),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			entityLinkSourceUnique: unique("migration_entity_links_source_unique").on(
				table.organizationId,
				table.entityKind,
				table.sourceSystem,
				table.sourceEntityId,
			),
			idxEntityLinksTarget: index("migration_entity_links_target_idx").on(
				table.targetEntityId,
			),
			idxEntityLinksRun: index("migration_entity_links_run_idx").on(
				table.createdByRunId,
			),
		};
	},
);

export const migrationReconciliations = pgTable(
	"migration_reconciliations",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		runId: uuid("run_id")
			.notNull()
			.references(() => migrationRuns.id, { onDelete: "cascade" }),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		generatedAt: timestamp("generated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		balanced: boolean("balanced").notNull(),
		checksJson: jsonb("checks_json")
			.$type<MigrationReconciliationCheck[]>()
			.notNull(),
		entityBreakdownJson: jsonb("entity_breakdown_json")
			.$type<MigrationEntityBreakdown[]>()
			.notNull(),
		/*
		 * Сверка переноса из старой программы: копейки здесь важнее всего.
		 *
		 * Сверка существует ровно затем, чтобы поймать расхождение. При integer
		 * разница меньше рубля исчезала на каждой строке, и вывод «сошлось» мог
		 * скрывать потерянные копейки — хуже, чем честное расхождение.
		 */
		sourceMoneyTotalRub: numeric("source_money_total_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		loadedMoneyTotalRub: numeric("loaded_money_total_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		quarantinedMoneyTotalRub: numeric("quarantined_money_total_rub", {
			precision: 12,
			scale: 2,
			mode: "number",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			idxReconciliationRun: index("migration_reconciliations_run_idx").on(
				table.runId,
				table.generatedAt,
			),
			organizationIdIdx: index(
				"migration_reconciliations_organizationId_idx",
			).on(table.organizationId),
		};
	},
);

export const systemBackgroundJobs = pgTable(
	"system_background_jobs",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.references(() => organizations.id, { onDelete: "cascade" }),
		queueName: varchar("queue_name", { length: 64 }).notNull(),
		taskName: varchar("task_name", { length: 128 }).notNull(),
		payload: jsonb("payload")
			.$type<Record<string, unknown>>()
			.notNull()
			.default(sql`'{}'::jsonb`),
		status: varchar("status", { length: 32 }).notNull().default("pending"),
		retryCount: integer("retry_count").notNull().default(0),
		maxRetries: integer("max_retries").notNull().default(3),
		scheduledFor: timestamp("scheduled_for", { withTimezone: true })
			.notNull()
			.defaultNow(),
		startedAt: timestamp("started_at", { withTimezone: true }),
		finishedAt: timestamp("finished_at", { withTimezone: true }),
		lastError: text("last_error"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		idxBackgroundJobsQueueStatus: index("idx_background_jobs_queue_status").on(
			t.queueName,
			t.status,
			t.scheduledFor,
		),
		idxBackgroundJobsOrgId: index("idx_background_jobs_org_id").on(
			t.organizationId,
		),
	}),
);

export type SystemBackgroundJob = typeof systemBackgroundJobs.$inferSelect;
export type NewSystemBackgroundJob = typeof systemBackgroundJobs.$inferInsert;

