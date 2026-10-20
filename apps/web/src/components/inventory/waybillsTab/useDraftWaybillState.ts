import { useState } from "react";
import {
	type AcceptanceSupplier,
	type AcceptanceWaybillDocument,
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	calculateWaybillTotals,
	createDraftAcceptanceWaybill,
	createWaybillItem,
} from "../acceptanceWaybillsEngine.js";

export function useDraftWaybillState() {
	const [draftWaybill, setDraftWaybill] = useState<AcceptanceWaybillDocument>(
		() =>
			createDraftAcceptanceWaybill({
				supplier: CANONICAL_DENTAL_SUPPLIERS[0] ?? {
					id: "supp-default",
					name: "Основной поставщик",
					inn: "7700000000",
					isPrimary: true,
				},
			}),
	);

	const handleAddTemplateItem = (templateSku: string) => {
		const tmpl = CANONICAL_DENTAL_MATERIAL_TEMPLATES.find(
			(t) => t.sku === templateSku,
		);
		if (!tmpl) return;

		const newItem = createWaybillItem({
			name: tmpl.name,
			sku: tmpl.sku,
			unit: tmpl.unit,
			category: tmpl.category,
			quantity: 10,
			unitPriceKopecks: tmpl.defaultUnitPriceKopecks,
			vatRate: tmpl.vatRate,
			batchNumber: `${tmpl.defaultBatchPrefix}-${Date.now().toString().slice(-6)}`,
			expirationDate: tmpl.shelfLifeMonths
				? new Date(Date.now() + tmpl.shelfLifeMonths * 30 * 86400000)
						.toISOString()
						.slice(0, 10)
				: "2028-12-31",
			barcode: tmpl.barcode,
		});

		const nextItems = [...draftWaybill.items, newItem];
		setDraftWaybill((prev) => ({
			...prev,
			items: nextItems,
			totals: calculateWaybillTotals(nextItems),
		}));
	};

	const handleRemoveDraftItem = (itemId: string) => {
		const nextItems = draftWaybill.items.filter((it) => it.id !== itemId);
		setDraftWaybill((prev) => ({
			...prev,
			items: nextItems,
			totals: calculateWaybillTotals(nextItems),
		}));
	};

	const handleChangeSupplier = (supplier: AcceptanceSupplier) => {
		setDraftWaybill((prev) => ({ ...prev, supplier }));
	};

	const handleChangeWaybillNumber = (waybillNumber: string) => {
		setDraftWaybill((prev) => ({ ...prev, waybillNumber }));
	};

	const handleChangeReceiptDate = (receiptDate: string) => {
		setDraftWaybill((prev) => ({ ...prev, receiptDate }));
	};

	const resetDraft = () => {
		setDraftWaybill(
			createDraftAcceptanceWaybill({
				supplier: CANONICAL_DENTAL_SUPPLIERS[0] ?? {
					id: "supp-default",
					name: "Основной поставщик",
					inn: "7700000000",
					isPrimary: true,
				},
			}),
		);
	};

	return {
		draftWaybill,
		setDraftWaybill,
		resetDraft,
		handleAddTemplateItem,
		handleRemoveDraftItem,
		handleChangeSupplier,
		handleChangeWaybillNumber,
		handleChangeReceiptDate,
	};
}
