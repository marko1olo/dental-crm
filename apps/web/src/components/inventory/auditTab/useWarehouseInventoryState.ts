import { useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import {
	type InventoryAuditTotals, type WarehouseAuditItemLine, type WarehouseInventoryAuditDocument,
	calculateInventoryAuditTotals, computeAuditLineItem, generateInv19Html, generateInv3Html,
	generateTorg16ActFromInventory, generateTorg16Html,
} from "../warehouseInventoryEngine.js";

export function useWarehouseInventoryState(
	organizationId: string, items: readonly InventoryItem[],
	onApplyAudit?: (doc: WarehouseInventoryAuditDocument) => void | Promise<void>,
	onRefresh?: () => void,
) {
	const todayDate = new Date().toISOString().slice(0, 10);
	const [auditLines, setAuditLines] = useState<WarehouseAuditItemLine[]>(() =>
		items.map((it, idx) => computeAuditLineItem({
			itemId: it.id, sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`, nameRu: it.name,
			category: it.category || "Расходные материалы", unitRu: it.unit || "шт.", okeiCode: "796",
			batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`, expiryDate: it.expirationDate || "2028-12-31",
			storageLocationRu: "Основной стеллаж", bookQuantity: Number(it.stockQuantity) || 0,
			actualQuantity: Number(it.stockQuantity) || 0,
			unitCostKopecks: Math.round((Number.parseFloat(it.unitCostRub || "0") || 0) * 100),
		}, todayDate)),
	);

	useEffect(() => {
		if (items.length > 0 && auditLines.length === 0) {
			setAuditLines(items.map((it, idx) => computeAuditLineItem({
				itemId: it.id, sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`, nameRu: it.name,
				category: it.category || "Расходные материалы", unitRu: it.unit || "шт.", okeiCode: "796",
				batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`, expiryDate: it.expirationDate || "2028-12-31",
				storageLocationRu: "Основной стеллаж", bookQuantity: Number(it.stockQuantity) || 0,
				actualQuantity: Number(it.stockQuantity) || 0,
				unitCostKopecks: Math.round((Number.parseFloat(it.unitCostRub || "0") || 0) * 100),
			}, todayDate)));
		}
	}, [items, todayDate, auditLines.length]);

	const [searchQuery, setSearchQuery] = useState("");
	const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
	const [isApplying, setIsApplying] = useState(false);
	const totals: InventoryAuditTotals = useMemo(() => calculateInventoryAuditTotals(auditLines), [auditLines]);

	const handleActualQtyChange = (itemId: string, newQty: number) => {
		setAuditLines((prev) => prev.map((l) => l.itemId === itemId ? computeAuditLineItem({ ...l, actualQuantity: Math.max(0, newQty) }, todayDate) : l));
	};
	const handleReconcileAllMatch = () => {
		setAuditLines((prev) => prev.map((l) => computeAuditLineItem({ ...l, actualQuantity: l.bookQuantity }, todayDate)));
		showToast("Фактические остатки приравнены к учётным данным", "info");
	};

	const currentDoc: WarehouseInventoryAuditDocument = useMemo(() => ({
		id: `audit-${Date.now()}`, documentNumber: `СВЕРКА-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
		orderNumber: "ПР-44/ИНВ", orderDate: todayDate, auditStartDate: todayDate, auditEndDate: todayDate, auditDate: todayDate,
		branchId: organizationId, branchNameRu: "Центральное отделение", warehouseNameRu: "Главный склад расходных материалов",
		molFullName: "Кузнецов А.В. (Врач-стоматолог)", molPosition: "Врач-стоматолог / Ответственный сотрудник", status: "reconciliation",
		commission: [{ fullName: "Кузнецов А.В. (Врач-стоматолог)", position: "Врач-стоматолог", role: "mol", roleRu: "Материально ответственное лицо" }],
		items: auditLines, organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»", organizationOkpo: "49201948", organizationInn: "7701984512",
	}), [todayDate, organizationId, auditLines]);

	const handlePrintInv3 = () => { const w = window.open("", "_blank"); if (w) { w.document.write(generateInv3Html(currentDoc)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); } };
	const handlePrintInv19 = () => { const w = window.open("", "_blank"); if (w) { w.document.write(generateInv19Html(currentDoc)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); } };
	const handlePrintTorg16 = () => { const a = generateTorg16ActFromInventory(currentDoc, `Списание ${currentDoc.documentNumber}`); const w = window.open("", "_blank"); if (w) { w.document.write(generateTorg16Html(a)); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); } };

	const handleApplyAuditDoc = async () => {
		setIsApplying(true);
		try {
			if (onApplyAudit) await onApplyAudit(currentDoc);
			if (onRefresh) onRefresh();
			showToast("Результаты инвентаризации успешно зафиксированы", "success");
		} catch { showToast("Ошибка при фиксации инвентаризации", "error"); } finally { setIsApplying(false); }
	};

	const handleConfirmShiftActuals = async () => {
		handleReconcileAllMatch();
		await handleApplyAuditDoc();
	};

	const filteredLines = useMemo(() => auditLines.filter((l) => {
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			if (!l.nameRu.toLowerCase().includes(q) && !l.sku.toLowerCase().includes(q)) return false;
		}
		return !(discrepancyOnly && l.discrepancyType === "match");
	}), [auditLines, searchQuery, discrepancyOnly]);

	return {
		auditLines, totals, searchQuery, setSearchQuery, discrepancyOnly, setDiscrepancyOnly,
		isApplying, filteredLines, handleActualQtyChange, handleReconcileAllMatch,
		handleConfirmShiftActuals, handlePrintInv3, handlePrintInv19, handlePrintTorg16, handleApplyAuditDoc,
	};
}
