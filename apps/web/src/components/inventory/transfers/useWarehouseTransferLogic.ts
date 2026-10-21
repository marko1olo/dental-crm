import { useCallback, useEffect, useMemo, useState } from "react";
import { showToast } from "../../GlobalToast.js";
import {
	calculateTransferTotals,
	generateDiscrepancyAct,
	generateTorg13Html,
	generateTorg2Html,
	validateTransferDraft,
	type WarehouseDiscrepancyAct,
	type WarehouseTransferDocument,
	type WarehouseTransferLineItem,
} from "./warehouseTransferEngine.js";
import {
	getWarehouseItemCatalogPreset,
	WAREHOUSE_CATALOG_PRESETS,
	type WarehouseBranchId,
	type WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";

export interface UseWarehouseTransferLogicProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocument?: WarehouseTransferDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseTransferDocument) => void) | undefined;
	readonly onConfirmTransfer?: ((doc?: WarehouseTransferDocument) => void | Promise<void>) | undefined;
	readonly onDiscrepancyActGenerated?: ((act: WarehouseDiscrepancyAct) => void) | undefined;
}

export function useWarehouseTransferLogic(props: UseWarehouseTransferLogicProps) {
	const {
		isOpen,
		onClose,
		initialDocument,
		onDocumentSaved,
		onConfirmTransfer,
		onDiscrepancyActGenerated,
	} = props;

	const [docNumber, setDocNumber] = useState<string>(
		initialDocument?.documentNumber ||
			`ПЕРЕМ-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-4)}`,
	);
	const [docDate, setDocDate] = useState<string>(
		initialDocument?.documentDate || new Date().toISOString().slice(0, 10),
	);
	const [sourceBranchId, setSourceBranchId] = useState<WarehouseBranchId>(
		initialDocument?.sourceBranchId || "central_hub",
	);
	const [targetBranchId, setTargetBranchId] = useState<WarehouseBranchId>(
		initialDocument?.targetBranchId || "branch_center",
	);
	const [status, setStatus] = useState<WarehouseTransferStatus>(
		initialDocument?.status || "draft",
	);

	const [dispatchedBy] = useState<string>(initialDocument?.dispatchedByFullName || "");
	const [dispatchedPosition] = useState<string>(
		initialDocument?.dispatchedByPosition || "Материально ответственное лицо",
	);
	const [receivedBy] = useState<string>(initialDocument?.receivedByFullName || "");
	const [receivedPosition] = useState<string>(initialDocument?.receivedByPosition || "Получатель ТМЦ");
	const [driverName] = useState<string>(initialDocument?.transportDriverFullName || "");
	const [vehiclePlate] = useState<string>(initialDocument?.transportVehiclePlate || "");
	const [notes] = useState<string>(initialDocument?.notes || "");

	const [items, setItems] = useState<WarehouseTransferLineItem[]>([]);
	const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<string>(
		WAREHOUSE_CATALOG_PRESETS[0]?.id || "mat_ultracain_forte",
	);
	const [addQuantity, setAddQuantity] = useState<number>(5);

	useEffect(() => {
		if (isOpen) {
			if (initialDocument && initialDocument.items.length > 0) {
				setItems([...initialDocument.items]);
			} else {
				setItems([
					{
						itemId: "mat_ultracain_forte", sku: "AN-ULTRA-01", nameRu: "Ультракаин Д-С Форте (100 карпул/уп)",
						unitRu: "упак", okeiCode: "778", batchNumber: "LOT-2026A44", expiryDate: "2027-12-31",
						requestedQuantity: 10, dispatchedQuantity: 10, receivedQuantity: 10,
						unitCostKopecks: 650000, discrepancyType: "none",
					},
					{
						itemId: "mat_impl_osstem_40_10", sku: "IMP-OSST-4010", nameRu: "Дентальный имплантат Osstem TS III SA Ø4.0 x 10 мм",
						unitRu: "шт", okeiCode: "796", batchNumber: "LOT-OS-5541", expiryDate: "2029-06-30",
						requestedQuantity: 5, dispatchedQuantity: 5, receivedQuantity: 5,
						unitCostKopecks: 1250000, discrepancyType: "none",
					},
					{
						itemId: "mat_filtek_ultimate_a2", sku: "COMP-FILT-A2", nameRu: "Композит Filtek Ultimate шприц 4г (Enamel A2)",
						unitRu: "шт", okeiCode: "796", batchNumber: "LOT-FLT-772", expiryDate: "2027-05-15",
						requestedQuantity: 4, dispatchedQuantity: 4, receivedQuantity: 4,
						unitCostKopecks: 420000, discrepancyType: "none",
					},
				]);
			}
		}
	}, [isOpen, initialDocument]);

	const getAvailableStock = useCallback(
		(itemId: string): number => {
			const preset = getWarehouseItemCatalogPreset(itemId);
			return preset?.initialStockByBranch[sourceBranchId] ?? 0;
		},
		[sourceBranchId],
	);

	const overdraftItems = useMemo(() => {
		return items.filter((item) => {
			const stock = getAvailableStock(item.itemId);
			const requiredQty = item.dispatchedQuantity > 0 ? item.dispatchedQuantity : item.requestedQuantity;
			return requiredQty > stock;
		});
	}, [items, getAvailableStock]);

	const hasOverdraft = overdraftItems.length > 0;

	const stockByBranchMap = useMemo(() => {
		const map: Record<WarehouseBranchId, Record<string, number>> = {
			central_hub: {}, branch_center: {}, branch_north: {}, branch_south: {},
		};
		for (const preset of WAREHOUSE_CATALOG_PRESETS) {
			for (const bId of Object.keys(preset.initialStockByBranch) as WarehouseBranchId[]) {
				map[bId][preset.id] = preset.initialStockByBranch[bId];
			}
		}
		return map;
	}, []);

	const totals = useMemo(() => calculateTransferTotals(items), [items]);
	const validation = useMemo(() => validateTransferDraft(sourceBranchId, targetBranchId, items, stockByBranchMap), [sourceBranchId, targetBranchId, items, stockByBranchMap]);

	const handleAddItem = () => {
		const preset = getWarehouseItemCatalogPreset(selectedCatalogItemId);
		if (!preset) return;
		const existingIndex = items.findIndex((i) => i.itemId === preset.id);
		if (existingIndex >= 0) {
			const updated = [...items];
			const current = updated[existingIndex]!;
			updated[existingIndex] = {
				...current,
				requestedQuantity: current.requestedQuantity + addQuantity,
				dispatchedQuantity: current.dispatchedQuantity + addQuantity,
				receivedQuantity: current.receivedQuantity + addQuantity,
			};
			setItems(updated);
			return;
		}

		setItems((prev) => [
			...prev,
			{
				itemId: preset.id, sku: preset.sku, nameRu: preset.nameRu, unitRu: preset.unitRu, okeiCode: preset.okeiCode,
				batchNumber: preset.defaultBatchNumber, expiryDate: "2027-12-31", requestedQuantity: addQuantity,
				dispatchedQuantity: addQuantity, receivedQuantity: addQuantity, unitCostKopecks: preset.unitCostKopecks,
				discrepancyType: "none",
			},
		]);
		setAddQuantity(1);
	};

	const handleRemoveItem = (index: number) => {
		setItems((prev) => prev.filter((_, i) => i !== index));
	};

	const handleUpdateItem = (index: number, patch: Partial<WarehouseTransferLineItem>) => {
		setItems((prev) => {
			const updated = [...prev];
			const current = updated[index];
			if (current) updated[index] = { ...current, ...patch };
			return updated;
		});
	};

	const handleSaveDocument = (newStatus?: WarehouseTransferStatus) => {
		const effectiveStatus = newStatus || status;
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber, documentDate: docDate, sourceBranchId, targetBranchId, status: effectiveStatus, items,
			dispatchedByFullName: dispatchedBy, dispatchedByPosition: dispatchedPosition, receivedByFullName: receivedBy,
			receivedByPosition: receivedPosition, transportDriverFullName: driverName || undefined, transportVehiclePlate: vehiclePlate || undefined,
			notes: notes.trim()
				? `${notes.trim()}${hasOverdraft ? " [Внимание: списание с дефицитом]" : ""}`
				: hasOverdraft ? "Внимание: списание с дефицитом (расход сверх остатка)" : undefined,
		};
		if (onConfirmTransfer && effectiveStatus === "dispatched") void onConfirmTransfer(doc);
		if (onDocumentSaved) onDocumentSaved(doc);
		onClose();
	};

	const handleOneClickWriteOff = () => {
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber, documentDate: docDate, sourceBranchId, targetBranchId, status: "dispatched", items,
			dispatchedByFullName: dispatchedBy || "Дежурная медсестра", dispatchedByPosition: dispatchedPosition || "Материально ответственное лицо",
			receivedByFullName: receivedBy || "Дежурная медсестра", receivedByPosition: receivedPosition || "Получатель ТМЦ",
			transportDriverFullName: driverName || undefined, transportVehiclePlate: vehiclePlate || undefined,
			notes: `${notes ? `${notes}. ` : ""}Списание материалов дежурной медсестрой (СанПиН 3.3686-21)${hasOverdraft ? ". Внимание: расход сверх остатка (списание с дефицитом)." : ""}`,
		};
		if (onConfirmTransfer) void onConfirmTransfer(doc);
		else if (onDocumentSaved) onDocumentSaved(doc);
		if (hasOverdraft) {
			showToast("Быстрое списание выполнено (расход сверх остатка, списание с дефицитом)", "warning");
		} else {
			showToast("Списание ТМЦ успешно оформлено медсестрой без комиссии из 3 человек", "success");
		}
		onClose();
	};

	const handlePrintTorg13 = () => {
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber, documentDate: docDate, sourceBranchId, targetBranchId, status, items,
			dispatchedByFullName: dispatchedBy, dispatchedByPosition: dispatchedPosition, receivedByFullName: receivedBy,
			receivedByPosition: receivedPosition, transportDriverFullName: driverName || undefined, transportVehiclePlate: vehiclePlate || undefined,
		};
		const html = generateTorg13Html(doc);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	};

	const handlePrintTorg2 = () => {
		const doc: WarehouseTransferDocument = {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber, documentDate: docDate, sourceBranchId, targetBranchId, status, items,
			dispatchedByFullName: dispatchedBy, dispatchedByPosition: dispatchedPosition, receivedByFullName: receivedBy,
			receivedByPosition: receivedPosition, transportDriverFullName: driverName || undefined, transportVehiclePlate: vehiclePlate || undefined,
		};
		const soloCommission = [{
			name: receivedBy || dispatchedBy || "Дежурная медсестра / Завскладом",
			position: receivedPosition || dispatchedPosition || "Материально ответственное лицо",
		}];
		const act = generateDiscrepancyAct(doc, soloCommission);
		if (onDiscrepancyActGenerated) onDiscrepancyActGenerated(act);
		const html = generateTorg2Html(act);
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			setTimeout(() => printWin.print(), 250);
		}
	};

	return {
		docNumber, setDocNumber, docDate, setDocDate, sourceBranchId, setSourceBranchId, targetBranchId, setTargetBranchId,
		status, setStatus, items, selectedCatalogItemId, setSelectedCatalogItemId, addQuantity, setAddQuantity,
		getAvailableStock, overdraftItems, hasOverdraft, totals, validation,
		handleAddItem, handleRemoveItem, handleUpdateItem, handleSaveDocument, handleOneClickWriteOff, handlePrintTorg13, handlePrintTorg2,
	};
}
