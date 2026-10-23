/**
 * INBOUND WAYBILL MODAL (SSOT ПРИХОДНАЯ НАКЛАДНАЯ)
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { showToast } from "../GlobalToast.js";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders.js";
import type { InboundWaybillLine, InboundWaybillModalProps } from "./inboundWaybill/inboundWaybillTypes.js";
import { SAMPLE_PRESETS } from "./inboundWaybill/inboundWaybillPresets.js";
import { exportWaybillCsv, printWaybillAct } from "./inboundWaybill/inboundWaybillPrintAct.js";
import { submitInboundWaybill } from "./inboundWaybill/inboundWaybillApi.js";
import { useInboundWaybillTotals } from "./inboundWaybill/useInboundWaybillTotals.js";
import { InboundWaybillHeader } from "./inboundWaybill/InboundWaybillHeader.js";
import { InboundWaybillRequisites } from "./inboundWaybill/InboundWaybillRequisites.js";
import { InboundWaybillTable } from "./inboundWaybill/InboundWaybillTable.js";
import { InboundWaybillFooter } from "./inboundWaybill/InboundWaybillFooter.js";

export type { InboundWaybillLine, InboundWaybillModalProps };

export const InboundWaybillModal: React.FC<InboundWaybillModalProps> = ({
	isOpen, onClose, organizationId, inventoryItems = [], onWaybillPosted, onInvoicePosted, getHeaders,
}) => {
	const [waybillNumber, setWaybillNumber] = useState(() => `НАКЛ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-01`);
	const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [supplierName, setSupplierName] = useState("ООО «Стомторг»");
	const [warehouseName, setWarehouseName] = useState("Основной склад");
	const [isPosting, setIsPosting] = useState(false);
	const inFlightRef = useRef(false);
	const [lines, setLines] = useState<InboundWaybillLine[]>(() => [
		{ id: "line-1", name: "Перчатки нитриловые неопудренные (M)", lotNumber: `LOT-${new Date().getFullYear()}-01`, expirationDate: "2028-12-31", quantity: 10, unit: "уп", unitCostRub: 580, category: "consumables" },
	]);

	useEffect(() => {
		if (isOpen) setReceiptDate(new Date().toISOString().slice(0, 10));
	}, [isOpen]);

	const { deficitMap, totals } = useInboundWaybillTotals(inventoryItems, lines);

	if (!isOpen) return null;

	const handleAddEmptyLine = () => setLines((prev) => [...prev, { id: `line-${Date.now()}`, name: "", lotNumber: `LOT-${new Date().getFullYear()}-${String(lines.length + 1).padStart(2, "0")}`, expirationDate: "2028-12-31", quantity: 1, unit: "уп", unitCostRub: 0, category: "materials" }]);
	const handleLoadPreset = (key: "stomtorg" | "consumables") => {
		const preset = SAMPLE_PRESETS[key];
		if (!preset) return;
		setLines(preset.map((it) => ({ ...it, id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })));
		if (key === "stomtorg") setSupplierName("ООО «Стомторг»");
		showToast(`Загружен образец накладной (${preset.length} позиций)`, "info");
	};
	const handleUpdateLine = (id: string, updates: Partial<InboundWaybillLine>) => setLines((prev) => prev.map((l) => {
		if (l.id !== id) return l;
		const updated = { ...l, ...updates };
		if (updates.name && updates.name !== l.name) {
			const found = inventoryItems.find((inv) => inv.name.toLowerCase().trim() === updates.name?.toLowerCase().trim());
			if (found) {
				if (!updates.unit && found.unit) updated.unit = found.unit;
				if (updates.unitCostRub === undefined && found.unitCostRub) updated.unitCostRub = Number(found.unitCostRub) || updated.unitCostRub;
				updated.inventoryItemId = found.id;
			}
		}
		return updated;
	}));
	const handleRemoveLine = (id: string) => {
		if (lines.length <= 1) return showToast("В накладной должна быть хотя бы одна позиция", "warning");
		setLines((prev) => prev.filter((l) => l.id !== id));
	};

	const handlePostWaybill = async () => {
		if (lines.length === 0) return showToast("Добавьте хотя бы одну позицию в накладную", "warning");
		if (lines.some((l) => !l.name.trim())) return showToast("Заполните наименования для всех позиций накладной", "error");
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		setIsPosting(true);
		const headers = getHeaders ? getHeaders({ "Content-Type": "application/json" }) : getDenteAuthHeaders({ "Content-Type": "application/json" });
		try {
			await submitInboundWaybill({ organizationId, waybillNumber, supplierName, receiptDate, warehouseName, lines, inventoryItems, headers });
			showToast(`Накладная №${waybillNumber} проведена! Оприходовано ${lines.length} поз. на сумму ${totals.totalSumFormatted}`, "success");
			if (onWaybillPosted) await onWaybillPosted();
			if (onInvoicePosted) await onInvoicePosted();
			onClose();
		} catch (err: unknown) {
			showToast(err instanceof Error ? err.message : "Ошибка оприходования накладной", "error");
		} finally {
			inFlightRef.current = false;
			setIsPosting(false);
		}
	};

	const modalContent = (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150" role="dialog" aria-modal="true" aria-labelledby="inbound-waybill-title" data-testid="inbound-waybill-modal" onClick={(e) => { if (e.target === e.currentTarget && !isPosting) onClose(); }}>
			<div className="relative w-full max-w-4xl lg:max-w-5xl my-auto rounded-t-[24px] sm:rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[var(--ink)]">
				<InboundWaybillHeader onClose={onClose} isPosting={isPosting} />
				<InboundWaybillRequisites waybillNumber={waybillNumber} setWaybillNumber={setWaybillNumber} receiptDate={receiptDate} setReceiptDate={setReceiptDate} supplierName={supplierName} setSupplierName={setSupplierName} warehouseName={warehouseName} setWarehouseName={setWarehouseName} onLoadPreset={handleLoadPreset} onAddEmptyLine={handleAddEmptyLine} />
				<InboundWaybillTable lines={lines} deficitMap={deficitMap} inventoryItems={inventoryItems} onUpdateLine={handleUpdateLine} onRemoveLine={handleRemoveLine} />
				<InboundWaybillFooter totals={totals} isPosting={isPosting} onPrintWaybill={() => printWaybillAct({ waybillNumber, receiptDate, warehouseName, supplierName, lines, totals })} onExportCsv={() => exportWaybillCsv(waybillNumber, lines)} onClose={onClose} onPostWaybill={handlePostWaybill} />
			</div>
		</div>
	);

	return typeof document === "undefined" ? modalContent : createPortal(modalContent, document.body);
};

export default InboundWaybillModal;
