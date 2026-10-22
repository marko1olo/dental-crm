import { useCallback, useMemo, useState } from "react";
import {
	calculateTransferTotals,
	validateTransferDraft,
	type WarehouseDiscrepancyAct,
	type WarehouseTransferDocument,
} from "./warehouseTransferEngine.js";
import {
	getWarehouseItemCatalogPreset,
	WAREHOUSE_CATALOG_PRESETS,
	type WarehouseBranchId,
	type WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";
import { useWarehouseTransferPrintHandlers } from "./useWarehouseTransferPrintHandlers.js";
import { useWarehouseTransferItemsState } from "./useWarehouseTransferItemsState.js";

export interface UseWarehouseTransferLogicProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialDocument?: WarehouseTransferDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseTransferDocument) => void) | undefined;
	readonly onConfirmTransfer?: ((doc?: WarehouseTransferDocument) => void | Promise<void>) | undefined;
	readonly onDiscrepancyActGenerated?: ((act: WarehouseDiscrepancyAct) => void) | undefined;
}

export function useWarehouseTransferLogic(props: UseWarehouseTransferLogicProps) {
	const { isOpen, onClose, initialDocument, onDocumentSaved, onConfirmTransfer, onDiscrepancyActGenerated } = props;

	const [docNumber, setDocNumber] = useState<string>(
		initialDocument?.documentNumber ||
			`ПЕРЕМ-${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}-${Date.now().toString().slice(-4)}`,
	);
	const [docDate, setDocDate] = useState<string>(initialDocument?.documentDate || new Date().toISOString().slice(0, 10));
	const [sourceBranchId, setSourceBranchId] = useState<WarehouseBranchId>(initialDocument?.sourceBranchId || "central_hub");
	const [targetBranchId, setTargetBranchId] = useState<WarehouseBranchId>(initialDocument?.targetBranchId || "branch_center");
	const [status, setStatus] = useState<WarehouseTransferStatus>(initialDocument?.status || "draft");

	const [dispatchedBy] = useState<string>(initialDocument?.dispatchedByFullName || "");
	const [dispatchedPosition] = useState<string>(initialDocument?.dispatchedByPosition || "Материально ответственное лицо");
	const [receivedBy] = useState<string>(initialDocument?.receivedByFullName || "");
	const [receivedPosition] = useState<string>(initialDocument?.receivedByPosition || "Получатель ТМЦ");
	const [driverName] = useState<string>(initialDocument?.transportDriverFullName || "");
	const [vehiclePlate] = useState<string>(initialDocument?.transportVehiclePlate || "");
	const [notes] = useState<string>(initialDocument?.notes || "");

	const {
		items, selectedCatalogItemId, setSelectedCatalogItemId, addQuantity, setAddQuantity,
		handleAddItem, handleRemoveItem, handleUpdateItem,
	} = useWarehouseTransferItemsState(isOpen, initialDocument);

	const getAvailableStock = useCallback((itemId: string): number => {
		const preset = getWarehouseItemCatalogPreset(itemId);
		return preset?.initialStockByBranch[sourceBranchId] ?? 0;
	}, [sourceBranchId]);

	const overdraftItems = useMemo(() => items.filter((item) => {
		const stock = getAvailableStock(item.itemId);
		const requiredQty = item.dispatchedQuantity > 0 ? item.dispatchedQuantity : item.requestedQuantity;
		return requiredQty > stock;
	}), [items, getAvailableStock]);

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

	const { handleSaveDocument, handleOneClickWriteOff, handlePrintTorg13, handlePrintTorg2 } =
		useWarehouseTransferPrintHandlers({
			initialDocument, docNumber, docDate, sourceBranchId, targetBranchId, status, items,
			dispatchedBy, dispatchedPosition, receivedBy, receivedPosition, driverName, vehiclePlate, notes,
			hasOverdraft, onConfirmTransfer, onDocumentSaved, onDiscrepancyActGenerated, onClose,
		});

	return {
		docNumber, setDocNumber, docDate, setDocDate, sourceBranchId, setSourceBranchId, targetBranchId, setTargetBranchId,
		status, setStatus, items, selectedCatalogItemId, setSelectedCatalogItemId, addQuantity, setAddQuantity,
		getAvailableStock, overdraftItems, hasOverdraft, totals, validation,
		handleAddItem, handleRemoveItem, handleUpdateItem, handleSaveDocument, handleOneClickWriteOff, handlePrintTorg13, handlePrintTorg2,
	};
}
