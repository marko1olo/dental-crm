import { showToast } from "../../GlobalToast.js";
import type {
	WarehouseDiscrepancyAct,
	WarehouseTransferDocument,
	WarehouseTransferLineItem,
} from "./warehouseTransferEngine.js";
import type {
	WarehouseBranchId,
	WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";
import {
	printTorg13Document,
	printTorg2Document,
} from "./warehouseTransferPrintUtils.js";

export function useWarehouseTransferPrintHandlers({
	initialDocument, docNumber, docDate, sourceBranchId, targetBranchId, status, items,
	dispatchedBy, dispatchedPosition, receivedBy, receivedPosition, driverName, vehiclePlate, notes,
	hasOverdraft, onConfirmTransfer, onDocumentSaved, onDiscrepancyActGenerated, onClose,
}: {
	initialDocument?: WarehouseTransferDocument | undefined;
	docNumber: string;
	docDate: string;
	sourceBranchId: WarehouseBranchId;
	targetBranchId: WarehouseBranchId;
	status: WarehouseTransferStatus;
	items: readonly WarehouseTransferLineItem[];
	dispatchedBy: string;
	dispatchedPosition: string;
	receivedBy: string;
	receivedPosition: string;
	driverName: string;
	vehiclePlate: string;
	notes: string;
	hasOverdraft: boolean;
	onConfirmTransfer?: ((doc?: WarehouseTransferDocument) => void | Promise<void>) | undefined;
	onDocumentSaved?: ((doc: WarehouseTransferDocument) => void) | undefined;
	onDiscrepancyActGenerated?: ((act: WarehouseDiscrepancyAct) => void) | undefined;
	onClose: () => void;
}) {
	const buildTransferDoc = (effectiveStatus: WarehouseTransferStatus): WarehouseTransferDocument => ({
		id: initialDocument?.id || `doc-${Date.now()}`,
		documentNumber: docNumber, documentDate: docDate, sourceBranchId, targetBranchId, status: effectiveStatus, items,
		dispatchedByFullName: dispatchedBy, dispatchedByPosition: dispatchedPosition, receivedByFullName: receivedBy,
		receivedByPosition: receivedPosition, transportDriverFullName: driverName || undefined, transportVehiclePlate: vehiclePlate || undefined,
		notes: notes.trim()
			? `${notes.trim()}${hasOverdraft ? " [Внимание: списание с дефицитом]" : ""}`
			: hasOverdraft ? "Внимание: списание с дефицитом (расход сверх остатка)" : undefined,
	});

	const handleSaveDocument = (newStatus?: WarehouseTransferStatus) => {
		const effectiveStatus = newStatus || status;
		const doc = buildTransferDoc(effectiveStatus);
		if (onConfirmTransfer && effectiveStatus === "dispatched") void onConfirmTransfer(doc);
		if (onDocumentSaved) onDocumentSaved(doc);
		onClose();
	};

	const handleOneClickWriteOff = () => {
		const doc: WarehouseTransferDocument = {
			...buildTransferDoc("dispatched"),
			dispatchedByFullName: dispatchedBy || "Дежурная медсестра",
			dispatchedByPosition: dispatchedPosition || "Материально ответственное лицо",
			receivedByFullName: receivedBy || "Дежурная медсестра",
			receivedByPosition: receivedPosition || "Получатель ТМЦ",
			notes: `${notes ? `${notes}. ` : ""}Списание материалов дежурной медсестрой (СанПиН 3.3686-21)${hasOverdraft ? ". Внимание: расход сверх остатка (списание с дефицитом)." : ""}`,
		};
		if (onConfirmTransfer) void onConfirmTransfer(doc);
		else if (onDocumentSaved) onDocumentSaved(doc);
		showToast(hasOverdraft ? "Быстрое списание выполнено (расход сверх остатка, списание с дефицитом)" : "Списание ТМЦ успешно оформлено медсестрой без комиссии из 3 человек", hasOverdraft ? "warning" : "success");
		onClose();
	};

	const handlePrintTorg13 = () => printTorg13Document(buildTransferDoc(status));
	const handlePrintTorg2 = () => printTorg2Document(buildTransferDoc(status), onDiscrepancyActGenerated);

	return {
		handleSaveDocument,
		handleOneClickWriteOff,
		handlePrintTorg13,
		handlePrintTorg2,
	};
}
