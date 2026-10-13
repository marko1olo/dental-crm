/**
 * autoBomDeductionEngine.ts — Automatic Background BOM Deduction & 1-Click Class B Disposal Facade.
 *
 * Front-end orchestration engine implementing:
 * 1. Automated Background BOM Deduction on visit completion (Mandate 8e / 8k / 8n):
 *    - Consumables linked to rendered 804n services deduct automatically in background.
 *    - Soft Overdraft (Mandates 8e, 8s): shortages NEVER block patient care or visit completion.
 * 2. 1-Click Batch Class B Waste Disposal (SanPiN 2.1.3684-21):
 *    - Used carpules and needles logged in 1 click at shift close without 3-person commission.
 * 3. Exact design tokens, 0 cartoon emojis, zero disabled buttons without reason.
 */

import {
	type AutoVisitBomDeductionInput,
	type AutoVisitBomDeductionResult,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";
import { showToast } from "../GlobalToast.js";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders.js";
import { useInventoryStore } from "../../store/inventoryStore.js";
import type { InventoryItem } from "./inventoryDataMappers.js";
import {
	type BatchCandidate,
	resolveFefoStockMap,
} from "./deductionModules/bomBatchMatcher.js";
import {
	type OverdraftAlertPayload,
	validateDeductionBalances,
} from "./deductionModules/bomDeductionValidator.js";
import {
	buildCabinetScopedStockMap,
	executeShiftCloseClassBWasteDisposal,
	formatShiftCloseClassBWasteActHtml,
	generateDeterministicWasteActIdentifiers,
	normalizeRenderedServices804n,
} from "./deductionModules/bomDeductionCalculator.js";
import type {
	PerformAutoVisitBomDeductionOptions,
	ShiftCloseClassBWasteInput,
	ShiftCloseClassBWasteResult,
} from "./deductionModules/bomDeductionTypes.js";

export {
	type ShiftCloseClassBWasteInput,
	type ShiftCloseClassBWasteResult,
	type PerformAutoVisitBomDeductionOptions,
	executeShiftCloseClassBWasteDisposal,
	formatShiftCloseClassBWasteActHtml,
	generateDeterministicWasteActIdentifiers,
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
};

/**
 * Automatically calculates and executes background BOM deduction for all rendered 804n services
 * of a completed treatment visit, respecting soft overdraft (Mandate 8e, 8n).
 */
export async function performAutoVisitBomDeduction(
	options: PerformAutoVisitBomDeductionOptions,
): Promise<AutoVisitBomDeductionResult> {
	// 1. Normalize rendered services into 804n format
	const normalizedServices = normalizeRenderedServices804n(options.renderedServices);

	// 2. Build room/chair scoped stock map
	const stockMap = buildCabinetScopedStockMap(
		options.warehouseItems,
		options.currentStockMap,
		{ chairId: options.chairId, cabinetId: options.cabinetId },
	);

	// 3. FEFO Batch Resolution & Expired Lot Quarantine (Mandate 8e, 8n)
	if (options.batches && options.batches.length > 0) {
		const { validStockMap } = resolveFefoStockMap(options.batches, {
			chairId: options.chairId,
			cabinetId: options.cabinetId,
			visitDate: options.visitDate,
			onExpiredBatchBlocked: options.onExpiredBatchBlocked,
		});
		for (const [itemId, qty] of Object.entries(validStockMap)) {
			stockMap[itemId] = qty;
		}
	}

	// 4. Execute background BOM deduction with soft overdraft
	const deductionInput: AutoVisitBomDeductionInput = {
		visitId: options.visitId,
		patientId: options.patientId,
		doctorId: options.doctorId,
		patientFullName: options.patientFullName,
		doctorFullName: options.doctorFullName,
		visitDate: options.visitDate,
		renderedServices: normalizedServices as any,
		currentStockMap: stockMap,
		allowOverdraft: options.allowOverdraft !== false,
		includeStandardPpe: options.includeStandardPpe !== false,
		fallbackToDefaults: true,
	};

	const result = executeAutoVisitBomDeduction(deductionInput);

	// 5. Validation and user notification (Mandate 8e / 8n: zero blockers)
	const validation = validateDeductionBalances(result.items, {
		visitId: options.visitId,
		visitNumber: options.visitNumber,
		totalCostPriceRub: result.totalCostPriceRub,
	});

	if (options.onToast) {
		options.onToast(validation.toastMessage, validation.toastType);
	} else {
		showToast(validation.toastMessage, validation.toastType);
	}

	if (validation.hasOverdraft && options.onOverdraftAlert) {
		options.onOverdraftAlert({
			visitId: options.visitId,
			visitNumber: options.visitNumber,
			message: validation.overdraftNotice,
			chairId: options.chairId,
			cabinetId: options.cabinetId,
			items: validation.overdraftItems,
		});
	}

	// 6. Asynchronous client inventoryStore update & network sync
	try {
		useInventoryStore.getState().deductStock(
			options.organizationId || "org-default",
			result.items.map((i) => ({
				inventoryItemId: i.inventoryItemId,
				itemName: i.itemName,
				quantity: i.deductedQty,
				visitId: options.visitId,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
				lotNumber: (i as any).batchId || null,
				expirationDate: (i as any).expirationDate || null,
				unitCostRub: Number((i.unitCostPriceKopecks / 100).toFixed(2)),
			})),
			{
				visitId: options.visitId,
				...(options.fetchFn ? { customFetch: options.fetchFn as any } : {}),
				allowOverdraft: options.allowOverdraft ?? true,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
			},
		).catch(() => {});

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente-inventory-reload", {
					detail: { visitId: options.visitId, organizationId: options.organizationId },
				}),
			);
		}
	} catch {
		// Non-blocking local store update
	}

	if (options.organizationId && options.fetchFn) {
		const payload = {
			visitId: options.visitId,
			visitNumber: options.visitNumber,
			chairId: options.chairId,
			cabinetId: options.cabinetId,
			userId: options.doctorId,
			transactionType: "auto_deduct",
			services: normalizedServices.map((s) => ({
				serviceId: s.serviceCode,
				quantity: s.quantity,
			})),
			items: result.items.map((i) => ({
				inventoryItemId: i.inventoryItemId,
				id: i.inventoryItemId,
				name: i.itemName,
				quantity: i.deductedQty,
				unitCostRub: Number((i.unitCostPriceKopecks / 100).toFixed(2)),
				reason: `Автосписание по визиту ${options.visitNumber || options.visitId}`,
				lotNumber: (i as any).batchId || null,
				expirationDate: (i as any).expirationDate || null,
			})),
			allowOverdraft: true,
			paperJournalAcknowledged: true,
		};

		try {
			const hasSpecificOrg = options.organizationId && options.organizationId !== "org-default";
			const deductEndpoint = hasSpecificOrg
				? `/api/inventory/${options.organizationId}/deduct/visit`
				: `/api/inventory/deduct/visit`;

			options
				.fetchFn(deductEndpoint, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify(payload),
				})
				.catch((err) => {
					console.warn("[autoBomDeduction] Фоновая синхронизация списания с сервером отложена:", err);
				});

			if (validation.hasOverdraft) {
				const alertEndpoint = hasSpecificOrg
					? `/api/inventory/${options.organizationId}/overdraft-alert`
					: `/api/inventory/overdraft-alert`;

				options
					.fetchFn(alertEndpoint, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
						body: JSON.stringify({
							visitId: options.visitId,
							visitNumber: options.visitNumber,
							chairId: options.chairId,
							cabinetId: options.cabinetId,
							message: validation.overdraftNotice,
							items: validation.overdraftItems.map((i) => ({
								itemId: i.inventoryItemId,
								itemName: i.itemName,
								deficitQty: i.deficitQty,
							})),
						}),
					})
					.catch(() => {});
			}
		} catch {
			// Never block clinical hot path on background network issues
		}
	}

	return result;
}
