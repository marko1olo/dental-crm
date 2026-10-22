import { showToast } from "../../GlobalToast.js";
import {
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	calculateLineCostKopecks,
	exportClinicalWriteoffToCsv,
	generateAct0504230Html,
	generateFormM11Html,
	generateTorg16Html,
} from "./clinicalWriteoffEngine.js";
import { DEFAULT_CLINIC_LEGAL_INFO } from "./clinicalWriteoffPresets.js";
import {
	type SupplierPurchaseOrderView,
	formatSupplierPurchaseOrderTextRu,
} from "../inventorySupplierOrders.js";

export function useClinicalWriteoffExportHandlers(
	currentDocument: ClinicalWriteoffDocument,
	lines: readonly ClinicalWriteoffLine[],
	actNumber: string,
) {
	const handleGenerateSupplierOrder = () => {
		const deficitLines = lines.filter(
			(l) => l.stockStatus === "deficit" || l.stockStatus === "warning" || l.stockAvailable < l.actualQuantity,
		);
		const poItems = deficitLines.map((l) => {
			const shortfall = Math.max(0, Number((l.actualQuantity - l.stockAvailable).toFixed(2)));
			const threshold = l.criticalThreshold > 0 ? l.criticalThreshold : 2;
			const suggested = Math.max(threshold * 2, shortfall + threshold, 1);
			const lineCost = calculateLineCostKopecks(l.unitCostKopecks, suggested);
			return {
				sku: l.sku || l.materialId,
				materialName: l.nameRu,
				category: l.category as any,
				unit: l.unit,
				currentStock: l.stockAvailable,
				criticalThreshold: threshold,
				shortfall,
				suggestedOrderQuantity: suggested,
				unitCostKopecks: l.unitCostKopecks,
				unitCostFormatted: `${(l.unitCostKopecks / 100).toFixed(2)} ₽`,
				totalCostKopecks: lineCost,
				totalCostFormatted: `${(lineCost / 100).toFixed(2)} ₽`,
			};
		});
		const totalCost = poItems.reduce((acc, i) => acc + i.totalCostKopecks, 0);
		const orderView: SupplierPurchaseOrderView = {
			id: `po_draft_${Date.now()}`,
			orderNumber: `ПО-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-001`,
			orderDate: new Date().toISOString().slice(0, 10),
			clinicNameRu: DEFAULT_CLINIC_LEGAL_INFO.clinicNameRu,
			reason: "stock_deficit",
			items: poItems,
			totalItemsCount: poItems.length,
			totalCostKopecks: totalCost,
			totalCostFormatted: `${(totalCost / 100).toFixed(2)} ₽`,
		};
		const text = formatSupplierPurchaseOrderTextRu(orderView);
		if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
			void navigator.clipboard.writeText(text);
		}
		showToast(`Черновик заказа поставщику на ${poItems.length} поз. скопирован в буфер!`, "success");
	};

	const handlePrintAct = (formType: "0504230" | "M11" | "TORG16") => {
		const html =
			formType === "0504230"
				? generateAct0504230Html(currentDocument)
				: formType === "M11"
					? generateFormM11Html(currentDocument)
					: generateTorg16Html(currentDocument);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	};

	const handleExportCsv = () => {
		const csv = exportClinicalWriteoffToCsv([currentDocument]);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `${actNumber}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return {
		handleGenerateSupplierOrder,
		handlePrintAct,
		handleExportCsv,
	};
}
