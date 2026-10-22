import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	type AcceptanceWaybillDocument,
	CANONICAL_DENTAL_SUPPLIERS,
	createSampleDentalWaybill,
} from "../acceptanceWaybillsEngine.js";
import { useAcceptanceWaybillsItemsManager } from "./useAcceptanceWaybillsItemsManager.js";
import { useAcceptanceWaybillsApiPoster } from "./useAcceptanceWaybillsApiPoster.js";

export interface UseAcceptanceWaybillsStateProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly organizationId?: string | undefined;
	readonly initialWaybill?: AcceptanceWaybillDocument | undefined;
	readonly onWaybillPosted?: ((waybill: AcceptanceWaybillDocument) => void | Promise<void>) | undefined;
	readonly inventoryItems?: readonly {
		readonly id: string;
		readonly name: string;
		readonly stockQuantity: number;
		readonly unitCostRub?: string | undefined;
		readonly unit?: string | undefined;
	}[] | undefined;
	readonly getHeaders?: ((extra?: Record<string, string>) => Record<string, string>) | undefined;
}

export function useAcceptanceWaybillsState({
	isOpen,
	onClose,
	organizationId,
	initialWaybill,
	onWaybillPosted,
	inventoryItems = [],
	getHeaders,
}: UseAcceptanceWaybillsStateProps) {
	const [waybill, setWaybill] = useState<AcceptanceWaybillDocument>(() =>
		initialWaybill || createSampleDentalWaybill(),
	);
	const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
		() => initialWaybill?.supplier.id || CANONICAL_DENTAL_SUPPLIERS[0]!.id,
	);
	const [isPosting, setIsPosting] = useState<boolean>(false);

	useEffect(() => {
		if (isOpen) {
			const initial = initialWaybill || createSampleDentalWaybill();
			setWaybill(initial);
			setSelectedSupplierId(initial.supplier.id);
		}
	}, [isOpen, initialWaybill]);

	const overdraftItemIds = useMemo(() => {
		const map = new Map<string, number>();
		for (const it of inventoryItems) {
			if (it.stockQuantity < 0) map.set(it.name.toLowerCase().trim(), it.stockQuantity);
		}
		return map;
	}, [inventoryItems]);

	const handleSupplierChange = useCallback((supplierId: string) => {
		setSelectedSupplierId(supplierId);
		const found = CANONICAL_DENTAL_SUPPLIERS.find((s) => s.id === supplierId);
		if (found) {
			setWaybill((prev) => ({ ...prev, supplier: found }));
		}
	}, []);

	const handleLoadSample = useCallback(() => {
		const sample = createSampleDentalWaybill();
		setWaybill(sample);
		setSelectedSupplierId(sample.supplier.id);
		showToast("Загружен образец накладной Стомторг (Септанест, Филтек, ОптиБонд)", "info");
	}, []);

	const {
		handleAddFromTemplate,
		handleAddEmptyItem,
		handleUpdateItem,
		handleRemoveItem,
		handleSortFefo,
	} = useAcceptanceWaybillsItemsManager(setWaybill);

	const {
		handlePrintTorg12,
		handleExportCsv,
		handlePostWaybill,
	} = useAcceptanceWaybillsApiPoster({
		waybill, organizationId, inventoryItems, getHeaders, onWaybillPosted, onClose, setIsPosting,
	});

	return {
		waybill, setWaybill, selectedSupplierId, isPosting, overdraftItemIds,
		handleSupplierChange, handleLoadSample, handleAddFromTemplate, handleAddEmptyItem,
		handleUpdateItem, handleRemoveItem, handleSortFefo, handlePrintTorg12, handleExportCsv, handlePostWaybill,
	};
}
