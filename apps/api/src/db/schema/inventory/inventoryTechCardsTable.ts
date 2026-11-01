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
import { organizations } from "../auth.js";
import { serviceCatalogItems } from "../clinical.js";
import { inventoryItems } from "./inventoryItemsTable.js";

/**
 * procedureMaterialRules — Правила списания материалов на стоматологические процедуры (BOM).
 */
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

/**
 * procedureTechCards — Технологические карты процедур (спецификация расхода материалов BOM).
 */
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
		itemIdx: index("procedure_tech_card_items_item_idx").on(t.inventoryItemId),
	}),
);
