import { useCallback } from "react";
import { formatKopecksToRub } from "@dental/shared";
import {
	type WarehouseInventoryAuditDocument,
	type WarehouseAuditWriteoffAct,
	type WarehouseTorg16WriteoffAct,
	exportDiscrepanciesCsv,
	exportInv19DiscrepanciesToCsv,
	exportInventoryTo1C,
	exportInventoryToCsv,
	generateAuditWriteoffActFromInventory,
	generateTorg16ActFromInventory,
	validateInventoryAuditDraft,
} from "../warehouseInventoryEngine.js";

export function useWarehouseAuditExportHandlers({
	currentDocument,
	onDocumentSaved,
	onApplyAudit,
	onAuditWriteoffGenerated,
	onTorg16Generated,
	setStatus,
	showToast,
}: {
	currentDocument: WarehouseInventoryAuditDocument;
	onDocumentSaved?: ((doc: WarehouseInventoryAuditDocument) => void) | undefined;
	onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	onAuditWriteoffGenerated?: ((act: WarehouseAuditWriteoffAct) => void) | undefined;
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

	const handleExportDiscrepanciesCsv = useCallback(() => {
		const csv = exportDiscrepanciesCsv(currentDocument);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Сличительная_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Сличительная ведомость расхождений выгружена в CSV.");
	}, [currentDocument, showToast]);

	const handleExportInv19Csv = handleExportDiscrepanciesCsv;

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

	const handleCreateAuditWriteoffAct = useCallback(() => {
		const act = generateAuditWriteoffActFromInventory(currentDocument);
		if (onAuditWriteoffGenerated) {
			onAuditWriteoffGenerated(act);
		} else if (onTorg16Generated) {
			onTorg16Generated(act);
		}
		showToast(`Сформирован акт списания материалов № ${act.actNumber} на сумму ${formatKopecksToRub(act.totalCostKopecks)}`);
	}, [currentDocument, onAuditWriteoffGenerated, onTorg16Generated, showToast]);

	const handleCreateTorg16 = handleCreateAuditWriteoffAct;

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
		handleExportDiscrepanciesCsv,
		handleExportInv19Csv,
		handleExport1C,
		handleCreateAuditWriteoffAct,
		handleCreateTorg16,
		handleSave,
		handleApply,
	};
}
