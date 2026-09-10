/**
 * treatmentConsumables.ts — Drizzle database schema for Procedure Consumable BOM & Deductions.
 *
 * Tables:
 * 1. treatment_consumables: mapping between Service Catalog Code (Order 804n / Clinic price list)
 *    and warehouse inventory items with consumption norms.
 * 2. treatment_consumable_deductions: tracks idempotent deductions by treatment_reference_id.
 */

import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./auth.js";
import { inventoryItems } from "./inventory.js";

/**
 * treatment_consumables: mapping of procedure code to warehouse stock item and required norm.
 * Unique constraint on (organization_id, catalog_item_code, inventory_item_id).
 */
export const treatmentConsumables = pgTable(
	"treatment_consumables",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		catalogItemCode: text("catalog_item_code").notNull(),
		inventoryItemId: uuid("inventory_item_id")
			.notNull()
			.references(() => inventoryItems.id, { onDelete: "cascade" }),
		quantity: numeric("quantity", { precision: 12, scale: 4 })
			.notNull()
			.default("1.0000"),
		note: text("note"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgCodeItemUniqueIdx: uniqueIndex(
			"treatment_consumables_org_code_item_unique_idx",
		).on(table.organizationId, table.catalogItemCode, table.inventoryItemId),
		orgCodeIdx: index("treatment_consumables_org_code_idx").on(
			table.organizationId,
			table.catalogItemCode,
		),
		orgItemIdx: index("treatment_consumables_org_item_idx").on(
			table.organizationId,
			table.inventoryItemId,
		),
	}),
);

/**
 * treatment_consumable_deductions: audit ledger ensuring deduction idempotency by treatment_reference_id.
 * Unique constraint on (organization_id, treatment_reference_id).
 */
export const treatmentConsumableDeductions = pgTable(
	"treatment_consumable_deductions",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id, { onDelete: "cascade" }),
		treatmentReferenceId: text("treatment_reference_id").notNull(),
		visitId: uuid("visit_id"),
		doctorId: uuid("doctor_id").references(() => users.id, {
			onDelete: "set null",
		}),
		status: text("status").notNull().default("completed"),
		isOverdraft: boolean("is_overdraft").notNull().default(false),
		deductions: jsonb("deductions").notNull().default(sql`'[]'::jsonb`),
		warnings: jsonb("warnings").notNull().default(sql`'[]'::jsonb`),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => ({
		orgReferenceUniqueIdx: uniqueIndex(
			"treatment_consumable_deductions_org_reference_unique_idx",
		).on(table.organizationId, table.treatmentReferenceId),
		orgVisitIdx: index("treatment_consumable_deductions_org_visit_idx").on(
			table.organizationId,
			table.visitId,
		),
	}),
);
