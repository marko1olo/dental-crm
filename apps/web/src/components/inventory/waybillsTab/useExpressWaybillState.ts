import { useRef, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	type AcceptanceWaybillItem,
	CANONICAL_DENTAL_SUPPLIERS,
	calculateWaybillTotals,
	createWaybillItem,
	reconcileOverdraftOnReceipt,
	rublesToKopecks,
} from "../acceptanceWaybillsEngine.js";
import type { InventoryItem } from "../useInventoryLogic.js";

export function useExpressWaybillState(
	inventoryItems: readonly InventoryItem[],
	onWaybillPosted?: (wb: AcceptanceWaybillDocument) => void | Promise<void>,
	onRefreshStock?: () => void,
	onAddPostedWaybill?: (wb: AcceptanceWaybillDocument) => void,
) {
	const [isExpressModalOpen, setIsExpressModalOpen] = useState(false);
	const [expressSupplierId, setExpressSupplierId] = useState(
		CANONICAL_DENTAL_SUPPLIERS[0]?.id || "",
	);
	const [expressWaybillNum, setExpressWaybillNum] = useState("ПРХ-2026/10-091");
	const [expressDate, setExpressDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [expressAmountRub, setExpressAmountRub] = useState("45000");
	const inFlightRef = useRef(false);

	const handlePostExpressWaybill = async () => {
		if (inFlightRef.current) return;
		inFlightRef.current = true;
		try {
			const num =
				expressWaybillNum.trim() || `ПРХ-${Date.now().toString().slice(-4)}`;
			const amtRub = parseFloat(expressAmountRub) || 0;
			const supplier = CANONICAL_DENTAL_SUPPLIERS.find(
				(s) => s.id === expressSupplierId,
			) ||
				CANONICAL_DENTAL_SUPPLIERS[0] || {
					id: "supp-default",
					name: "Основной поставщик",
					inn: "7700000000",
					isPrimary: true,
				};

			const defaultItem: AcceptanceWaybillItem = createWaybillItem({
				name: "Расходные материалы стоматологические (пакет поставки)",
				sku: "EXP-PKG-01",
				unit: "упак.",
				category: "Расходные",
				quantity: 1,
				unitPriceKopecks: rublesToKopecks(amtRub),
				vatRate: 0,
				batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
				expirationDate: new Date(Date.now() + 365 * 86400000)
					.toISOString()
					.slice(0, 10),
			});

			const items = [defaultItem];
			const totals = calculateWaybillTotals(items);
			const postedDoc: AcceptanceWaybillDocument = {
				id: `wb-express-${Date.now()}`,
				waybillNumber: num,
				receiptDate: expressDate,
				supplier,
				warehouseName: "Центральный склад клиники",
				receiverFullName: "Ответственный за снабжение",
				receiverPosition: "Зав. складом",
				status: "posted",
				items,
				totals,
				postedAt: new Date().toISOString(),
			};

			const overdraftItems = inventoryItems.filter(
				(inv) => Number(inv.stockQuantity) < 0,
			);
			let overdraftResolvedCount = 0;
			for (const d of overdraftItems) {
				const curDeficit = Number(d.stockQuantity);
				const reconciliation = reconcileOverdraftOnReceipt(curDeficit, 10);
				if (reconciliation.clearedDeficit > 0) overdraftResolvedCount++;
			}

			if (onAddPostedWaybill) onAddPostedWaybill(postedDoc);
			setIsExpressModalOpen(false);

			if (onWaybillPosted) await onWaybillPosted(postedDoc);
			if (onRefreshStock) onRefreshStock();

			showToast(
				overdraftResolvedCount > 0
					? `Накладная №${postedDoc.waybillNumber} оприходована. Погашен овердрафт: ${overdraftResolvedCount} поз.`
					: `Накладная №${postedDoc.waybillNumber} успешно оприходована. Склад пополнен.`,
				"success",
			);
		} finally {
			inFlightRef.current = false;
		}
	};

	return {
		isExpressModalOpen,
		setIsExpressModalOpen,
		expressSupplierId,
		setExpressSupplierId,
		expressWaybillNum,
		setExpressWaybillNum,
		expressDate,
		setExpressDate,
		expressAmountRub,
		setExpressAmountRub,
		handlePostExpressWaybill,
	};
}
