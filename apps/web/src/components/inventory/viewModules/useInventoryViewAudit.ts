import { useCallback, useMemo } from "react";
import { rublesToKopecks } from "@dental/shared";
import { clientLogger } from "../../../services/logging/clientLogger.js";
import { showToast } from "../../GlobalToast.js";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import {
	computeAuditLineItem, DEFAULT_COMMISSION_MEMBERS, DEFAULT_INVENTORY_ITEMS_PRESET,
	SOLO_DOCTOR_COMMISSION_MEMBERS, type WarehouseAuditItemLine, type WarehouseInventoryAuditDocument,
} from "../warehouseInventoryEngine.js";

export function useInventoryViewAudit(
	organizationId: string,
	items: readonly InventoryItem[],
	getHeaders: (headers?: Record<string, string>) => Record<string, string>,
	fetchItems: () => Promise<void> | void,
) {
	const auditInitialDoc: WarehouseInventoryAuditDocument = useMemo(() => {
		const auditDate = new Date().toISOString().slice(0, 10);
		const isDemo = isDemoShowcaseMode();
		const clinicNameRu = isDemo ? "ООО «ДЕНТЕ КЛИНИК»" : "";
		const clinicInn = isDemo ? "7701987654" : "";
		if (!items || items.length === 0) {
			return {
				id: `audit-${Date.now()}`, documentNumber: `АКТ-ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
				orderNumber: "", orderDate: auditDate, auditStartDate: auditDate, auditEndDate: auditDate, auditDate,
				branchId: organizationId, branchNameRu: "Центральное отделение", warehouseNameRu: "Главный склад расходных материалов",
				molFullName: "Ответственный сотрудник", molPosition: "Старшая медсестра / Администратор", status: "reconciliation" as const,
				commission: isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS,
				items: isDemo ? [...DEFAULT_INVENTORY_ITEMS_PRESET] : [],
				organizationNameRu: clinicNameRu, organizationOkpo: "", organizationInn: clinicInn,
			};
		}
		const auditItems: WarehouseAuditItemLine[] = items.map((it, idx) => computeAuditLineItem({
			itemId: it.id, sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`, nameRu: it.name,
			category: it.category || "Расходные материалы", unitRu: it.unit || "шт.", okeiCode: "796",
			batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`, expiryDate: it.expirationDate || "2027-12-31",
			storageLocationRu: "Основной стеллаж", bookQuantity: Number(it.stockQuantity) || 0, actualQuantity: Number(it.stockQuantity) || 0,
			unitCostKopecks: rublesToKopecks(parseFloat(it.unitCostRub) || 0),
		}, auditDate));

		return {
			id: `audit-${Date.now()}`, documentNumber: `АКТ-ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
			orderNumber: "", orderDate: auditDate, auditStartDate: auditDate, auditEndDate: auditDate, auditDate,
			branchId: organizationId, branchNameRu: "Центральное отделение", warehouseNameRu: "Главный склад расходных материалов",
			molFullName: "Ответственный сотрудник", molPosition: "Старшая медсестра / Администратор", status: "reconciliation" as const,
			commission: isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS, items: auditItems,
			organizationNameRu: clinicNameRu, organizationOkpo: "", organizationInn: clinicInn,
		};
	}, [items, organizationId]);

	const handleApplyInventoryAudit = useCallback(async (doc: WarehouseInventoryAuditDocument) => {
		try {
			const discrepancyItems = doc.items.filter((it) => it.discrepancyQuantity !== 0);
			if (discrepancyItems.length > 0) {
				const headers = getHeaders({ "Content-Type": "application/json" });
				const res = await fetch(`/api/inventory/${organizationId}/stock/batch-adjust`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						reason: `Инвентаризация ${doc.documentNumber}`,
						items: discrepancyItems.map((it) => ({
							itemId: it.itemId,
							adjustment: it.discrepancyQuantity,
						})),
					}),
				});
				if (!res.ok) {
					let rawJson: { data?: { message?: string; error?: string }; message?: string; error?: string } | null = null;
					try {
						rawJson = (await res.json()) as {
							data?: { message?: string; error?: string };
							message?: string;
							error?: string;
						} | null;
					} catch (parseErr) {
						clientLogger.warn("[useInventoryViewAudit] Error JSON parse failed", {
							status: res.status,
							error: String(parseErr),
						}, { module: "Inventory" });
					}
					const errPayload = rawJson?.data ?? rawJson;
					throw new Error(errPayload?.message || errPayload?.error || `Ошибка сервера (${res.status})`);
				}
				let okJson: { data?: unknown } | null = null;
				try {
					okJson = (await res.json()) as { data?: unknown } | null;
				} catch (parseErr) {
					clientLogger.warn("[useInventoryViewAudit] Response JSON parse failed", {
						error: String(parseErr),
					}, { module: "Inventory" });
				}
				const _okPayload = okJson?.data ?? okJson;
				void _okPayload;
				showToast(`Инвентаризация утверждена: скорректировано ${discrepancyItems.length} позиций на складе`, "info");
			} else {
				showToast("Инвентаризация утверждена: расхождений по остаткам не выявлено", "info");
			}
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Не удалось провести инвентаризацию", "error");
			throw err;
		} finally {
			fetchItems();
		}
	}, [organizationId, getHeaders, fetchItems]);

	return { auditInitialDoc, handleApplyInventoryAudit };
}
