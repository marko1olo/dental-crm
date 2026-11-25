import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders.js";
import { denteQueryClient } from "../../../lib/queryClient.js";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { useInventoryStore } from "../../../store/inventoryStore.js";
import { useOfflineStore } from "../../../store/offlineStore.js";
import { type AutoVisitBomDeductionResult, generateUuidV7, kopecksToRubles } from "@dental/shared";
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

function readOptionalStringProp(obj: object, key: string): string | null {
	if (!(key in obj)) return null;
	const value = (obj as Record<string, unknown>)[key];
	return typeof value === "string" ? value : null;
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
			result.items.map((i) => ({
				inventoryItemId: i.inventoryItemId,
				itemName: i.itemName,
				quantity: i.deductedQty,
				visitId: options.visitId,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
				lotNumber: readOptionalStringProp(i, "batchId"),
				expirationDate: readOptionalStringProp(i, "expirationDate"),
				unitCostRub: kopecksToRubles(i.unitCostPriceKopecks),
			})),
			{
				visitId: options.visitId,
				allowOverdraft: options.allowOverdraft ?? true,
				reason: `Автосписание расходников по визиту ${options.visitNumber || options.visitId}`,
				skipNetworkSync: true, // Защита от двойного списания: сетевой вызов выполняется строго 1 раз через авто-BOM эндпоинт ниже
			},
		).catch((err) => {
			clientLogger.warn("[autoBomDeduction] Local deductStock error", err, { module: "Inventory" });
		});

		void denteQueryClient.invalidateQueries({ queryKey: ["inventory"] });
		void denteQueryClient.invalidateQueries({ queryKey: ["warehouse"] });
	} catch (err) {
		clientLogger.warn("[autoBomDeduction] Failed to perform local store deduction", err, { module: "Inventory" });
	}

	if (options.organizationId && options.fetchFn) {
		const payload = {
			visitId: options.visitId,
			userId: options.doctorId ?? null,
			transactionType: "auto_deduct" as const,
			services: normalizedServices.map((s) => ({
				serviceId: s.serviceCode,
				quantity: s.quantity,
			})),
			items: result.items.map((i) => ({
				inventoryItemId: i.inventoryItemId,
				quantity: i.deductedQty,
				reason: `Автосписание по визиту ${options.visitNumber || options.visitId}`,
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
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
				body: JSON.stringify(payload),
			}).then((res) => {
				if (!res.ok) {
					clientLogger.warn(
						"[autoBomDeduction] Сервер вернул ошибку при авто-BOM списании",
						{ status: res.status },
						{ module: "Inventory" },
					);
				}
			}).catch((err) => {
				clientLogger.warn(
					"[autoBomDeduction] Фоновая синхронизация списания с сервером отложена",
					err,
					{ module: "Inventory" },
				);
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
					headers: denteClinicalMutationHeaders({
						"Content-Type": "application/json",
						"Idempotency-Key": generateUuidV7(),
					}),
					body: JSON.stringify(alertPayload),
				}).catch((err) => {
					clientLogger.warn(
						"[autoBomDeduction] Failed to send overdraft alert to server, enqueuing to offlineStore",
						err,
						{ module: "Inventory" },
					);
					void useOfflineStore.getState().enqueue({
						entityType: "inventory",
						entityId: options.visitId,
						organizationId: options.organizationId,
						action: "create",
						payload: alertPayload,
					}).catch((enqueueErr) => {
						clientLogger.error(
							"[autoBomDeduction] Failed to enqueue overdraft alert to offlineStore",
							enqueueErr,
							{ module: "Inventory" },
						);
					});
				});
			}
		} catch (err) {
			clientLogger.warn("[autoBomDeduction] Background network synchronization exception", err, { module: "Inventory" });
		}
	}
}
