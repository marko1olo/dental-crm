/**
 * @file deductionEngine.ts
 * Атомарное транзакционное списание партий в PostgreSQL 18 через Drizzle,
 * обработка дефицита, мягкий фоновый овердрафт без блокировки врача, запись в аудит-лог.
 */

import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	procedureTechCardItems,
	procedureTechCards,
	stockBatches,
} from "../../../db/schema/inventory.js";
import { serviceCatalogItems } from "../../../db/schema/clinical.js";
import { DEFAULT_804N_CONSUMABLE_LINKS } from "@dental/shared";
import { DEFAULT_804N_BOM_SEEDS } from "../defaultBomSeeds.js";
import { InsufficientStockError } from "../materialDeduction.js";
import type {
	DbTransaction,
	DeductFefoParams,
	DeductForProcedureParams,
	DeductForProcedureResult,
	FefoBatchUsage,
	FefoDeductionResult,
	ReceiveBatchInput,
	WriteOffResult,
	WriteOffScrapInput,
} from "./types.js";
import { getDefaultExpirationDate, normalizeDateToIso } from "./dateUtils.js";
import { findNextActiveBatchInfo, selectActiveBatchesForFefo } from "./batchSelector.js";

/**
 * Списание материала со склада по регламенту FEFO (First Expired, First Out).
 * Инварианты:
 * 1. Первыми списываются партии с наиболее ранним сроком годности (expiration_date ASC).
 * 2. При нехватке остатка на складе (дефицит): если allowOverdraft = true (по умолчанию),
 *    списание НЕ блокирует клиническую операцию, а списывает в дефицит с отметкой is_overdraft = true
 *    и формирует алерт службе снабжения.
 */
export async function deductFefo(
	tx: DbTransaction,
	params: DeductFefoParams,
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
	let [inv] = await tx
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
		if (allowOverdraft !== false) {
			const isUuid =
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
					inventoryItemId,
				);
			const [created] = await tx
				.insert(inventoryItems)
				.values({
					...(isUuid ? { id: inventoryItemId } : {}),
					organizationId,
					name: `Материал ${inventoryItemId}`,
					stockQuantity: "0",
					currentQty: "0",
					criticalThreshold: "0",
					unitCostRub: "0",
				})
				.returning();
			inv = created;
		} else {
			throw new Error(`Материал с ID ${inventoryItemId} не найден на складе клиники.`);
		}
	}

	if (!inv) {
		throw new Error(`Материал с ID ${inventoryItemId} не найден на складе клиники.`);
	}

	// 2. Получаем активные партии данного материала, отсортированные по сроку годности (FEFO)
	const activeBatches = await selectActiveBatchesForFefo(tx, {
		organizationId,
		inventoryItemId,
		warehouseId,
	});

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

	// 3. Обработка остатка потребности (списание с непартионного остатка карточки или дефицит/овердрафт)
	if (needed > 0) {
		const alreadyDeductedFromBatches = requiredQty - needed;
		const availableUnbatched = Math.max(0, currentStock - alreadyDeductedFromBatches);
		const unbatchedDeduct = Math.min(needed, availableUnbatched);
		const trueDeficit = Number((needed - unbatchedDeduct).toFixed(4));

		if (unbatchedDeduct > 0) {
			transactionsToInsert.push({
				organizationId,
				visitId: visitId ?? null,
				itemId: inv.id,
				inventoryItemId: inv.id,
				batchId: null,
				warehouseId: warehouseId ?? null,
				quantityChanged: String(-unbatchedDeduct),
				unitCostRub: inv.unitCostRub ?? null,
				transactionType,
				isOverdraft: false,
				userId: userId ?? null,
				notes: notes ?? (visitId ? `Списание по визиту ${visitId} (остаток номенклатуры)` : null),
			});
		}

		if (trueDeficit > 0) {
			deficitQty = trueDeficit;
			if (allowOverdraft === false) {
				throw new InsufficientStockError({
					inventoryItemId: inv.id,
					inventoryItemName: inv.name,
					availableStock: requiredQty - trueDeficit,
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
				notes: notes
					? `${notes} (дефицит ${deficitQty} ед.)`
					: `Технический перерасход при оказании помощи (дефицит ${deficitQty} ед.)`,
			});
		}
	}

	// 4. Обновляем итоговый баланс номенклатуры и синхронизируем актуальную партию/срок годности
	const nextActiveBatch = await findNextActiveBatchInfo(tx, organizationId, inv.id);

	await tx
		.update(inventoryItems)
		.set({
			stockQuantity: String(newStock),
			currentQty: String(newStock),
			lotNumber: nextActiveBatch ? nextActiveBatch.batchNumber : (newStock <= 0 ? null : inv.lotNumber),
			expirationDate: nextActiveBatch ? nextActiveBatch.expirationDate : (newStock <= 0 ? null : inv.expirationDate),
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
export async function receiveBatch(
	tx: DbTransaction,
	input: ReceiveBatchInput,
): Promise<typeof stockBatches.$inferSelect> {
	const {
		organizationId,
		inventoryItemId,
		warehouseId,
		batchNumber: rawBatchNumber,
		expirationDate: rawExpirationDate,
		manufactureDate: rawManufactureDate,
		quantity,
		purchasePricePerUnit,
		barcode,
		userId,
		notes,
	} = input;

	if (quantity <= 0) {
		throw new Error("Количество приходуемой партии должно быть положительным числом.");
	}

	const batchNumber =
		(rawBatchNumber && rawBatchNumber.trim()) ||
		`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
	const expirationDate =
		normalizeDateToIso(rawExpirationDate) || getDefaultExpirationDate();
	const manufactureDate = normalizeDateToIso(rawManufactureDate);

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

	// 2. Ликвидация вечного овердрафта (Мандаты 8e, 8n):
	// Если материал ранее списывался под экстренную операцию при нулевом остатке
	// (мягкий минусовой овердрафт до прихода накладной снабженца), поступившая партия
	// сначала закрывает накопленный дефицит, а остаток переходит в доступные запасы.
	const currentStock = Number(inv.stockQuantity ?? inv.currentQty ?? 0);
	const deficit = currentStock < 0 ? Math.abs(currentStock) : 0;
	const remainingInBatch = Math.max(
		0,
		Number((quantity - deficit).toFixed(3)),
	);
	const isDepletedByDeficit = remainingInBatch <= 0;

	// 3. Создаем партию FEFO
	const [createdBatch] = await tx
		.insert(stockBatches)
		.values({
			organizationId,
			warehouseId: warehouseId ?? null,
			inventoryItemId,
			batchNumber,
			expirationDate,
			manufactureDate: manufactureDate ?? null,
			initialQty: String(quantity),
			remainingQty: String(remainingInBatch),
			purchasePricePerUnit:
				purchasePricePerUnit != null ? String(purchasePricePerUnit) : null,
			status: isDepletedByDeficit ? "depleted" : "active",
			barcode: barcode?.trim() || null,
		})
		.returning();

	if (!createdBatch) {
		throw new Error("Не удалось сохранить партию в базе данных.");
	}

	// 4. Увеличиваем общий остаток номенклатуры
	const newStock = Number((currentStock + quantity).toFixed(3));

	// Если срок партии ближе, чем текущий срок в карточке, или текущий срок пуст — обновляем его
	const shouldUpdateCardDate =
		!inv.expirationDate || expirationDate < inv.expirationDate;

	await tx
		.update(inventoryItems)
		.set({
			stockQuantity: String(newStock),
			currentQty: String(newStock),
			lotNumber: shouldUpdateCardDate ? batchNumber : inv.lotNumber,
			expirationDate: shouldUpdateCardDate
				? expirationDate
				: inv.expirationDate,
			unitCostRub:
				purchasePricePerUnit != null
					? String(purchasePricePerUnit)
					: inv.unitCostRub,
			updatedAt: new Date(),
		})
		.where(eq(inventoryItems.id, inv.id));

	// 5. Фиксируем приходную транзакцию
	const transactionNote =
		deficit > 0
			? `${notes ? `${notes} • ` : ""}Поступление партии ${batchNumber} (${quantity} ед., закрыт технический дефицит ${deficit} ед.)`
			: (notes ?? `Поступление партии ${batchNumber} (${quantity} ед.)`);

	await tx.insert(inventoryTransactions).values({
		organizationId,
		itemId: inv.id,
		inventoryItemId: inv.id,
		batchId: createdBatch.id,
		warehouseId: warehouseId ?? null,
		quantityChanged: String(quantity),
		unitCostRub:
			purchasePricePerUnit != null
				? String(purchasePricePerUnit)
				: inv.unitCostRub,
		transactionType: "receipt",
		userId: userId ?? null,
		notes: transactionNote,
	});

	return createdBatch;
}

/**
 * Списание просроченных или бракованных материалов по акту утилизации (ТОРГ-16).
 * СНЯТ ОШИБОЧНЫЙ ЗАПРЕТ: списание просроченных материалов в актах утилизации прямо разрешено!
 */
export async function writeOffExpiredOrScrap(
	tx: DbTransaction,
	input: WriteOffScrapInput,
): Promise<WriteOffResult> {
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
export async function deductForProcedure(
	tx: DbTransaction,
	params: DeductForProcedureParams,
): Promise<DeductForProcedureResult> {
	const {
		organizationId,
		serviceQuantity = 1,
		warehouseId,
		visitId,
		userId,
		allowOverdraft = true,
		transactionType = "procedure_bom_deduct",
		notes,
	} = params;
	const serviceId = params.serviceId ?? params.serviceIdOrCode ?? "";

	// 1. Ищем техкарту процедуры в procedure_tech_cards
	const isUuid =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			serviceId,
		);

	let serviceCode = serviceId;
	let serviceTitle = "";
	let order804nCode = "";
	if (isUuid) {
		const [catalogItem] = await tx
			.select({
				code: serviceCatalogItems.code,
				title: serviceCatalogItems.title,
				order804nCode: serviceCatalogItems.order804nCode,
			})
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.id, serviceId),
					eq(serviceCatalogItems.organizationId, organizationId),
				),
			)
			.limit(1);
		if (catalogItem) {
			serviceCode = catalogItem.code;
			serviceTitle = catalogItem.title;
			order804nCode = catalogItem.order804nCode ?? "";
		}
	}

	const techCardCond = isUuid
		? and(
				eq(procedureTechCards.organizationId, organizationId),
				or(
					eq(procedureTechCards.serviceId, serviceId),
					eq(procedureTechCards.serviceCode, serviceId),
					...(serviceCode !== serviceId ? [eq(procedureTechCards.serviceCode, serviceCode)] : []),
					...(order804nCode ? [eq(procedureTechCards.serviceCode, order804nCode)] : []),
				),
				eq(procedureTechCards.status, "active"),
			)
		: and(
				eq(procedureTechCards.organizationId, organizationId),
				eq(procedureTechCards.serviceCode, serviceId),
				eq(procedureTechCards.status, "active"),
			);

	const [techCard] = await tx
		.select()
		.from(procedureTechCards)
		.where(techCardCond)
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
		const ruleCond = isUuid
			? and(
					or(
						eq(procedureMaterialRules.serviceId, serviceId),
						eq(procedureMaterialRules.serviceCode, serviceId),
						...(serviceCode !== serviceId ? [eq(procedureMaterialRules.serviceCode, serviceCode)] : []),
						...(order804nCode ? [eq(procedureMaterialRules.serviceCode, order804nCode)] : []),
					),
					or(
						eq(procedureMaterialRules.organizationId, organizationId),
						isNull(procedureMaterialRules.organizationId),
					),
				)
			: and(
					eq(procedureMaterialRules.serviceCode, serviceId),
					or(
						eq(procedureMaterialRules.organizationId, organizationId),
						isNull(procedureMaterialRules.organizationId),
					),
				);

		const rules = await tx
			.select()
			.from(procedureMaterialRules)
			.where(ruleCond);

		itemsToDeduct = rules
			.filter((r) => r.inventoryItemId || r.materialItemId)
			.map((r) => ({
				inventoryItemId: (r.inventoryItemId ?? r.materialItemId)!,
				quantity: Number(r.quantityToDeduct ?? r.requiredQty ?? 1) * serviceQuantity,
			}));
	}

	// Если в БД техкарты еще не заведены, проверяем дефолтные технологические карты 804н (BOM Seeds)
	if (itemsToDeduct.length === 0) {
		const safeServiceId = (serviceId || "").toLowerCase();
		const proto = DEFAULT_804N_BOM_SEEDS.find(
			(s) =>
				s.serviceCode === serviceCode ||
				(order804nCode && s.serviceCode === order804nCode) ||
				(serviceTitle && s.serviceTitle?.toLowerCase() === serviceTitle.toLowerCase()) ||
				(serviceTitle && s.serviceTitle && serviceTitle.toLowerCase().includes(s.serviceTitle.toLowerCase())) ||
				s.serviceCode === serviceId ||
				(safeServiceId && s.serviceTitle?.toLowerCase() === safeServiceId),
		);

		if (proto) {
			for (const mat of proto.materials) {
				const [existing] = await tx
					.select({ id: inventoryItems.id })
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, organizationId),
							sql`lower(${inventoryItems.name}) = lower(${mat.name})`,
						),
					)
					.limit(1);

				let targetItemId = existing?.id;
				if (!targetItemId) {
					const [created] = await tx
						.insert(inventoryItems)
						.values({
							organizationId,
							name: mat.name,
							category: mat.category,
							unit: mat.unit,
							stockQuantity: "0",
							currentQty: "0",
							criticalThreshold: String(mat.criticalThreshold),
							unitCostRub: String(mat.defaultUnitCostRub),
						})
						.returning({ id: inventoryItems.id });
					targetItemId = created?.id;
				}

				if (targetItemId) {
					itemsToDeduct.push({
						inventoryItemId: targetItemId,
						quantity: mat.quantityToDeduct * serviceQuantity,
					});
				}
			}
		} else {
			// Резервный поиск в каноническом каталоге DEFAULT_804N_CONSUMABLE_LINKS (@dental/shared)
			const matchingLinks = DEFAULT_804N_CONSUMABLE_LINKS.filter(
				(l) =>
					l.service804nCode === serviceCode ||
					(order804nCode && l.service804nCode === order804nCode) ||
					(serviceTitle && l.serviceTitle?.toLowerCase() === serviceTitle.toLowerCase()) ||
					l.service804nCode === serviceId,
			);

			for (const link of matchingLinks) {
				const [existing] = await tx
					.select({ id: inventoryItems.id })
					.from(inventoryItems)
					.where(
						and(
							eq(inventoryItems.organizationId, organizationId),
							or(
								eq(inventoryItems.id, link.inventoryItemId),
								sql`lower(${inventoryItems.name}) = lower(${link.itemName})`,
							),
						),
					)
					.limit(1);

				let targetItemId = existing?.id;
				if (!targetItemId) {
					const isLinkUuid =
						/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
							link.inventoryItemId,
						);
					const [created] = await tx
						.insert(inventoryItems)
						.values({
							...(isLinkUuid ? { id: link.inventoryItemId } : {}),
							organizationId,
							name: link.itemName,
							category: link.category,
							unit: link.unit,
							stockQuantity: "0",
							currentQty: "0",
							criticalThreshold: "5",
							unitCostRub: String((link.costPriceKopecks / 100).toFixed(2)),
						})
						.returning({ id: inventoryItems.id });
					targetItemId = created?.id;
				}

				if (targetItemId) {
					itemsToDeduct.push({
						inventoryItemId: targetItemId,
						quantity: link.quantityPerService * serviceQuantity,
					});
				}
			}
		}
	}

	if (itemsToDeduct.length === 0) {
		const emptyResults = Object.assign([] as FefoDeductionResult[], {
			totalMaterials: 0,
			hasOverdraft: false,
		});
		return emptyResults;
	}

	// Сортировка ID для предотвращения взаимных блокировок (Row Lock Ordering Deadlock)
	const sortedItems = [...itemsToDeduct].sort((a, b) =>
		a.inventoryItemId.localeCompare(b.inventoryItemId),
	);

	const results: FefoDeductionResult[] = [];

	for (const it of sortedItems) {
		const res = await deductFefo(tx, {
			organizationId,
			inventoryItemId: it.inventoryItemId,
			requiredQty: it.quantity,
			warehouseId: warehouseId ?? undefined,
			visitId: visitId ?? undefined,
			userId: userId ?? undefined,
			allowOverdraft,
			transactionType,
			notes,
		});
		results.push(res);
	}

	return Object.assign(results, {
		totalMaterials: results.length,
		hasOverdraft: results.some((r) => r.isOverdraft),
	});
}

/**
 * Сервис складского учета и списания медикаментов по алгоритму FEFO.
 */
export class FefoStockService {
	public deductFefo(
		tx: DbTransaction,
		params: DeductFefoParams,
	): Promise<FefoDeductionResult> {
		return deductFefo(tx, params);
	}

	public receiveBatch(
		tx: DbTransaction,
		input: ReceiveBatchInput,
	): Promise<typeof stockBatches.$inferSelect> {
		return receiveBatch(tx, input);
	}

	public writeOffExpiredOrScrap(
		tx: DbTransaction,
		input: WriteOffScrapInput,
	): Promise<WriteOffResult> {
		return writeOffExpiredOrScrap(tx, input);
	}

	public deductForProcedure(
		tx: DbTransaction,
		params: DeductForProcedureParams,
	): Promise<DeductForProcedureResult> {
		return deductForProcedure(tx, params);
	}
}

export const fefoStockService = new FefoStockService();
