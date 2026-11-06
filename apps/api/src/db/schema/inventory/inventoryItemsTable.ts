import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "../auth.js";

/**
 * inventoryItems — Карточки номенклатуры склада (материалы, медикаменты, инструменты).
 * Содержит минимальные пороги, единицы измерения, цены и остатки.
 */
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
		 * date, mode "string" — дата приходит и уходит как «YYYY-MM-DD».
		 */
		lotNumber: text("lot_number"),
		expirationDate: date("expiration_date", { mode: "string" }),
		packageMultiplier: numeric("package_multiplier", {
			precision: 10,
			scale: 3,
		}).default("1.000"),
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
			orgCategoryIdx: index("inventory_items_org_category_idx").on(
				table.organizationId,
				table.category,
			),
			orgBarcodeIdx: index("inventory_items_org_barcode_idx").on(
				table.organizationId,
				table.barcode,
			),
			orgCreatedIdx: index("inventory_items_org_created_idx").on(
				table.organizationId,
				table.createdAt,
			),
		};
	},
);

/**
 * warehouses — Клинические склады клиники (основной склад, кабинеты, ЦСО).
 */
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
