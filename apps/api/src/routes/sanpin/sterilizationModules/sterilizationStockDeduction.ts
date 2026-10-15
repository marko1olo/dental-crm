/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationStockDeduction.ts
 *
 * Автоматическое тихое фоновое списание расходных материалов со склада
 * при проведении циклов стерилизации и автоклавирования (СанПиН 2.1.3678-20, СанПиН 3.3686-21).
 *
 * Реализует Мандаты 8e (Doctor & Staff Autonomy), 8n (Solo Doctor & Small Clinic) и 8aa (Silent Accounting):
 * - Списание крафт-пакетов (термосварка / самоклейка)
 * - Списание химических индикаторов контроля стерилизации (Винар / DGM, 4-6 класс)
 * - Мягкий складской овердрафт (Soft Negative Stock / isOverdraft: true)
 * - Авто-создание отсутствующих позиций на складе (Zero Dead-Ends)
 */

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../../db/schema.js";

export interface SterilizationDeductionParams {
	readonly organizationId: string;
	readonly userId?: string | null;
	readonly count?: number;
	readonly packagingType?: string | null;
	readonly indicatorType?: string | null;
	readonly cycleNumber?: number;
	readonly barcode?: string | null;
}

export interface SterilizationDeductionResult {
	readonly success: boolean;
	readonly deductedItems: Array<{
		readonly itemName: string;
		readonly quantityDeducted: number;
		readonly isOverdraft: boolean;
		readonly remainingStock: number;
	}>;
}

/**
 * Выполняет автоматическое списание расходников цикла автоклава со склада клиники.
 */
export async function executeSterilizationConsumablesDeduction(
	params: SterilizationDeductionParams,
): Promise<SterilizationDeductionResult> {
	const count = Math.max(1, params.count ?? 1);
	const orgId = params.organizationId;
	const isKraftHeatSealed =
		params.packagingType?.includes("heat") ||
		params.packagingType === "kraft_heat_sealed" ||
		params.packagingType?.includes("laminat");

	const targetPouchName = isKraftHeatSealed
		? "Пакеты комбинированные термосвариваемые (стерилизация)"
		: "Крафт-пакеты самоклеящиеся 100х200 мм";

	const targetIndicatorName = params.indicatorType?.includes("6")
		? "Индикаторы стерилизации 6 класс (DGM / Винар)"
		: "Индикаторы стерилизации 5 класс интегратор (Винар МедИС / ИнТест)";

	const itemsToDeduct = [
		{ name: targetPouchName, qty: count, category: "consumable", unit: "шт" },
		{ name: targetIndicatorName, qty: count, category: "consumable", unit: "шт" },
	];

	const deductedSummary: Array<{
		itemName: string;
		quantityDeducted: number;
		isOverdraft: boolean;
		remainingStock: number;
	}> = [];

	try {
		await db.transaction(async (tx) => {
			for (const spec of itemsToDeduct) {
				// Ищем существующий товар на складе клиники
				const [existing] = await tx
					.select()
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, orgId),
							or(
								eq(inventoryItems.name, spec.name),
								ilike(inventoryItems.name, `%${spec.name.slice(0, 15)}%`),
							),
						),
					)
					.limit(1)
					.for("update");

				let item = existing;

				// Zero Dead-Ends: если товара еще нет в номенклатуре, создаем его с нулевым балансом
				if (!item) {
					const [created] = await tx
						.insert(inventoryItems)
						.values({
							organizationId: orgId,
							name: spec.name,
							category: spec.category,
							unit: spec.unit,
							currentQty: "0",
							stockQuantity: "0",
							minQty: "20",
							criticalThreshold: "20",
							notes: "Авто-создано системой СанПиН учета стерилизации",
						})
						.returning();
					item = created;
				}

				if (!item) continue;

				const currentStock = Number(item.currentQty || item.stockQuantity || 0);
				const nextStock = currentStock - spec.qty;
				const isOverdraft = nextStock < 0;

				// Обновляем остаток в таблице товаров
				await tx
					.update(inventoryItems)
					.set({
						currentQty: String(nextStock),
						stockQuantity: String(nextStock),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(inventoryItems.id, item.id),
							eq(inventoryItems.organizationId, orgId),
						),
					);

				// Фиксируем складское движение
				const note = `[СанПиН 2.1.3678-20 / Форма 257/у] Списание при цикле автоклава${params.cycleNumber ? ` №${params.cycleNumber}` : ""}${params.barcode ? ` (${params.barcode})` : ""}`;

				await tx.insert(inventoryTransactions).values({
					organizationId: orgId,
					itemId: item.id,
					inventoryItemId: item.id,
					transactionType: isOverdraft ? "emergency_overdraft" : "auto_deduct",
					qty: String(spec.qty),
					quantityChanged: String(-spec.qty),
					isOverdraft,
					userId: params.userId ?? null,
					notes: note,
				});

				deductedSummary.push({
					itemName: item.name,
					quantityDeducted: spec.qty,
					isOverdraft,
					remainingStock: nextStock,
				});
			}
		});

		return {
			success: true,
			deductedItems: deductedSummary,
		};
	} catch (err) {
		// Мандат 8aa: Ошибки учета склада никогда не должны прерывать или валить цикл стерилизации
		console.warn("[SanPiN Sterilization Stock Deduction] Soft fallback on stock deduction error:", err);
		return {
			success: false,
			deductedItems: [],
		};
	}
}
