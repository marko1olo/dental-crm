import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	integer,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { serviceCatalogItems } from "./clinical.js";
import { patients } from "./patients.js";

// inventory items (clinic supplies and materials)
export const inventoryItems = pgTable(
	"inventory_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(),
		category: text("category").notNull().default("material"),
		unit: text("unit").notNull().default("шт"),
		currentQty: numeric("current_qty", { precision: 10, scale: 3 })
			.notNull()
			.default("0"),
		// alias — some routes call it stockQuantity
		stockQuantity: numeric("stock_quantity", {
			precision: 10,
			scale: 3,
		}).default("0"),
		minQty: numeric("min_qty", { precision: 10, scale: 3 })
			.notNull()
			.default("0"),
		// alias used in inventory routes
		criticalThreshold: numeric("critical_threshold", {
			precision: 10,
			scale: 3,
		}).default("0"),
		pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }),
		// alias — some routes call it unitCostRub
		unitCostRub: numeric("unit_cost_rub", { precision: 12, scale: 2 }).default(
			"0",
		),
		notes: text("notes"),
		sku: text("sku"),
		barcode: text("barcode"),
		/*
		 * Партия и срок годности расходника.
		 *
		 * Экран склада показывал колонку «Партия / Срок» и читал эти поля, которых в
		 * таблице не было вовсе: колонка всегда писала «Не указан», а ввести данные
		 * было негде. Просроченный композит или анестетик — это вред пациенту, а не
		 * неаккуратный учёт.
		 *
		 * date, а не timestamp: у расходников срок указан днём или месяцем, часовой
		 * пояс здесь только мешал бы. mode "string" — дата приходит и уходит как
		 * «2027-03-31», в том же виде, в каком её вводят в поле типа date.
		 */
		lotNumber: text("lot_number"),
		expirationDate: date("expiration_date", { mode: "string" }),
		updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => {
		return {
			organizationIdIdx: index("inventory_items_organizationId_idx").on(
				table.organizationId,
			),
		};
	},
);

// warehouses (клинические склады с привязкой к МДЛП Честный Знак)
export const warehouses = pgTable(
	"warehouses",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		name: text("name").notNull(), // "Основной склад", "Кабинет №1 (Терапия)"
		code: text("code"), // "1", "MAIN", "CAB-01"
		mdlpId: text("mdlp_id"), // Идентификатор места деятельности МДЛП (14 цифр)
		status: text("status").notNull().default("active"), // active | archived
		address: text("address"),
		isDefault: boolean("is_default").notNull().default(false),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("warehouses_organization_idx").on(
			t.organizationId,
		),
	}),
);

// stock batches (партионный учет FEFO - First Expired, First Out)
export const stockBatches = pgTable(
	"stock_batches",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
			onDelete: "set null",
		}),
		inventoryItemId: uuid("inventory_item_id")
			.notNull()
			.references(() => inventoryItems.id, { onDelete: "cascade" }),
		batchNumber: text("batch_number").notNull(), // Номер серии / партии / lot
		expirationDate: date("expiration_date", { mode: "string" }).notNull(), // Срок годности YYYY-MM-DD
		manufactureDate: date("manufacture_date", { mode: "string" }),
		initialQty: numeric("initial_qty", { precision: 10, scale: 3 })
			.notNull()
			.default("0"),
		remainingQty: numeric("remaining_qty", { precision: 10, scale: 3 })
			.notNull()
			.default("0"),
		purchasePricePerUnit: numeric("purchase_price_per_unit", {
			precision: 12,
			scale: 2,
		}).default("0"),
		status: text("status").notNull().default("active"), // active | depleted | expired | quarantine
		barcode: text("barcode"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgItemExpIdx: index("stock_batches_org_item_exp_idx").on(
			t.organizationId,
			t.inventoryItemId,
			t.expirationDate,
		),
		warehouseIdx: index("stock_batches_warehouse_idx").on(t.warehouseId),
	}),
);

// inventory transactions (stock movements)
export const inventoryTransactions = pgTable(
	"inventory_transactions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		itemId: uuid("item_id"),
		// alias — some routes call it inventoryItemId
		inventoryItemId: uuid("inventory_item_id"),
		batchId: uuid("batch_id").references(() => stockBatches.id, {
			onDelete: "set null",
		}),
		warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
			onDelete: "set null",
		}),
		visitId: uuid("visit_id"),
		transactionType: text("transaction_type").notNull().default("receipt"),
		qty: numeric("qty", { precision: 10, scale: 3 }),
		// alias — some routes call it quantityChanged
		quantityChanged: numeric("quantity_changed", { precision: 10, scale: 3 }),
		unitCostRub: numeric("unit_cost_rub", { precision: 12, scale: 2 }),
		isOverdraft: boolean("is_overdraft").default(false),
		userId: uuid("user_id"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("inventory_transactions_organizationId_idx").on(
			t.organizationId,
		),
		batchIdIdx: index("inventory_transactions_batch_idx").on(t.batchId),
	}),
);

// procedure material rules (material requirements per procedure)
export const procedureMaterialRules = pgTable(
	"procedure_material_rules",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id").references(() => organizations.id),
		serviceCode: text("service_code"),
		// FK to serviceCatalogItems (optional — some rules are code-only)
		serviceId: uuid("service_id"),
		materialItemId: uuid("material_item_id"),
		// alias used by diary.ts
		inventoryItemId: uuid("inventory_item_id"),
		materialName: text("material_name"),
		requiredQty: numeric("required_qty", { precision: 12, scale: 4 })
			.notNull()
			.default("1.0000"),
		// alias used by diary.ts for deduction logic
		quantityToDeduct: numeric("quantity_to_deduct", { precision: 12, scale: 4 })
			.notNull()
			.default("1.0000"),
		isMdlpRequired: boolean("is_mdlp_required").default(false), // Маркированный препарат (Честный Знак)
		unit: text("unit").default("шт"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("procedure_material_rules_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// procedure tech cards (технологические карты процедур - спецификация расхода материалов BOM)
export const procedureTechCards = pgTable(
	"procedure_tech_cards",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		serviceId: uuid("service_id").references(() => serviceCatalogItems.id, {
			onDelete: "cascade",
		}),
		serviceCode: text("service_code"), // Код по Номенклатуре Минздрава РФ (напр. A16.07.002.001)
		title: text("title").notNull(), // "Техкарта: Лечение кариеса дентина световой композит"
		version: integer("version").notNull().default(1),
		status: text("status").notNull().default("active"), // active | draft | archived
		description: text("description"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgServiceIdx: index("procedure_tech_cards_org_service_idx").on(
			t.organizationId,
			t.serviceId,
		),
	}),
);

export const procedureTechCardItems = pgTable(
	"procedure_tech_card_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		techCardId: uuid("tech_card_id")
			.notNull()
			.references(() => procedureTechCards.id, { onDelete: "cascade" }),
		inventoryItemId: uuid("inventory_item_id")
			.notNull()
			.references(() => inventoryItems.id, { onDelete: "cascade" }),
		quantity: numeric("quantity", { precision: 12, scale: 4 })
			.notNull()
			.default("1.0000"),
		unit: text("unit").notNull().default("шт"),
		isMdlpRequired: boolean("is_mdlp_required").notNull().default(false), // Маркированный препарат (Честный Знак)
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		techCardIdx: index("procedure_tech_card_items_card_idx").on(t.techCardId),
	}),
);

// sterilization logs (autoclave / sterilization records)
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
		/**
		 * СанПиН 3.3686-21 — тип упаковки и срок годности стерильности.
		 * Бумажные крафт-пакеты (ТУ, термосварка: 50 суток; самоклей: 20–30 суток),
		 * ламинированные пакеты (термосварка: 180–360 суток),
		 * металлические кассеты/контейнеры с фильтром (21–30 суток).
		 * NULL допустим для записей, созданных до этой миграции.
		 */
		packagingType: text("packaging_type"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		/** Класс химического индикатора (4/5/6) или биологический контроль. */
		indicatorType: text("indicator_type"),
		/**
		 * Режим цикла автоклава: B, S, N (ИСО 13060), или dry_heat_180/160,
		 * plasma_vh2o2, ethylene_oxide для холодной/плазменной стерилизации.
		 */
		cycleMode: text("cycle_mode"),
		/** Заданная (номинальная) температура цикла °C. */
		temperatureSet: numeric("temperature_set", { precision: 5, scale: 1 }),
		/** Заданное давление цикла бар. */
		pressureSet: numeric("pressure_set", { precision: 4, scale: 2 }),
		/** Продолжительность цикла в минутах. */
		durationMin: integer("duration_min"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		organizationIdIdx: index("sterilization_logs_organizationId_idx").on(
			t.organizationId,
		),
	}),
);

// ─── SanPiN 3.3686-21 Central Sterilization (ЦСО) & Quality Logs ───────────

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

// inventory transfers (TORG-13)
export const inventoryTransfers = pgTable("inventory_transfers", {
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
	senderOrganizationId: uuid("sender_organization_id").notNull().references(() => organizations.id),
	receiverOrganizationId: uuid("receiver_organization_id").notNull().references(() => organizations.id),
	status: text("status").notNull().default("draft"), // draft, in_transit, partially_received, completed, cancelled
	notes: text("notes"),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryTransferItems = pgTable("inventory_transfer_items", {
	id: uuid("id").primaryKey().default(sql`uuidv7()`),
	transferId: uuid("transfer_id").notNull().references(() => inventoryTransfers.id),
	inventoryItemId: uuid("inventory_item_id").notNull().references(() => inventoryItems.id),
	quantitySent: numeric("quantity_sent", { precision: 10, scale: 3 }).notNull(),
	quantityReceived: numeric("quantity_received", { precision: 10, scale: 3 }).default("0"),
	quantityDamaged: numeric("quantity_damaged", { precision: 10, scale: 3 }).default("0"),
	notes: text("notes"),
});

// ─── MDLP / Chestny Znak (ФЗ № 425-ФЗ & Постановление № 1556) ─────────────

export const mdlpItems = pgTable(
	"mdlp_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		sgtin: text("sgtin").notNull(),
		gtin: text("gtin").notNull(),
		serialNumber: text("serial_number").notNull(),
		rawBarcode: text("raw_barcode").notNull(),
		tradeName: text("trade_name").notNull(),
		inn: text("inn"),
		series: text("series"),
		expirationDate: text("expiration_date"),
		status: text("status").notNull().default("in_stock"), // in_stock | disposed | quarantine | expired
		disposedAt: timestamp("disposed_at", { withTimezone: true }),
		disposalReason: text("disposal_reason"),
		disposalType: text("disposal_type").default("13"), // 13 = медицинское применение (Схема 10560)
		patientId: uuid("patient_id").references(() => patients.id, {
			onDelete: "set null",
		}),
		visitId: uuid("visit_id"),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		costRub: numeric("cost_rub", { precision: 10, scale: 2 }),
		warehouseId: uuid("warehouse_id").references(() => warehouses.id, {
			onDelete: "set null",
		}),
		inventoryItemId: uuid("inventory_item_id").references(
			() => inventoryItems.id,
			{ onDelete: "set null" },
		),
		batchId: uuid("batch_id").references(() => stockBatches.id, {
			onDelete: "set null",
		}),
		inventoryTransactionId: uuid("inventory_transaction_id").references(
			() => inventoryTransactions.id,
			{ onDelete: "set null" },
		),
		crptReceiptNumber: text("crpt_receipt_number"),
		schema10560Xml: text("schema_10560_xml"),
		schema10560Json: jsonb("schema_10560_json"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgSgtinIdx: index("mdlp_items_org_sgtin_idx").on(
			t.organizationId,
			t.sgtin,
		),
		orgStatusIdx: index("mdlp_items_org_status_idx").on(
			t.organizationId,
			t.status,
		),
	}),
);


