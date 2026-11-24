import { denteQueryClient } from "../../../lib/queryClient.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";
import { useOfflineStore } from "../../../store/offlineStore.js";
import { type AutoVisitBomDeductionResult, kopecksToRubles } from "@dental/shared";
import type { PerformAutoVisitBomDeductionOptions } from "./bomDeductionTypes.js";
import type { DeductionValidationSummary } from "./bomDeductionValidator.js";

export interface NormalizedServiceItem {
	readonly serviceCode: string;
	readonly quantity: number;
	readonly serviceTitle?: string | undefined;
	readonly toothNumber?: number | string | null | undefined;
}

export interface OverdraftValidationItem {
	readonly inventoryItemId: string;
	readonly itemName: string;
	readonly deficitQty: number;
}

export function syncAutoBomDeduction(
	options: PerformAutoVisitBomDeductionOptions,
	result: AutoVisitBomDeductionResult,
	normalizedServices: readonly NormalizedServiceItem[],
	validation: DeductionValidationSummary,
) {
	try {
		useInventoryStore.getState().deductStock(
			options.organizationId || "org-default",
			result.items.map((i) => {
				const ext = i as unknown as Record<string, unknown>;
				return {
					inventoryItemId: i.inventoryItemId,
					itemName: i.itemName,
					quantity: i.deductedQty,
					visitId: options.visitId,
					reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
					lotNumber: typeof ext.batchId === "string" ? ext.batchId : null,
					expirationDate: typeof ext.expirationDate === "string" ? ext.expirationDate : null,
					unitCostRub: kopecksToRubles(i.unitCostPriceKopecks),
				};
			}),
			{
				visitId: options.visitId,
				allowOverdraft: options.allowOverdraft ?? true,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
				skipNetworkSync: true, // Защита от двойного списания: сетевой вызов выполняется строго 1 раз через авто-BOM эндпоинт ниже
			},
		).catch((err) => {
			console.warn("[autoBomDeduction] Local deductStock error:", err);
		});

		void denteQueryClient.invalidateQueries({ queryKey: ["inventory"] });
		void denteQueryClient.invalidateQueries({ queryKey: ["warehouse"] });
	} catch (err) {
		console.warn("[autoBomDeduction] Failed to perform local store deduction:", err);
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
			items: result.items.map((i) => {
				const ext = i as unknown as Record<string, unknown>;
				return {
					inventoryItemId: i.inventoryItemId,
					id: i.inventoryItemId,
					name: i.itemName,
					quantity: i.deductedQty,
					unitCostRub: kopecksToRubles(i.unitCostPriceKopecks),
					reason: `Автосписание по визиту ${options.visitNumber || options.visitId}`,
					lotNumber: typeof ext.batchId === "string" ? ext.batchId : null,
					expirationDate: typeof ext.expirationDate === "string" ? ext.expirationDate : null,
				};
			}),
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
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			}).catch((err) => {
				console.warn("[autoBomDeduction] Фоновая синхронизация списания с сервером отложена:", err);
			});

			if (validation.hasOverdraft) {
				const alertEndpoint = hasSpecificOrg
					? `/api/inventory/${options.organizationId}/overdraft-alert`
					: `/api/inventory/overdraft-alert`;

				const alertPayload = {
					visitId: options.visitId,
					visitNumber: options.visitNumber,
					chairId: options.chairId,
					cabinetId: options.cabinetId,
					message: validation.overdraftNotice,
					items: (validation.overdraftItems || []).map((i: OverdraftValidationItem) => ({
						itemId: i.inventoryItemId,
						itemName: i.itemName,
						deficitQty: i.deficitQty,
					})),
				};

				options.fetchFn(alertEndpoint, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(alertPayload),
				}).catch((err) => {
					console.warn("[autoBomDeduction] Failed to send overdraft alert to server, enqueuing to offlineStore:", err);
					void useOfflineStore.getState().enqueue({
						entityType: "inventory",
						entityId: options.visitId,
						organizationId: options.organizationId,
						action: "create",
						payload: alertPayload,
					}).catch((enqueueErr) => {
						console.error("[autoBomDeduction] Failed to enqueue overdraft alert to offlineStore:", enqueueErr);
					});
				});
			}
		} catch (err) {
			console.warn("[autoBomDeduction] Background network synchronization exception:", err);
		}
	}
}
