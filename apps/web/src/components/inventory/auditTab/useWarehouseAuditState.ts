import { useCallback, useEffect, useMemo, useState } from "react";
import { isDemoShowcaseMode } from "../../../utils/demoModeEngine.js";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	SOLO_DOCTOR_COMMISSION_MEMBERS,
	type InventoryAuditTotals,
	type WarehouseAuditItemLine,
	type WarehouseInventoryAuditDocument,
	type WarehouseInventoryCommissionMember,
	type WarehouseInventoryStatus,
	type WarehouseTorg16WriteoffAct,
	calculateInventoryAuditTotals,
	computeAuditLineItem,
} from "../warehouseInventoryEngine.js";
import {
	type InventoryCategoryFilter,
	useWarehouseAuditFiltering,
} from "./useWarehouseAuditFiltering.js";
import { useWarehouseAuditExportHandlers } from "./useWarehouseAuditExportHandlers.js";

export type { InventoryCategoryFilter };

export interface UseWarehouseAuditStateProps {
	readonly isOpen: boolean;
	readonly initialDocument?: WarehouseInventoryAuditDocument | undefined;
	readonly onDocumentSaved?: ((doc: WarehouseInventoryAuditDocument) => void) | undefined;
	readonly onApplyAudit?: ((doc: WarehouseInventoryAuditDocument) => void | Promise<void>) | undefined;
	readonly onTorg16Generated?: ((act: WarehouseTorg16WriteoffAct) => void) | undefined;
}

export function useWarehouseAuditState({
	isOpen,
	initialDocument,
	onDocumentSaved,
	onApplyAudit,
	onTorg16Generated,
}: UseWarehouseAuditStateProps) {
	const [docNumber, setDocNumber] = useState<string>(
		() => initialDocument?.documentNumber || `ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
	);
	const [orderNumber] = useState<string>(initialDocument?.orderNumber || "ПР-44/ИНВ");
	const [orderDate] = useState<string>(initialDocument?.orderDate || new Date().toISOString().slice(0, 10));
	const [auditDate] = useState<string>(initialDocument?.auditDate || new Date().toISOString().slice(0, 10));
	const [branchNameRu] = useState<string>(initialDocument?.branchNameRu || "Центральный распределительный склад (ЦС)");
	const [warehouseNameRu] = useState<string>(initialDocument?.warehouseNameRu || "Главный склад расходных материалов");
	const [molFullName] = useState<string>(initialDocument?.molFullName || "Ответственный сотрудник");
	const [molPosition] = useState<string>(initialDocument?.molPosition || "Ответственный сотрудник");
	const [status, setStatus] = useState<WarehouseInventoryStatus>(initialDocument?.status || "reconciliation");
	const [commission] = useState<readonly WarehouseInventoryCommissionMember[]>(
		initialDocument?.commission || (isDemoShowcaseMode() ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS),
	);

	const [items, setItems] = useState<readonly WarehouseAuditItemLine[]>([]);
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			if (initialDocument && initialDocument.items.length > 0) setItems([...initialDocument.items]);
			else if (isDemoShowcaseMode()) setItems([...DEFAULT_INVENTORY_ITEMS_PRESET]);
			else setItems([]);
		}
	}, [isOpen, initialDocument]);

	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3500);
	}, []);

	const handleQuantityChange = useCallback((itemId: string, newActual: number) => {
		setItems((prev) => prev.map((it) => (it.itemId !== itemId ? it : computeAuditLineItem({ ...it, actualQuantity: Math.max(0, newActual) }))));
	}, []);

	const handleAutofillFactByBook = useCallback(() => {
		setItems((prev) => prev.map((it) => computeAuditLineItem({ ...it, actualQuantity: it.bookQuantity })));
		showToast("Факт приравнен к учету по всем строкам описи (расхождений нет).");
	}, [showToast]);

	const totals: InventoryAuditTotals = useMemo(() => calculateInventoryAuditTotals(items), [items]);

	const {
		searchQuery, setSearchQuery, filterTab, setFilterTab, categoryFilter, setCategoryFilter,
		sortOrder, setSortOrder, categoryCounts, filteredItems,
	} = useWarehouseAuditFiltering(items);

	const currentDocument: WarehouseInventoryAuditDocument = useMemo(() => ({
		id: initialDocument?.id || `doc-${Date.now()}`,
		documentNumber: docNumber, orderNumber, orderDate,
		auditStartDate: initialDocument?.auditStartDate || orderDate || auditDate,
		auditEndDate: initialDocument?.auditEndDate || auditDate, auditDate,
		branchId: initialDocument?.branchId || "branch-main", branchNameRu, warehouseNameRu,
		molFullName, molPosition, status, commission, items, totals,
		notes: initialDocument?.notes,
		organizationNameRu: initialDocument?.organizationNameRu || 'ООО "ДЕНТЕ КЛИНИК"',
		organizationOkpo: initialDocument?.organizationOkpo || "12345678",
		organizationInn: initialDocument?.organizationInn || "7701234567",
	}), [
		initialDocument?.id, initialDocument?.auditStartDate, initialDocument?.auditEndDate, initialDocument?.branchId,
		initialDocument?.notes, initialDocument?.organizationNameRu, initialDocument?.organizationOkpo, initialDocument?.organizationInn,
		docNumber, orderNumber, orderDate, auditDate, branchNameRu, warehouseNameRu, molFullName, molPosition, status, commission, items, totals,
	]);

	const {
		handlePrintDocument, handleExportCsv, handleExportInv19Csv, handleExport1C, handleCreateTorg16, handleSave, handleApply,
	} = useWarehouseAuditExportHandlers({
		currentDocument, onDocumentSaved, onApplyAudit, onTorg16Generated, setStatus, showToast,
	});

	return {
		docNumber, orderNumber, orderDate, warehouseNameRu, molFullName, molPosition, status, commission,
		items, searchQuery, setSearchQuery, filterTab, setFilterTab, categoryFilter, setCategoryFilter,
		sortOrder, setSortOrder, toastMessage, totals, categoryCounts, currentDocument, filteredItems,
		handleQuantityChange, handleAutofillFactByBook, handlePrintDocument, handleExportCsv,
		handleExportInv19Csv, handleExport1C, handleCreateTorg16, handleSave, handleApply,
	};
}
