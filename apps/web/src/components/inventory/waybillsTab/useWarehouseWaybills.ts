import { useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	createSampleDentalWaybill,
	exportWaybillToCsv,
	generateTorg12Html,
	reconcileOverdraftOnReceipt,
} from "../acceptanceWaybillsEngine.js";
import type { WarehouseWaybillsTabProps } from "./types.js";
import { useDraftWaybillState } from "./useDraftWaybillState.js";
import { useExpressWaybillState } from "./useExpressWaybillState.js";

export function useWarehouseWaybills({
	inventoryItems = [],
	onWaybillPosted,
	onRefreshStock,
}: WarehouseWaybillsTabProps) {
	const [waybillsList, setWaybillsList] = useState<AcceptanceWaybillDocument[]>(
		() => (isDemoShowcaseMode() ? [createSampleDentalWaybill()] : []),
	);
	const [selectedWaybill, setSelectedWaybill] =
		useState<AcceptanceWaybillDocument | null>(() =>
			isDemoShowcaseMode() ? createSampleDentalWaybill() : null,
		);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const draftState = useDraftWaybillState();
	const expressState = useExpressWaybillState(
		inventoryItems,
		onWaybillPosted,
		onRefreshStock,
		(doc) => {
			setWaybillsList((prev) => [doc, ...prev]);
			setSelectedWaybill(doc);
		},
	);

	const handlePostWaybill = async (
		waybillToPost: AcceptanceWaybillDocument,
	) => {
		if (waybillToPost.items.length === 0) {
			showToast("Добавьте хотя бы одну позицию в накладную", "warning");
			return;
		}
		const postedDoc: AcceptanceWaybillDocument = {
			...waybillToPost,
			status: "posted",
			postedAt: new Date().toISOString(),
		};
		const overdraftItems = inventoryItems.filter(
			(inv) => Number(inv.stockQuantity) < 0,
		);
		let resolvedCount = 0;
		for (const wbItem of postedDoc.items) {
			const matching = overdraftItems.find((d) =>
				d.name.toLowerCase().includes(wbItem.name.toLowerCase().slice(0, 15)),
			);
			if (
				matching &&
				reconcileOverdraftOnReceipt(
					Number(matching.stockQuantity),
					wbItem.quantity,
				).clearedDeficit > 0
			) {
				resolvedCount++;
			}
		}
		setWaybillsList((prev) => [
			postedDoc,
			...prev.filter((w) => w.id !== postedDoc.id),
		]);
		setSelectedWaybill(postedDoc);
		setIsCreatingNew(false);
		if (onWaybillPosted) await onWaybillPosted(postedDoc);
		if (onRefreshStock) onRefreshStock();
		showToast(
			resolvedCount > 0
				? `Накладная №${postedDoc.waybillNumber} успешно проведена. Погашен овердрафт: ${resolvedCount} поз.`
				: `Накладная №${postedDoc.waybillNumber} проведена. Склад пополнен.`,
			"success",
		);
	};

	const handlePrintTorg12 = (wb: AcceptanceWaybillDocument) => {
		const html = generateTorg12Html(wb);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 300);
		}
	};

	const handleExportCsv = (wb: AcceptanceWaybillDocument) => {
		const csvContent = exportWaybillToCsv(wb);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.setAttribute(
			"download",
			`torg12_${wb.waybillNumber.replace(/\//g, "_")}.csv`,
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		showToast("Накладная экспортирована в CSV", "info");
	};

	const handleStartCreateNew = () => {
		setIsCreatingNew(true);
		draftState.resetDraft();
	};

	const filteredWaybills = useMemo(() => {
		if (!searchQuery.trim()) return waybillsList;
		const q = searchQuery.toLowerCase();
		return waybillsList.filter(
			(w) =>
				w.waybillNumber.toLowerCase().includes(q) ||
				w.supplier.name.toLowerCase().includes(q),
		);
	}, [waybillsList, searchQuery]);

	return {
		waybillsList,
		setWaybillsList,
		selectedWaybill,
		setSelectedWaybill,
		isCreatingNew,
		setIsCreatingNew,
		searchQuery,
		setSearchQuery,
		draftWaybill: draftState.draftWaybill,
		setDraftWaybill: draftState.setDraftWaybill,
		handleAddTemplateItem: draftState.handleAddTemplateItem,
		handleRemoveDraftItem: draftState.handleRemoveDraftItem,
		handleChangeSupplier: draftState.handleChangeSupplier,
		handleChangeWaybillNumber: draftState.handleChangeWaybillNumber,
		handleChangeReceiptDate: draftState.handleChangeReceiptDate,
		...expressState,
		handlePostWaybill,
		handlePrintTorg12,
		handleExportCsv,
		handleStartCreateNew,
		filteredWaybills,
	};
}
