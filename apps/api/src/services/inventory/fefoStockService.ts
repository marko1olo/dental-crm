import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
	stockBatches,
	warehouses,
} from "../../db/schema/inventory.js";
import { InsufficientStockError } from "./materialDeduction.js";

export type DbTransaction =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| TenantDb;

export interface FefoBatchUsage {
	batchId: string;
	batchNumber: string;
	expirationDate: string;
	quantityDeducted: number;
}

export interface FefoDeductionResult {
	inventoryItemId: string;
	inventoryItemName: string;
	requiredQty: number;
	deductedQty: number;
	batchesUsed: FefoBatchUsage[];
	isOverdraft: boolean;
	deficitQty: number;
	warning?: string | undefined;
}

export interface ReceiveBatchInput {
	organizationId: string;
	inventoryItemId: string;
	warehouseId?: string | null | undefined;
	batchNumber: string;
	expirationDate: string;
	manufactureDate?: string | null | undefined;
	quantity: number;
	purchasePricePerUnit?: number | null | undefined;
	barcode?: string | null | undefined;
	userId?: string | null | undefined;
	notes?: string | null | undefined;
}

export interface WriteOffScrapInput {
	organizationId: string;
	inventoryItemId: string;
	batchId?: string | null | undefined;
	quantity: number;
	reason: "expired" | "scrap" | "quarantine" | "defect";
	actNumber: string;
	notes?: string | null | undefined;
	userId?: string | null | undefined;
}

export class FefoStockService {
	/**
	 * Списание материала со склада по регламенту FEFO (First Expired, First Out).
	 * Инварианты:
	 * 1. Первыми списываются партии с наиболее ранним сроком годности (expiration_date ASC).
	 * 2. При нехватке остатка на складе (дефицит): если allowOverdraft = true (по умолчанию),
	 *    списание НЕ блокирует клиническую операцию, а списывает в дефицит с отметкой is_overdraft = true
	 *    и формирует алерт службе снабжения.
	 */
	public async deductFefo(
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
		const {
			organizationId,
			inventoryItemId,
			requiredQty,
			warehouseId,
			visitId,
			userId,
			allowOverdraft = true,
			notes,
			transactionType = "treatment_consumable",
		} = params;

		if (requiredQty <= 0) {
			return {
				inventoryItemId,
				inventoryItemName: "",
				requiredQty: 0,
				deductedQty: 0,
				batchesUsed: [],
				isOverdraft: false,
				deficitQty: 0,
			};
		}

		// 1. Блокируем строку номенклатуры FOR UPDATE
		const [inv] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, inventoryItemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		if (!inv) {
			throw new Error(`Материал с ID ${inventoryItemId} не найден на складе клиники.`);
		}

		// 2. Получаем активные партии данного материала, отсортированные по сроку годности (FEFO)
		const batchConditions = [
			eq(stockBatches.organizationId, organizationId),
			eq(stockBatches.inventoryItemId, inventoryItemId),
			eq(stockBatches.status, "active"),
		];

		if (warehouseId) {
			batchConditions.push(eq(stockBatches.warehouseId, warehouseId));
		}

		const activeBatches = await tx
			.select()
			.from(stockBatches)
			.where(and(...batchConditions))
			.orderBy(asc(stockBatches.expirationDate), asc(stockBatches.createdAt))
			.for("update");

		let needed = requiredQty;
		const batchesUsed: FefoBatchUsage[] = [];
		const transactionsToInsert: Array<typeof inventoryTransactions.$inferInsert> = [];

		for (const batch of activeBatches) {
			if (needed <= 0) break;
			const remaining = Number(batch.remainingQty);
			if (remaining <= 0) continue;

			const take = Math.min(remaining, needed);
			const newRemaining = Number((remaining - take).toFixed(3));
			const isDepleted = newRemaining <= 0;

			await tx
				.update(stockBatches)
				.set({
					remainingQty: String(newRemaining),
					status: isDepleted ? "depleted" : "active",
					updatedAt: new Date(),
				})
				.where(eq(stockBatches.id, batch.id));

			batchesUsed.push({
				batchId: batch.id,
				batchNumber: batch.batchNumber,
				expirationDate: batch.expirationDate,
				quantityDeducted: take,
			});

			transactionsToInsert.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: batch.id,
				warehouseId: batch.warehouseId ?? warehouseId ?? null,
				quantityChanged: String(-take),
				unitCostRub: batch.purchasePricePerUnit ?? inv.unitCostRub ?? null,
				transactionType,
				isOverdraft: false,
				userId: userId ?? null,
				notes: notes ?? (visitId ? `Списание по визиту ${visitId} (партия ${batch.batchNumber})` : null),
			});

			needed = Number((needed - take).toFixed(4));
		}

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const newStock = Number((currentStock - requiredQty).toFixed(4));
		let isOverdraft = false;
		let deficitQty = 0;
		let warning: string | undefined;

		// 3. Обработка нехватки партий (дефицит / мягкий овердрафт при экстренной помощи и лечении)
		if (needed > 0) {
			deficitQty = needed;
			// Клинический закон: задержка накладной снабженцем не должна блокировать операцию и спасение зуба пациента.
			// Мягкий овердрафт склада с предупреждением применяется при любых клинических списаниях,
			// если не задан строгий административный запрет (allowOverdraft === false).
			if (allowOverdraft === false) {
				throw new InsufficientStockError({
					inventoryItemId: inv.id,
					inventoryItemName: inv.name,
					availableStock: requiredQty - needed,
					requiredStock: requiredQty,
				});
			}

			isOverdraft = true;
			warning = `Внимание: допущен технический перерасход по материалу «${inv.name}» (дефицит ${deficitQty} ${inv.unit ?? "ед."}). Требуется оформление прихода накладной снабженцем.`;

			transactionsToInsert.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: null,
				warehouseId: warehouseId ?? null,
				quantityChanged: String(-deficitQty),
				unitCostRub: inv.unitCostRub ?? null,
				transactionType: "emergency_overdraft",
				isOverdraft: true,
				userId: userId ?? null,
				notes: `Технический перерасход при оказании помощи (дефицит ${deficitQty} ед.)`,
			});
		}

		// 4. Обновляем итоговый баланс номенклатуры
		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, inv.id),
					eq(inventoryItems.organizationId, organizationId),
				),
			);

		if (transactionsToInsert.length > 0) {
			await tx.insert(inventoryTransactions).values(transactionsToInsert);
		}

		return {
			inventoryItemId: inv.id,
			inventoryItemName: inv.name,
			requiredQty,
			deductedQty: requiredQty,
			batchesUsed,
			isOverdraft,
			deficitQty,
			warning,
		};
	}

	/**
	 * Оприходование новой партии материала на склад (поступление / накладная ТОРГ-12).
	 */
	public async receiveBatch(
		tx: DbTransaction,
		input: ReceiveBatchInput,
	): Promise<typeof stockBatches.$inferSelect> {
		const {
			organizationId,
			inventoryItemId,
			warehouseId,
			batchNumber,
			expirationDate,
			manufactureDate,
			quantity,
			purchasePricePerUnit,
			barcode,
			userId,
			notes,
		} = input;

		if (quantity <= 0) {
			throw new Error("Количество приходуемой партии должно быть положительным числом.");
		}

		// 1. Блокируем карточку номенклатуры
		const [inv] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, inventoryItemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		if (!inv) {
			throw new Error(`Материал с ID ${inventoryItemId} не найден.`);
		}

		// 2. Создаем партию FEFO
		const [createdBatch] = await tx
			.insert(stockBatches)
			.values({
				organizationId,
				warehouseId: warehouseId ?? null,
				inventoryItemId,
				batchNumber: batchNumber.trim(),
				expirationDate,
				manufactureDate: manufactureDate ?? null,
				initialQty: String(quantity),
				remainingQty: String(quantity),
				purchasePricePerUnit: purchasePricePerUnit != null ? String(purchasePricePerUnit) : null,
				status: "active",
				barcode: barcode?.trim() || null,
			})
			.returning();

		if (!createdBatch) {
			throw new Error("Не удалось сохранить партию в базе данных.");
		}

		// 3. Увеличиваем общий остаток номенклатуры
		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const newStock = Number((currentStock + quantity).toFixed(3));

		// Если срок партии ближе, чем текущий срок в карточке, обновляем его
		const shouldUpdateCardDate =
			!inv.expirationDate || expirationDate < inv.expirationDate;

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				lotNumber: shouldUpdateCardDate ? batchNumber : inv.lotNumber,
				expirationDate: shouldUpdateCardDate ? expirationDate : inv.expirationDate,
				updatedAt: new Date(),
			})
			.where(eq(inventoryItems.id, inv.id));

		// 4. Фиксируем приходную транзакцию
		await tx.insert(inventoryTransactions).values({
			organizationId,
			itemId: inv.id,
			inventoryItemId: inv.id,
			batchId: createdBatch.id,
			warehouseId: warehouseId ?? null,
			quantityChanged: String(quantity),
			unitCostRub: purchasePricePerUnit != null ? String(purchasePricePerUnit) : inv.unitCostRub,
			transactionType: "receipt",
			userId: userId ?? null,
			notes: notes ?? `Поступление партии ${batchNumber} (${quantity} ед.)`,
		});

		return createdBatch;
	}

	/**
	 * Списание просроченных или бракованных материалов по акту утилизации (ТОРГ-16).
	 * СНЯТ ОШИБОЧНЫЙ ЗАПРЕТ: списание просроченных материалов в актах утилизации прямо разрешено!
	 */
	public async writeOffExpiredOrScrap(
		tx: DbTransaction,
		input: WriteOffScrapInput,
	): Promise<{ success: boolean; writtenOffQty: number }> {
		const {
			organizationId,
			inventoryItemId,
			batchId,
			quantity,
			reason,
			actNumber,
			notes,
			userId,
		} = input;

		if (quantity <= 0) {
			throw new Error("Количество списываемого материала должно быть больше 0.");
		}

		// 1. Блокируем карточку
		const [inv] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, inventoryItemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.for("update");

		if (!inv) {
			throw new Error(`Материал с ID ${inventoryItemId} не найден.`);
		}

		let batchFound: typeof stockBatches.$inferSelect | undefined;

		if (batchId) {
			const [b] = await tx
				.select()
				.from(stockBatches)
				.where(
					and(
						eq(stockBatches.id, batchId),
						eq(stockBatches.organizationId, organizationId),
					),
				)
				.for("update");
			batchFound = b;
		}

		if (batchFound) {
			const rem = Number(batchFound.remainingQty);
			const newRem = Math.max(0, Number((rem - quantity).toFixed(3)));
			await tx
				.update(stockBatches)
				.set({
					remainingQty: String(newRem),
					status: newRem <= 0 ? "expired" : "active",
					updatedAt: new Date(),
				})
				.where(eq(stockBatches.id, batchFound.id));
		}

		const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
		const newStock = Number((currentStock - quantity).toFixed(3));

		await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(eq(inventoryItems.id, inv.id));

		await tx.insert(inventoryTransactions).values({
			organizationId,
			itemId: inv.id,
			inventoryItemId: inv.id,
			batchId: batchId ?? null,
			quantityChanged: String(-quantity),
			unitCostRub: batchFound?.purchasePricePerUnit ?? inv.unitCostRub,
			transactionType: reason === "expired" ? "write_off_expired" : "write_off_scrap",
			userId: userId ?? null,
			notes: `Акт утилизации/брака №${actNumber} (${reason}). ${notes ?? ""}`.trim(),
		});

		return { success: true, writtenOffQty: quantity };
	}

	/**
	 * Автоматическое списание по технологической карте процедуры (BOM).
	 */
	public async deductForProcedure(
		tx: DbTransaction,
		params: {
			organizationId: string;
			serviceId: string;
			serviceQuantity?: number | undefined;
			warehouseId?: string | null | undefined;
			visitId?: string | null | undefined;
			userId?: string | null | undefined;
			allowOverdraft?: boolean | undefined;
		},
	): Promise<FefoDeductionResult[]> {
		const {
			organizationId,
			serviceId,
			serviceQuantity = 1,
			warehouseId,
			visitId,
			userId,
			allowOverdraft = true,
		} = params;

		// 1. Ищем техкарту процедуры в procedure_tech_cards
		const [techCard] = await tx
			.select()
			.from(procedureTechCards)
			.where(
				and(
					eq(procedureTechCards.organizationId, organizationId),
					eq(procedureTechCards.serviceId, serviceId),
					eq(procedureTechCards.status, "active"),
				),
			)
			.limit(1);

		let itemsToDeduct: Array<{ inventoryItemId: string; quantity: number }> = [];

		if (techCard) {
			const cardItems = await tx
				.select()
				.from(procedureTechCardItems)
				.where(eq(procedureTechCardItems.techCardId, techCard.id));

			itemsToDeduct = cardItems.map((ci) => ({
				inventoryItemId: ci.inventoryItemId,
				quantity: Number(ci.quantity) * serviceQuantity,
			}));
		} else {
			// Резервный поиск в procedure_material_rules
			const rules = await tx
				.select()
				.from(procedureMaterialRules)
				.where(
					and(
						eq(procedureMaterialRules.serviceId, serviceId),
						or(
							eq(procedureMaterialRules.organizationId, organizationId),
							isNull(procedureMaterialRules.organizationId),
						),
					),
				);

			itemsToDeduct = rules
				.filter((r) => r.inventoryItemId || r.materialItemId)
				.map((r) => ({
					inventoryItemId: (r.inventoryItemId ?? r.materialItemId)!,
					quantity: Number(r.quantityToDeduct ?? r.requiredQty ?? 1) * serviceQuantity,
				}));
		}

		if (itemsToDeduct.length === 0) {
			return [];
		}

		// Сортировка ID для предотвращения взаимных блокировок
		const sortedItems = [...itemsToDeduct].sort((a, b) =>
			a.inventoryItemId.localeCompare(b.inventoryItemId),
		);

		const results: FefoDeductionResult[] = [];

		for (const it of sortedItems) {
			const res = await this.deductFefo(tx, {
				organizationId,
				inventoryItemId: it.inventoryItemId,
				requiredQty: it.quantity,
				warehouseId: warehouseId ?? undefined,
				visitId: visitId ?? undefined,
				userId: userId ?? undefined,
				allowOverdraft,
				transactionType: "procedure_bom_deduct",
			});
			results.push(res);
		}

		return results;
	}
}

export const fefoStockService = new FefoStockService();
