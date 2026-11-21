import { sql } from "drizzle-orm";
import {
	bigint,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { inventoryItems, warehouses } from "./inventoryItemsTable.js";

/**
 * inventory_supplier_invoices — Приходные накладные от поставщиков медикаментов и расходников.
 * Обеспечивает строгий реляционный учет поступлений вместо текстовых заметок (Мандаты 8v, 8e, 8n).
 */
export const inventorySupplierInvoices = pgTable(
	"inventory_supplier_invoices",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		organizationId: uuid("organization_id")
			.notNull()
			.references(() => organizations.id),
		invoiceNumber: text("invoice_number").notNull(),
		supplierName: text("supplier_name").notNull(),
		supplierInn: text("supplier_inn"),
		invoiceDate: text("invoice_date").notNull(),
		status: text("status").notNull().default("posted"),
		warehouseId: uuid("warehouse_id").references(() => warehouses.id),
		totalAmountKopecks: bigint("total_amount_kopecks", { mode: "number" })
			.notNull()
			.default(sql`0`),
		vatAmountKopecks: bigint("vat_amount_kopecks", { mode: "number" })
			.notNull()
			.default(sql`0`),
		notes: text("notes"),
		createdBy: uuid("created_by").references(() => users.id),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		orgInvoiceNumIdx: index("inventory_supplier_invoices_org_invoice_num_idx").on(
			t.organizationId,
			t.invoiceNumber,
		),
		orgDateIdx: index("inventory_supplier_invoices_org_date_idx").on(
			t.organizationId,
			t.invoiceDate,
		),
	}),
);

export const inventorySupplierInvoiceItems = pgTable(
	"inventory_supplier_invoice_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		invoiceId: uuid("invoice_id")
			.notNull()
			.references(() => inventorySupplierInvoices.id, { onDelete: "cascade" }),
		inventoryItemId: uuid("inventory_item_id").references(
			() => inventoryItems.id,
			{ onDelete: "set null" },
		),
		itemName: text("item_name").notNull(),
		category: text("category"),
		unit: text("unit").notNull().default("шт"),
		quantity: numeric("quantity", { precision: 12, scale: 4 })
			.notNull()
			.default("1.0000"),
		unitPriceKopecks: bigint("unit_price_kopecks", { mode: "number" })
			.notNull()
			.default(sql`0`),
		vatRate: integer("vat_rate").notNull().default(0),
		lineTotalKopecks: bigint("line_total_kopecks", { mode: "number" })
			.notNull()
			.default(sql`0`),
		batchNumber: text("batch_number"),
		expirationDate: text("expiration_date"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		invoiceIdIdx: index("inventory_supplier_invoice_items_invoice_id_idx").on(
			t.invoiceId,
		),
		itemIdIdx: index("inventory_supplier_invoice_items_item_id_idx").on(
			t.inventoryItemId,
		),
	}),
);

export const supplierInvoices = inventorySupplierInvoices;
export const supplierInvoiceItems = inventorySupplierInvoiceItems;
