import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "../auth.js";
import { patients } from "../patients.js";
import { inventoryItems, warehouses } from "./inventoryItemsTable.js";

/**
 * stockBatches — Партионный учет FEFO (First Expired, First Out) с сериями и сроками годности.
 */
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
		stockBatchesOrgItemStatusExpIdx: index("stock_batches_org_item_status_exp_idx").on(
			t.organizationId,
			t.inventoryItemId,
			t.status,
			t.expirationDate,
		),
		warehouseIdx: index("stock_batches_warehouse_idx").on(t.warehouseId),
	}),
);

/**
 * inventoryTransactions — Журнал складских проводок (приход, расход, списание, овердрафт, сторно).
 */
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
		orgCreatedIdx: index("inventory_transactions_org_created_idx").on(
			t.organizationId,
			t.createdAt,
		),
		orgItemIdx: index("inventory_transactions_org_item_idx").on(
			t.organizationId,
			t.inventoryItemId,
		),
		orgWarehouseIdx: index("inventory_transactions_org_warehouse_idx").on(
			t.organizationId,
			t.warehouseId,
		),
		visitIdIdx: index("inventory_transactions_visit_id_idx").on(t.visitId),
		userIdIdx: index("inventory_transactions_user_id_idx").on(t.userId),
	}),
);

/**
 * inventoryTransfers — Перемещение ТМЦ между складами и филиалами (ТОРГ-13).
 */
export const inventoryTransfers = pgTable(
	"inventory_transfers",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		senderOrganizationId: uuid("sender_organization_id")
			.notNull()
			.references(() => organizations.id),
		receiverOrganizationId: uuid("receiver_organization_id")
			.notNull()
			.references(() => organizations.id),
		status: text("status").notNull().default("draft"), // draft, in_transit, partially_received, completed, cancelled
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => ({
		senderOrgIdx: index("inventory_transfers_sender_org_idx").on(
			t.senderOrganizationId,
		),
		receiverOrgIdx: index("inventory_transfers_receiver_org_idx").on(
			t.receiverOrganizationId,
		),
		senderStatusIdx: index("inventory_transfers_sender_status_idx").on(
			t.senderOrganizationId,
			t.status,
		),
	}),
);

export const inventoryTransferItems = pgTable(
	"inventory_transfer_items",
	{
		id: uuid("id").primaryKey().default(sql`uuidv7()`),
		transferId: uuid("transfer_id")
			.notNull()
			.references(() => inventoryTransfers.id),
		inventoryItemId: uuid("inventory_item_id")
			.notNull()
			.references(() => inventoryItems.id),
		quantitySent: numeric("quantity_sent", { precision: 10, scale: 3 }).notNull(),
		quantityReceived: numeric("quantity_received", { precision: 10, scale: 3 }).default("0"),
		quantityDamaged: numeric("quantity_damaged", { precision: 10, scale: 3 }).default("0"),
		notes: text("notes"),
	},
	(t) => ({
		transferIdIdx: index("inventory_transfer_items_transfer_idx").on(
			t.transferId,
		),
		itemIdIdx: index("inventory_transfer_items_item_idx").on(
			t.inventoryItemId,
		),
	}),
);

/**
 * mdlpItems — Маркированные лекарственные препараты Честный Знак (МДЛП).
 */
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
		patientIdIdx: index("mdlp_items_patient_id_idx").on(t.patientId),
		visitIdIdx: index("mdlp_items_visit_id_idx").on(t.visitId),
		doctorIdIdx: index("mdlp_items_doctor_id_idx").on(t.doctorId),
		warehouseIdIdx: index("mdlp_items_warehouse_id_idx").on(t.warehouseId),
		inventoryItemIdIdx: index("mdlp_items_inventory_item_idx").on(
			t.inventoryItemId,
		),
		batchIdIdx: index("mdlp_items_batch_id_idx").on(t.batchId),
	}),
);
