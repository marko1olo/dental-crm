import { useCallback, useMemo } from "react";
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
		if (!items || items.length === 0) {
			return {
				id: `audit-${Date.now()}`, documentNumber: `ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
				orderNumber: "ПР-44/ИНВ", orderDate: auditDate, auditStartDate: auditDate, auditEndDate: auditDate, auditDate,
				branchId: organizationId, branchNameRu: "Центральное отделение", warehouseNameRu: "Главный склад расходных материалов",
				molFullName: "Ответственный сотрудник", molPosition: "Старшая медсестра / Администратор", status: "reconciliation" as const,
				commission: isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS,
				items: isDemo ? [...DEFAULT_INVENTORY_ITEMS_PRESET] : [],
				organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»", organizationOkpo: "49201948", organizationInn: "7701984512",
			};
		}
		const auditItems: WarehouseAuditItemLine[] = items.map((it, idx) => computeAuditLineItem({
			itemId: it.id, sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`, nameRu: it.name,
			category: it.category || "Расходные материалы", unitRu: it.unit || "шт.", okeiCode: "796",
			batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`, expiryDate: it.expirationDate || "2027-12-31",
			storageLocationRu: "Основной стеллаж", bookQuantity: Number(it.stockQuantity) || 0, actualQuantity: Number(it.stockQuantity) || 0,
			unitCostKopecks: Math.round((parseFloat(it.unitCostRub) || 0) * 100),
		}, auditDate));

		return {
			id: `audit-${Date.now()}`, documentNumber: `ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
			orderNumber: "ПР-44/ИНВ", orderDate: auditDate, auditStartDate: auditDate, auditEndDate: auditDate, auditDate,
			branchId: organizationId, branchNameRu: "Центральное отделение", warehouseNameRu: "Главный склад расходных материалов",
			molFullName: "Ответственный сотрудник", molPosition: "Старшая медсестра / Администратор", status: "reconciliation" as const,
			commission: isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS, items: auditItems,
			organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»", organizationOkpo: "49201948", organizationInn: "7701984512",
		};
	}, [items, organizationId]);

	const handleApplyInventoryAudit = useCallback(async (doc: WarehouseInventoryAuditDocument) => {
		try {
			const discrepancyItems = doc.items.filter((it) => it.discrepancyQuantity !== 0);
			if (discrepancyItems.length > 0) {
				const headers = getHeaders({ "Content-Type": "application/json" });
				for (const it of discrepancyItems) {
					await fetch(`/api/inventory/${organizationId}/${it.itemId}/stock`, {
						method: "PATCH", headers,
						body: JSON.stringify({
							adjustment: it.discrepancyQuantity,
							reason: `Инвентаризация ${doc.documentNumber} (${it.discrepancyQuantity > 0 ? "излишек" : "недостача"})`,
							allowOverdraft: true,
						}),
					});
				}
				showToast(`Инвентаризация утверждена: скорректировано ${discrepancyItems.length} позиций на складе`, "info");
			} else {
				showToast("Инвентаризация утверждена: расхождений по остаткам не выявлено", "info");
			}
		} catch (err) {
			showToast(err instanceof Error ? err.message : "Не удалось провести инвентаризацию", "error");
		} finally {
			fetchItems();
		}
	}, [organizationId, getHeaders, fetchItems]);

	return { auditInitialDoc, handleApplyInventoryAudit };
}
