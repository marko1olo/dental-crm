/**
 * treatmentConsumableDeductionService.ts — Service for procedure consumable auto-deductions.
 *
 * Implements Mandate 8e (Doctor Autonomy):
 * - clamp_at_zero = true (Soft overdraft: zeroes remaining stock in DB, logs shortage warning, NEVER blocks visit completion)
 * - Idempotency guaranteed via unique treatment_reference_id in treatment_consumable_deductions table.
 * - Deadlock-free locking: acquires SELECT ... FOR UPDATE in deterministic item ID order.
 */

import {
	type TreatmentConsumableDeductionRecord,
	type TreatmentConsumableDeductionRequest,
	type TreatmentConsumableDeductionResponse,
	type TreatmentConsumableDeductionWarning,
} from "@dental/shared";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import {
	inventoryItems,
	inventoryTransactions,
	procedureMaterialRules,
	treatmentConsumableDeductions,
	treatmentConsumables,
} from "../db/schema.js";

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

		// Material aggregation: inventoryItemId -> required total quantity
		const requiredByItem = new Map<string, number>();

		for (const mapping of mappings) {
			const procedureCount = codeQuantities.get(mapping.catalogItemCode) ?? 1;
			const unitNorm = Number(mapping.quantity) || 1;
			const totalNeeded = unitNorm * procedureCount;

			requiredByItem.set(
				mapping.inventoryItemId,
				(requiredByItem.get(mapping.inventoryItemId) ?? 0) + totalNeeded,
			);
		}

		// Fallback to procedureMaterialRules if no custom treatmentConsumables links found
		if (requiredByItem.size === 0) {
			const fallbackRules = await db
				.select()
				.from(procedureMaterialRules)
				.where(
					and(
						eq(procedureMaterialRules.organizationId, organizationId),
						inArray(procedureMaterialRules.serviceCode, catalogCodes),
					),
				);

			for (const rule of fallbackRules) {
				const targetItemId = rule.inventoryItemId ?? rule.materialItemId;
				if (!targetItemId) continue;
				const procedureCount = codeQuantities.get(rule.serviceCode ?? "") ?? 1;
				const unitNorm = Number(rule.quantityToDeduct ?? rule.requiredQty ?? 1);
				const totalNeeded = unitNorm * procedureCount;

				requiredByItem.set(
					targetItemId,
					(requiredByItem.get(targetItemId) ?? 0) + totalNeeded,
				);
			}
		}

		const itemIds = Array.from(requiredByItem.keys()).sort();
		if (itemIds.length === 0) {
			// No consumables configured for these codes
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
			const lockedItems = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						inArray(inventoryItems.id, itemIds),
					),
				)
				.orderBy(asc(inventoryItems.id))
				.for("update");

			for (const item of lockedItems) {
				const requestedQty = requiredByItem.get(item.id) ?? 0;
				if (requestedQty <= 0) continue;

				const currentQty = Number(item.currentQty ?? item.stockQuantity ?? 0);
				const unitCostRub = Number(item.unitCostRub ?? item.pricePerUnit ?? 0);

				let stockAfter: number;
				let deficit = 0;
				let isDeficit = false;

				if (currentQty < requestedQty) {
					hasOverdraft = true;
					isDeficit = true;
					deficit = requestedQty - Math.max(0, currentQty);

					if (clampAtZero) {
						// Mandate 8e: clamp remaining stock to 0 so we don't block doctor,
						// but clearly register deficit warning.
						stockAfter = 0;
					} else {
						// Soft overdraft: allow negative balance
						stockAfter = currentQty - requestedQty;
					}

					warnings.push({
						type: "deficit",
						message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${item.name}» (в наличии ${currentQty}, требовалось ${requestedQty}, дефицит ${deficit} ${item.unit}). Приём проведён без блокировки врача.`,
						inventoryItemId: item.id,
						itemName: item.name,
						deficit,
					});
				} else {
					stockAfter = currentQty - requestedQty;
				}

				// Update inventory item stock in DB
				await tx
					.update(inventoryItems)
					.set({
						currentQty: stockAfter.toFixed(3),
						stockQuantity: stockAfter.toFixed(3),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(inventoryItems.organizationId, organizationId),
							eq(inventoryItems.id, item.id),
						),
					);

				// Insert movement ledger transaction
				await tx.insert(inventoryTransactions).values({
					organizationId,
					itemId: item.id,
					inventoryItemId: item.id,
					visitId: request.visit_id ? (request.visit_id as unknown as string) : null,
					transactionType: "auto_deduct",
					qty: (-requestedQty).toFixed(3),
					quantityChanged: (-requestedQty).toFixed(3),
					unitCostRub: unitCostRub.toFixed(2),
					isOverdraft: isDeficit,
					userId: request.doctor_id ? (request.doctor_id as unknown as string) : null,
					notes: `Автосписание расходников по процедурам (ref: ${refId})${
						isDeficit ? ` [Мягкий овердрафт: дефицит ${deficit} ${item.unit}]` : ""
					}`,
				});

				deductions.push({
					inventoryItemId: item.id,
					itemName: item.name,
					quantityRequested: requestedQty,
					quantityDeducted: requestedQty,
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
