import { useCallback } from "react";
import {
	type WarehouseInventoryAuditDocument,
	type WarehouseTorg16WriteoffAct,
	exportInv19DiscrepanciesToCsv,
	exportInventoryTo1C,
	exportInventoryToCsv,
	generateTorg16ActFromInventory,
	validateInventoryAuditDraft,
} from "../warehouseInventoryEngine.js";

export function useWarehouseAuditExportHandlers({
	currentDocument,
	onDocumentSaved,
	onApplyAudit,
	onTorg16Generated,
	setStatus,
	showToast,
}: {
	currentDocument: WarehouseInventoryAuditDocument;
	onDocumentSaved?: ((doc: WarehouseInventoryAuditDocument) => void) | undefined;
	onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	onTorg16Generated?: ((act: WarehouseTorg16WriteoffAct) => void) | undefined;
	setStatus: (status: "reconciliation" | "approved" | "applied") => void;
	showToast: (msg: string) => void;
}) {
	const handlePrintDocument = useCallback((html: string) => {
		if (typeof window === "undefined") return;
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	}, []);

	const handleExportCsv = useCallback(() => {
		const csv = exportInventoryToCsv(currentDocument);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Инвентаризация_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Опись экспортирована в формате CSV (Excel UTF-8 BOM).");
	}, [currentDocument, showToast]);

	const handleExportInv19Csv = useCallback(() => {
		const csv = exportInv19DiscrepanciesToCsv(currentDocument);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Сличительная_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Сличительная ведомость расхождений выгружена в CSV.");
	}, [currentDocument, showToast]);

	const handleExport1C = useCallback(() => {
		const xml = exportInventoryTo1C(currentDocument);
		const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Инвентаризация_1C_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.xml`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Документ инвентаризации выгружен в формате XML CommerceML.");
	}, [currentDocument, showToast]);

	const handleCreateTorg16 = useCallback(() => {
		const act = generateTorg16ActFromInventory(currentDocument);
		onTorg16Generated?.(act);
		showToast(`Сформирован акт списания ТОРГ-16 № ${act.actNumber} на сумму ${(act.totalCostKopecks / 100).toFixed(2)} ₽`);
	}, [currentDocument, onTorg16Generated, showToast]);

	const handleSave = useCallback(() => {
		const validation = validateInventoryAuditDraft(currentDocument);
		if (!validation.isValid) {
			showToast(`Ошибка валидации: ${validation.errors.join(", ")}`);
			return;
		}
		setStatus("approved");
		onDocumentSaved?.({ ...currentDocument, status: "approved" });
		showToast("Инвентаризационная опись сохранена (статус: Утверждена).");
	}, [currentDocument, onDocumentSaved, setStatus, showToast]);

	const handleApply = useCallback(async () => {
		const validation = validateInventoryAuditDraft(currentDocument);
		if (!validation.isValid) {
			showToast(`Ошибка: ${validation.errors.join(", ")}`);
			return;
		}
		setStatus("applied");
		const appliedDoc: WarehouseInventoryAuditDocument = { ...currentDocument, status: "applied" };
		if (onApplyAudit) {
			await onApplyAudit(appliedDoc);
		}
		showToast("Инвентаризация успешно проведена! Остатки на складе скорректированы.");
	}, [currentDocument, onApplyAudit, setStatus, showToast]);

	return {
		handlePrintDocument,
		handleExportCsv,
		handleExportInv19Csv,
		handleExport1C,
		handleCreateTorg16,
		handleSave,
		handleApply,
	};
}
