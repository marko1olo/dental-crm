import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";
import type { AutoVisitBomDeductionResult } from "@dental/shared";
import type { PerformAutoVisitBomDeductionOptions } from "./bomDeductionTypes.js";
import type { DeductionValidationSummary } from "./bomDeductionValidator.js";

export function syncAutoBomDeduction(
	options: PerformAutoVisitBomDeductionOptions,
	result: AutoVisitBomDeductionResult,
	normalizedServices: readonly any[],
	validation: DeductionValidationSummary,
) {
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
				? `/api/inventory/${options.organizationId}/auto-bom-deduct`
				: `/api/inventory/auto-bom-deduct`;

			options.fetchFn(deductEndpoint, {
				method: "POST",
				headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
				body: JSON.stringify(payload),
			}).catch((err) => {
				console.warn("[autoBomDeduction] Фоновая синхронизация списания с сервером отложена:", err);
			});

			if (validation.hasOverdraft) {
				const alertEndpoint = hasSpecificOrg
					? `/api/inventory/${options.organizationId}/overdraft-alert`
					: `/api/inventory/overdraft-alert`;

				options.fetchFn(alertEndpoint, {
					method: "POST",
					headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/json" }),
					body: JSON.stringify({
						visitId: options.visitId,
						visitNumber: options.visitNumber,
						chairId: options.chairId,
						cabinetId: options.cabinetId,
						message: validation.overdraftNotice,
						items: (validation.overdraftItems || []).map((i: any) => ({
							itemId: i.inventoryItemId,
							itemName: i.itemName,
							deficitQty: i.deficitQty,
						})),
					}),
				}).catch(() => {});
			}
		} catch {
			// Never block clinical hot path on background network issues
		}
	}
}
