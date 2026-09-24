import { and, asc, desc, eq, gt, gte, ilike, lte, or, sql } from "drizzle-orm";
import type { DbTransaction } from "../services/inventory/fefoStockService.js";
import {
	type FefoDeductionResult,
	fefoStockService,
	getDefaultExpirationDate,
	normalizeDateToIso,
	type ReceiveBatchInput,
} from "../services/inventory/fefoStockService.js";
import { db } from "./client.js";
import {
	inventoryItems,
	inventoryTransactions,
	stockBatches,
	warehouses,
} from "./schema/inventory.js";

export interface GoodsReceiptInvoiceItemInput {
	inventoryItemId?: string | null | undefined;
	name?: string | null | undefined;
	batchNumber: string;
	expirationDate: string;
	manufactureDate?: string | null | undefined;
	quantity: number;
	purchasePricePerUnit?: number | null | undefined;
	unitCostRub?: number | null | undefined;
	barcode?: string | null | undefined;
	unit?: string | null | undefined;
	category?: string | null | undefined;
}

export interface GoodsReceiptInvoiceInput {
	organizationId: string;
	invoiceNumber: string;
	invoiceDate?: string | null | undefined;
	supplierName?: string | null | undefined;
	supplierInn?: string | null | undefined;
	warehouseId?: string | null | undefined;
	items: GoodsReceiptInvoiceItemInput[];
	userId?: string | null | undefined;
	notes?: string | null | undefined;
}

export interface GoodsReceiptInvoiceResult {
	invoiceNumber: string;
	invoiceDate: string;
	supplierName: string | null;
	totalItems: number;
	totalQuantity: number;
	totalCostRub: number;
	batches: Array<typeof stockBatches.$inferSelect>;
}

export interface StockBatchesQueryOptions {
	itemId?: string | null | undefined;
	status?: "active" | "depleted" | "expired" | "quarantine" | "all" | undefined;
	warehouseId?: string | null | undefined;
	limit?: number | undefined;
	offset?: number | undefined;
}

export const inventoryQuery = {
	/**
	 * Получение списка номенклатуры склада клиники.
	 */
	async getInventoryItems(
		organizationId: string,
		executor: DbTransaction = db,
	): Promise<Array<typeof inventoryItems.$inferSelect>> {
		return executor
			.select()
			.from(inventoryItems)
			.where(eq(inventoryItems.organizationId, organizationId))
			.orderBy(asc(inventoryItems.name));
	},

	/**
	 * Получение карточки материала по ID с изоляцией организации.
	 */
	async getInventoryItemById(
		organizationId: string,
		itemId: string,
		executor: DbTransaction = db,
	): Promise<typeof inventoryItems.$inferSelect | null> {
		const [item] = await executor
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1);
		return item ?? null;
	},

	/**
	 * Получение партий материалов (FEFO) с детализацией сроков и номенклатуры.
	 */
	async getStockBatches(
		organizationId: string,
		options: StockBatchesQueryOptions = {},
		executor: DbTransaction = db,
	) {
		const conditions = [eq(stockBatches.organizationId, organizationId)];

		if (options.itemId) {
			conditions.push(eq(stockBatches.inventoryItemId, options.itemId));
		}
		if (options.status && options.status !== "all") {
			conditions.push(eq(stockBatches.status, options.status));
		}
		if (options.warehouseId) {
			conditions.push(eq(stockBatches.warehouseId, options.warehouseId));
		}

		let query = executor
			.select({
				id: stockBatches.id,
				organizationId: stockBatches.organizationId,
				warehouseId: stockBatches.warehouseId,
				inventoryItemId: stockBatches.inventoryItemId,
				itemName: inventoryItems.name,
				itemCategory: inventoryItems.category,
				itemUnit: inventoryItems.unit,
				batchNumber: stockBatches.batchNumber,
				expirationDate: stockBatches.expirationDate,
				manufactureDate: stockBatches.manufactureDate,
				initialQty: stockBatches.initialQty,
				remainingQty: stockBatches.remainingQty,
				purchasePricePerUnit: stockBatches.purchasePricePerUnit,
				status: stockBatches.status,
				barcode: stockBatches.barcode,
				createdAt: stockBatches.createdAt,
				updatedAt: stockBatches.updatedAt,
			})
			.from(stockBatches)
			.innerJoin(
				inventoryItems,
				eq(stockBatches.inventoryItemId, inventoryItems.id),
			)
			.where(and(...conditions))
			.orderBy(asc(stockBatches.expirationDate), asc(stockBatches.createdAt));

		if (options.limit && options.limit > 0) {
			query = query.limit(options.limit) as typeof query;
		}
		if (options.offset && options.offset > 0) {
			query = query.offset(options.offset) as typeof query;
		}

		return query;
	},

	/**
	 * Получение партий с истекающим сроком годности (Shelf-Life Monitor).
	 */
	async getExpiringBatches(
		organizationId: string,
		daysAhead = 30,
		executor: DbTransaction = db,
	) {
		const now = new Date();
		const todayIso = now.toISOString().slice(0, 10);
		const targetDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
		const targetIso = targetDate.toISOString().slice(0, 10);

		return executor
			.select({
				id: stockBatches.id,
				inventoryItemId: stockBatches.inventoryItemId,
				itemName: inventoryItems.name,
				batchNumber: stockBatches.batchNumber,
				expirationDate: stockBatches.expirationDate,
				remainingQty: stockBatches.remainingQty,
				itemUnit: inventoryItems.unit,
				purchasePricePerUnit: stockBatches.purchasePricePerUnit,
				status: stockBatches.status,
			})
			.from(stockBatches)
			.innerJoin(
				inventoryItems,
				eq(stockBatches.inventoryItemId, inventoryItems.id),
			)
			.where(
				and(
					eq(stockBatches.organizationId, organizationId),
					eq(stockBatches.status, "active"),
					gt(sql`CAST(${stockBatches.remainingQty} AS numeric)`, 0),
					lte(stockBatches.expirationDate, targetIso),
				),
			)
			.orderBy(asc(stockBatches.expirationDate));
	},

	/**
	 * Оприходование единичной партии (делегирование в FefoStockService).
	 */
	async receiveBatch(
		tx: DbTransaction,
		input: ReceiveBatchInput,
	): Promise<typeof stockBatches.$inferSelect> {
		return fefoStockService.receiveBatch(tx, input);
	},

	/**
	 * Проведение комплексной приходной накладной (ТОРГ-12 / УПД) в транзакции.
	 * Ликвидирует вечный овердрафт: создает партии в stock_batches и синхронизирует баланс.
	 */
	async receiveGoodsReceiptInvoice(
		tx: DbTransaction,
		input: GoodsReceiptInvoiceInput,
	): Promise<GoodsReceiptInvoiceResult> {
		const {
			organizationId,
			invoiceNumber,
			invoiceDate: rawInvoiceDate,
			supplierName,
			supplierInn,
			warehouseId,
			items,
			userId,
			notes,
		} = input;

		if (!items || items.length === 0) {
			throw new Error("Приходная накладная должна содержать хотя бы одну позицию.");
		}

		const invoiceDate =
			normalizeDateToIso(rawInvoiceDate) || new Date().toISOString().slice(0, 10);
		const createdBatches: Array<typeof stockBatches.$inferSelect> = [];
		let totalQuantity = 0;
		let totalCostRub = 0;

		for (const line of items) {
			if (line.quantity <= 0) {
				continue;
			}

			let itemRecord: typeof inventoryItems.$inferSelect | undefined;

			// 1. Поиск по inventoryItemId
			if (line.inventoryItemId) {
				const [existing] = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.id, line.inventoryItemId),
							eq(inventoryItems.organizationId, organizationId),
						),
					)
					.limit(1)
					.for("update");
				itemRecord = existing;
			}

			// 2. Поиск по имени, если ID не передан или не найден
			if (!itemRecord && line.name?.trim()) {
				const [existingByName] = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, organizationId),
							ilike(inventoryItems.name, line.name.trim()),
						),
					)
					.limit(1)
					.for("update");
				itemRecord = existingByName;
			}

			const unitPrice =
				line.purchasePricePerUnit ?? line.unitCostRub ?? 0;

			// 3. Автосоздание карточки материала, если позиция новая в накладной
			if (!itemRecord) {
				const itemName = (line.name && line.name.trim()) || "Новый материал";
				const [createdItem] = await tx
					.insert(inventoryItems)
					.values({
						organizationId,
						name: itemName,
						category: line.category || "material",
						unit: line.unit || "шт",
						stockQuantity: "0",
						currentQty: "0",
						unitCostRub: String(Math.max(0, unitPrice)),
						criticalThreshold: "0",
						barcode: line.barcode?.trim() || null,
					})
					.returning();

				if (!createdItem) {
					throw new Error(`Не удалось создать карточку для материала «${itemName}».`);
				}
				itemRecord = createdItem;
			}

			// 4. Оприходование партии в stock_batches через FefoStockService
			const batchExp =
				normalizeDateToIso(line.expirationDate) ||
				getDefaultExpirationDate();
			const batchMfg = normalizeDateToIso(line.manufactureDate);
			const batchNum =
				(line.batchNumber && line.batchNumber.trim()) ||
				`LOT-${new Date().getFullYear()}-${invoiceNumber.replace(/[^a-zA-Z0-9]/g, "") || "IN"}`;

			const lineNote = `Приходная накладная № ${invoiceNumber}${supplierName ? ` (${supplierName})` : ""}${notes ? ` • ${notes}` : ""}`;

			const batch = await fefoStockService.receiveBatch(tx, {
				organizationId,
				inventoryItemId: itemRecord.id,
				warehouseId: warehouseId ?? null,
				batchNumber: batchNum,
				expirationDate: batchExp,
				manufactureDate: batchMfg,
				quantity: line.quantity,
				purchasePricePerUnit: unitPrice,
				barcode: line.barcode?.trim() || itemRecord.barcode,
				userId: userId ?? null,
				notes: lineNote,
			});

			createdBatches.push(batch);
			totalQuantity += line.quantity;
			totalCostRub += Number((line.quantity * unitPrice).toFixed(2));
		}

		return {
			invoiceNumber,
			invoiceDate,
			supplierName: supplierName ?? null,
			totalItems: createdBatches.length,
			totalQuantity: Number(totalQuantity.toFixed(3)),
			totalCostRub: Number(totalCostRub.toFixed(2)),
			batches: createdBatches,
		};
	},

	/**
	 * Списание материала по регламенту FEFO.
	 */
	async deductFefo(
		tx: DbTransaction,
		params: {
			organizationId: string;
			inventoryItemId: string;
			requiredQty: number;
			warehouseId?: string | null | undefined;
			visitId?: string | null | undefined;
			userId?: string | null | undefined;
			allowOverdraft?: boolean | undefined;
			notes?: string | null | undefined;
			transactionType?: string | undefined;
		},
	): Promise<FefoDeductionResult> {
		return fefoStockService.deductFefo(tx, params);
	},

	/**
	 * Получение журнала движений по складу.
	 */
	async getInventoryTransactions(
		organizationId: string,
		options: { itemId?: string; limit?: number; offset?: number } = {},
		executor: DbTransaction = db,
	) {
		const conditions = [
			eq(inventoryTransactions.organizationId, organizationId),
		];
		if (options.itemId) {
			conditions.push(
				or(
					eq(inventoryTransactions.itemId, options.itemId),
					eq(inventoryTransactions.inventoryItemId, options.itemId),
				)!,
			);
		}

		let query = executor
			.select()
			.from(inventoryTransactions)
			.where(and(...conditions))
			.orderBy(desc(inventoryTransactions.createdAt));

		if (options.limit && options.limit > 0) {
			query = query.limit(options.limit) as typeof query;
		}
		if (options.offset && options.offset > 0) {
			query = query.offset(options.offset) as typeof query;
		}

		return query;
	},
};
