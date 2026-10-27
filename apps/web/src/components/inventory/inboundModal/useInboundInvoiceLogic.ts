import React, { useMemo, useRef, useState } from "react";
import { money } from "../../../AppHelpers.js";
import { showToast } from "../../GlobalToast.js";
import type { InventoryItem } from "../useInventoryLogic.js";
import { postInboundInvoice } from "./inboundInvoiceApi.js";
import type { InboundInvoiceItemLine, InboundInvoiceTotals } from "./InboundInvoiceTypes.js";

export function useInboundInvoiceLogic(
	organizationId: string,
	inventoryItems: readonly InventoryItem[],
	onClose: () => void,
	onInvoicePosted?: () => void | Promise<void>,
	getHeaders?: (headers?: Record<string, string>) => Record<string, string>,
) {
	const [invoiceNumber, setInvoiceNumber] = useState(() => `НАКЛ-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-01`);
	const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
	const [supplierName, setSupplierName] = useState("ООО «Стомторг»");
	const [isPosting, setIsPosting] = useState(false);
	const inFlightRef = useRef(false);

	const [lines, setLines] = useState<InboundInvoiceItemLine[]>([{
		id: "line-1", name: "Перчатки нитриловые неопудренные", lotNumber: `LOT-${new Date().getFullYear()}-01`,
		expirationDate: "2028-12-31", quantity: 10, unit: "уп.", unitCostRub: 650,
	}]);

	const totals = useMemo<InboundInvoiceTotals>(() => {
		let totalQty = 0;
		let totalSumRub = 0;
		for (const line of lines) {
			const q = Number(line.quantity) || 0;
			const p = Number(line.unitCostRub) || 0;
			totalQty += q;
			totalSumRub += q * p;
		}
		return { totalPositions: lines.length, totalQty, totalSumRub, totalSumFormatted: money(totalSumRub) };
	}, [lines]);

	const handleAddLine = () => setLines((prev) => [
		...prev,
		{ id: `line-${Date.now()}`, name: "", lotNumber: `LOT-${new Date().getFullYear()}-${String(prev.length + 1).padStart(2, "0")}`, expirationDate: "2028-12-31", quantity: 1, unit: "шт.", unitCostRub: 0 },
	]);

	const handleRemoveLine = (id: string) => {
		if (lines.length <= 1) {
			showToast("В накладной должна быть хотя бы одна позиция", "warning");
			return;
		}
		setLines((prev) => prev.filter((l) => l.id !== id));
	};

	const handleLineChange = (id: string, field: keyof InboundInvoiceItemLine, value: string | number) => {
		setLines((prev) => prev.map((line) => {
			if (line.id !== id) return line;
			if (field === "name") {
				const m = inventoryItems.find((it) => it.name.toLowerCase() === String(value).toLowerCase());
				return { ...line, name: String(value), inventoryItemId: m?.id, unit: m?.unit || line.unit, unitCostRub: m?.unitCostRub ? Number(m.unitCostRub) : line.unitCostRub };
			}
			return { ...line, [field]: value };
		}));
	};

	const handlePostInvoice = async (e: React.FormEvent) => {
		e.preventDefault();
		if (inFlightRef.current || isPosting) return;
		if (lines.length === 0) return showToast("Добавьте позиции в накладную", "warning");
		for (const line of lines) {
			if (!line.name.trim()) return showToast("Заполните наименования всех материалов", "warning");
			if (line.quantity <= 0) return showToast(`Укажите корректное количество для «${line.name}»`, "warning");
		}

		inFlightRef.current = true;
		setIsPosting(true);
		try {
			const headers = getHeaders ? getHeaders({ "Content-Type": "application/json" }) : { "Content-Type": "application/json" };
			const updatedCount = await postInboundInvoice({ organizationId, invoiceNumber, invoiceDate, supplierName, lines, inventoryItems, headers });
			showToast(`Приходная накладная ${invoiceNumber} успешно оприходована (${updatedCount} поз. на ${totals.totalSumFormatted})`, "success");
			if (onInvoicePosted) await onInvoicePosted();
			onClose();
		} catch (error) {
			console.error("[useInboundInvoiceLogic] Ошибка оприходования:", error);
			showToast("Не удалось оприходовать накладную на складе", "error");
		} finally {
			inFlightRef.current = false;
			setIsPosting(false);
		}
	};

	return {
		invoiceNumber, setInvoiceNumber, invoiceDate, setInvoiceDate, supplierName, setSupplierName,
		lines, totals, isPosting, handleAddLine, handleRemoveLine, handleLineChange, handlePostInvoice,
	};
}
