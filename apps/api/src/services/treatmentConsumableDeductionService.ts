/**
 * treatmentConsumableDeductionService.ts — Service for procedure consumable auto-deductions.
 *
 * Implements Mandate 8e (Doctor Autonomy):
 * - clamp_at_zero = true (Soft overdraft: zeroes remaining stock in DB, logs shortage warning, NEVER blocks visit completion)
 * - Idempotency guaranteed via unique treatment_reference_id in treatment_consumable_deductions table.
 * - Deadlock-free locking: acquires SELECT ... FOR UPDATE in deterministic item ID order.
 * - FEFO batch deduction and OKEI unit conversions for chairside clinical protocol.
 */

import {
	CANONICAL_PROCEDURE_RECIPES,
	type TreatmentConsumableDeductionRecord,
	type TreatmentConsumableDeductionRequest,
	type TreatmentConsumableDeductionResponse,
	type TreatmentConsumableDeductionWarning,
	convertInventoryUnit,
} from "@dental/shared";
import { and, asc, eq, inArray, isNull, or, type SQL, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentConsumableDeductions,
	treatmentConsumables,
} from "../db/schema.js";
import { DEFAULT_804N_BOM_SEEDS } from "./inventory/defaultBomSeeds.js";
import { fefoStockService } from "./inventory/fefoStockService.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class TreatmentConsumableDeductionService {
	/**
	 * Executes a consumable deduction for clinical procedures.
	 * Guaranteed idempotent: if treatment_reference_id was already processed, returns previous result.
	 */
	static async applyDeduction(
		organizationId: string,
		request: TreatmentConsumableDeductionRequest,
	): Promise<TreatmentConsumableDeductionResponse> {
		const refId = request.treatment_reference_id.trim();

		// 1. Check idempotency log
		const existingLog = await db
			.select()
			.from(treatmentConsumableDeductions)
			.where(
				and(
					eq(treatmentConsumableDeductions.organizationId, organizationId),
					eq(treatmentConsumableDeductions.treatmentReferenceId, refId),
				),
			)
			.limit(1);

		if (existingLog.length > 0 && existingLog[0]) {
			const record = existingLog[0];
			const previousDeductions = Array.isArray(record.deductions)
				? (record.deductions as unknown as TreatmentConsumableDeductionRecord[])
				: [];
			const previousWarnings = Array.isArray(record.warnings)
				? (record.warnings as unknown as TreatmentConsumableDeductionWarning[])
				: [];

			return {
				success: true,
				treatmentReferenceId: refId,
				isOverdraft: Boolean(record.isOverdraft),
				alreadyProcessed: true,
				deductions: previousDeductions,
				warnings: [
					...previousWarnings,
					{
						type: "already_processed",
						message: `Списание по treatment_reference_id «${refId}» уже было выполнено ранее (повторный вызов проигнорирован).`,
					},
				],
			};
		}

		// 2. Extract catalog codes and procedure counts
		const codeQuantities = new Map<string, number>();

		if (request.items && request.items.length > 0) {
			for (const item of request.items) {
				const code = item.catalogItemCode.trim();
				const count = item.count > 0 ? item.count : 1;
				codeQuantities.set(code, (codeQuantities.get(code) ?? 0) + count);
			}
		}

		if (request.catalog_item_codes && request.catalog_item_codes.length > 0) {
			for (const rawCode of request.catalog_item_codes) {
				const code = rawCode.trim();
				codeQuantities.set(code, (codeQuantities.get(code) ?? 0) + 1);
			}
		}

		const catalogCodes = Array.from(codeQuantities.keys());
		if (catalogCodes.length === 0) {
			return {
				success: true,
				treatmentReferenceId: refId,
				isOverdraft: false,
				alreadyProcessed: false,
				deductions: [],
				warnings: [
					{
						type: "low_stock",
						message: "В запросе не указаны коды медицинских услуг для списания расходников.",
					},
				],
			};
		}

		// 3. Find consumable mappings from treatment_consumables
		const mappings = await db
			.select()
			.from(treatmentConsumables)
			.where(
				and(
					eq(treatmentConsumables.organizationId, organizationId),
					inArray(treatmentConsumables.catalogItemCode, catalogCodes),
				),
			);

		// Material aggregation: target key -> { quantity, unit, name }
		const requiredByItem = new Map<string, { quantity: number; unit: string; name?: string | undefined }>();

		for (const mapping of mappings) {
			const procedureCount = codeQuantities.get(mapping.catalogItemCode) ?? 1;
			const unitNorm = Number(mapping.quantity) || 1;
			const totalNeeded = unitNorm * procedureCount;

			const existing = requiredByItem.get(mapping.inventoryItemId);
			if (existing) {
				existing.quantity += totalNeeded;
			} else {
				requiredByItem.set(mapping.inventoryItemId, {
					quantity: totalNeeded,
					unit: "pcs",
				});
			}
		}

		// Fallback to procedureMaterialRules if no custom treatmentConsumables links found
		if (requiredByItem.size === 0) {
			const fallbackRules = await db
				.select()
				.from(procedureMaterialRules)
				.where(
					and(
						or(
							eq(procedureMaterialRules.organizationId, organizationId),
							isNull(procedureMaterialRules.organizationId),
						),
						inArray(procedureMaterialRules.serviceCode, catalogCodes),
					),
				);

			for (const rule of fallbackRules) {
				const targetItemId = rule.inventoryItemId ?? rule.materialItemId;
				if (!targetItemId) continue;
				const procedureCount = codeQuantities.get(rule.serviceCode ?? "") ?? 1;
				const unitNorm = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
				const totalNeeded = unitNorm * procedureCount;

				const existing = requiredByItem.get(targetItemId);
				if (existing) {
					existing.quantity += totalNeeded;
				} else {
					requiredByItem.set(targetItemId, {
						quantity: totalNeeded,
						unit: rule.unit || "pcs",
						...(rule.materialName ? { name: rule.materialName } : {}),
					});
				}
			}
		}

		// Fallback to statutory canonical recipes and seeds if still empty
		if (requiredByItem.size === 0) {
			for (const code of catalogCodes) {
				const procedureCount = codeQuantities.get(code) ?? 1;

				const recipe = CANONICAL_PROCEDURE_RECIPES.find(
					(r) => r.code804n === code || r.aliases804n.includes(code),
				);

				if (recipe && recipe.items.length > 0) {
					for (const item of recipe.items) {
						const needed = item.standardQuantity * procedureCount;
						const existing = requiredByItem.get(item.inventoryItemId);
						if (existing) {
							existing.quantity += needed;
						} else {
							requiredByItem.set(item.inventoryItemId, {
								quantity: needed,
								unit: item.unit,
								name: item.nameRu,
							});
						}
					}
					continue;
				}

				const seed = DEFAULT_804N_BOM_SEEDS.find((s) => s.serviceCode === code);
				if (seed && seed.materials.length > 0) {
					for (const mat of seed.materials) {
						const needed = mat.quantityToDeduct * procedureCount;
						const existing = requiredByItem.get(mat.name);
						if (existing) {
							existing.quantity += needed;
						} else {
							requiredByItem.set(mat.name, {
								quantity: needed,
								unit: mat.unit,
								name: mat.name,
							});
						}
					}
				}
			}
		}

		if (requiredByItem.size === 0) {
			return {
				success: true,
				treatmentReferenceId: refId,
				isOverdraft: false,
				alreadyProcessed: false,
				deductions: [],
				warnings: [],
			};
		}

		const clampAtZero = request.clamp_at_zero !== false;
		let hasOverdraft = false;
		const deductions: TreatmentConsumableDeductionRecord[] = [];
		const warnings: TreatmentConsumableDeductionWarning[] = [];

		// 4. Atomic transaction with SELECT ... FOR UPDATE in sorted order (deadlock-free)
		await withTenantCtx(organizationId, async (tx) => {
			const rawKeys = Array.from(requiredByItem.keys());
			const uuidKeys = rawKeys.filter((k) => UUID_REGEX.test(k));
			const nonUuidKeys = rawKeys.filter((k) => !UUID_REGEX.test(k));

			const findConditions: Array<SQL<unknown>> = [];
			if (uuidKeys.length > 0) findConditions.push(inArray(inventoryItems.id, uuidKeys));
			if (nonUuidKeys.length > 0) {
				findConditions.push(
					inArray(inventoryItems.sku, nonUuidKeys),
					inArray(inventoryItems.barcode, nonUuidKeys),
					inArray(inventoryItems.name, nonUuidKeys),
				);
			}

			const existingItems = findConditions.length > 0
				? await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.organizationId, organizationId),
								or(...findConditions),
							),
						)
				: [];

			const keyToItemMap = new Map<string, typeof inventoryItems.$inferSelect>();

			for (const key of rawKeys) {
				const isUuid = UUID_REGEX.test(key);
				let matched = existingItems.find(
					(row) =>
						(isUuid && row.id === key) ||
						row.sku === key ||
						row.barcode === key ||
						row.name === key,
				);

				if (!matched) {
					// Auto-create missing item on-the-fly (Mandate 8e, 8n Zero Dead-Ends)
					const entry = requiredByItem.get(key);
					const fallbackName = entry?.name || (isUuid ? `Материал ${key}` : key);

					const [created] = await tx
						.insert(inventoryItems)
						.values({
							...(isUuid ? { id: key } : {}),
							organizationId,
							sku: isUuid ? null : key,
							name: fallbackName,
							unit: entry?.unit || "шт",
							stockQuantity: "0",
							currentQty: "0",
							criticalThreshold: "0",
							unitCostRub: "0",
						})
						.returning();

					matched = created;
				}

				if (matched) {
					keyToItemMap.set(key, matched);
				}
			}

			// Deterministic sorted locking by UUID (deadlock-free)
			const resolvedUuids = Array.from(
				new Set(Array.from(keyToItemMap.values()).map((it) => it.id)),
			).sort();

			const lockedItems = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						inArray(inventoryItems.id, resolvedUuids),
					),
				)
				.orderBy(asc(inventoryItems.id))
				.for("update");

			const lockedById = new Map(lockedItems.map((row) => [row.id, row]));

			for (const [key, req] of requiredByItem.entries()) {
				const rawItem = keyToItemMap.get(key);
				if (!rawItem) continue;
				const item = lockedById.get(rawItem.id);
				if (!item) continue;

				const ruleUnit = req.unit || item.unit || "pcs";
				const invUnit = item.unit || "pcs";
				const convertedRequestedQty = convertInventoryUnit(req.quantity, ruleUnit, invUnit);
				if (convertedRequestedQty <= 0) continue;

				const currentQty = Number(item.currentQty ?? item.stockQuantity ?? 0);
				const unitCostRub = Number(item.unitCostRub ?? item.pricePerUnit ?? 0);

				let stockAfter: number;
				let deficit = 0;
				let isDeficit = false;

				if (currentQty < convertedRequestedQty) {
					hasOverdraft = true;
					isDeficit = true;
					deficit = convertedRequestedQty - Math.max(0, currentQty);

					if (clampAtZero) {
						stockAfter = 0;
					} else {
						stockAfter = currentQty - convertedRequestedQty;
					}

					warnings.push({
						type: "deficit",
						message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${item.name}» (в наличии ${currentQty}, требовалось ${convertedRequestedQty}, дефицит ${deficit} ${item.unit}). Приём проведён без блокировки врача.`,
						inventoryItemId: item.id,
						itemName: item.name,
						deficit,
					});
				} else {
					stockAfter = currentQty - convertedRequestedQty;
				}

				// Execute FEFO batch deduction
				await fefoStockService.deductFefo(tx as any, {
					organizationId,
					inventoryItemId: item.id,
					requiredQty: convertedRequestedQty,
					visitId: request.visit_id ? String(request.visit_id) : null,
					userId: request.doctor_id ? String(request.doctor_id) : null,
					allowOverdraft: true,
					transactionType: "auto_deduct",
					notes: `Автосписание расходников по процедурам (ref: ${refId})${
						isDeficit ? ` [Мягкий овердрафт: дефицит ${deficit} ${item.unit}]` : ""
					}`,
				});

				// If clampAtZero is true, synchronize remaining stock to 0 in inventoryItems
				if (clampAtZero && stockAfter === 0 && currentQty < convertedRequestedQty) {
					await tx
						.update(inventoryItems)
						.set({
							currentQty: "0",
							stockQuantity: "0",
							updatedAt: new Date(),
						})
						.where(eq(inventoryItems.id, item.id));
				}

				deductions.push({
					inventoryItemId: item.id,
					itemName: item.name,
					quantityRequested: convertedRequestedQty,
					quantityDeducted: convertedRequestedQty,
					stockBefore: currentQty,
					stockAfter,
					deficit,
					isDeficit,
					unit: item.unit ?? "шт",
					unitCostRub,
				});
			}

			// Record in treatment_consumable_deductions ledger for idempotency
			await tx.insert(treatmentConsumableDeductions).values({
				organizationId,
				treatmentReferenceId: refId,
				visitId: request.visit_id ? (request.visit_id as unknown as string) : null,
				doctorId: request.doctor_id ? (request.doctor_id as unknown as string) : null,
				status: "completed",
				isOverdraft: hasOverdraft,
				deductions: deductions as unknown as Record<string, unknown>[],
				warnings: warnings as unknown as Record<string, unknown>[],
				notes: request.notes ?? null,
			});
		});

		return {
			success: true,
			treatmentReferenceId: refId,
			isOverdraft: hasOverdraft,
			alreadyProcessed: false,
			deductions,
			warnings,
		};
	}
}
