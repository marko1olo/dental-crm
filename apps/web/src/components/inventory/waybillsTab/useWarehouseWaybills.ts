import { useEffect, useMemo, useRef, useState } from "react";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	createSampleDentalWaybill,
} from "../acceptanceWaybillsEngine.js";
import type { WarehouseWaybillsTabProps } from "./types.js";
import { useDraftWaybillState } from "./useDraftWaybillState.js";
import { useExpressWaybillState } from "./useExpressWaybillState.js";
import {
	exportWaybillCsv,
	printWaybillTorg12,
} from "./useWarehouseWaybillsPrintExport.js";
import {
	fetchWaybillsFromApi,
	postWaybillToApi,
	reconcileOverdraftForWaybill,
} from "./waybillPostingUtils.js";

export function useWarehouseWaybills({
	organizationId, inventoryItems = [], onWaybillPosted, onRefreshStock,
}: WarehouseWaybillsTabProps) {
	const [waybillsList, setWaybillsList] = useState<AcceptanceWaybillDocument[]>(() =>
		isDemoShowcaseMode() ? [createSampleDentalWaybill()] : [],
	);
	const [selectedWaybill, setSelectedWaybill] = useState<AcceptanceWaybillDocument | null>(() =>
		isDemoShowcaseMode() ? createSampleDentalWaybill() : null,
	);
	const [isCreatingNew, setIsCreatingNew] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		if (!organizationId) return;
		let mounted = true;
		fetchWaybillsFromApi(organizationId).then((wbList) => {
			if (mounted && wbList.length > 0) {
				setWaybillsList(wbList);
				setSelectedWaybill(wbList[0] ?? null);
			}
		});
		return () => { mounted = false; };
	}, [organizationId]);

	const draftState = useDraftWaybillState();
	const expressState = useExpressWaybillState(inventoryItems, onWaybillPosted, onRefreshStock, (doc) => {
		setWaybillsList((prev) => [doc, ...prev]);
		setSelectedWaybill(doc);
	});

	const inFlightRef = useRef(false);

	const handlePostWaybill = async (waybillToPost: AcceptanceWaybillDocument) => {
		if (inFlightRef.current) return;
		if (waybillToPost.items.length === 0) {
			showToast("Добавьте хотя бы одну позицию в накладную", "warning");
			return;
		}
		inFlightRef.current = true;
		try {
			await postWaybillToApi(waybillToPost, organizationId);
			const postedDoc: AcceptanceWaybillDocument = {
				...waybillToPost,
				status: "posted",
				postedAt: new Date().toISOString(),
			};
			const resolvedCount = reconcileOverdraftForWaybill(postedDoc.items, inventoryItems);
			setWaybillsList((prev) => [postedDoc, ...prev.filter((w) => w.id !== postedDoc.id)]);
			setSelectedWaybill(postedDoc);
			setIsCreatingNew(false);
			if (onWaybillPosted) await onWaybillPosted(postedDoc);
			if (onRefreshStock) onRefreshStock();
			showToast(
				resolvedCount > 0
					? `Накладная №${postedDoc.waybillNumber} проведена. Погашен дефицит: ${resolvedCount} поз.`
					: `Накладная №${postedDoc.waybillNumber} проведена. Склад пополнен.`,
				"success",
			);
		} finally {
			inFlightRef.current = false;
		}
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
		waybillsList, setWaybillsList, selectedWaybill, setSelectedWaybill,
		isCreatingNew, setIsCreatingNew, searchQuery, setSearchQuery,
		draftWaybill: draftState.draftWaybill, setDraftWaybill: draftState.setDraftWaybill,
		handleAddTemplateItem: draftState.handleAddTemplateItem,
		handleRemoveDraftItem: draftState.handleRemoveDraftItem,
		handleChangeSupplier: draftState.handleChangeSupplier,
		handleChangeWaybillNumber: draftState.handleChangeWaybillNumber,
		handleChangeReceiptDate: draftState.handleChangeReceiptDate,
		...expressState, handlePostWaybill,
		handlePrintTorg12: printWaybillTorg12, handleExportCsv: exportWaybillCsv,
		handleStartCreateNew, filteredWaybills,
	};
}
