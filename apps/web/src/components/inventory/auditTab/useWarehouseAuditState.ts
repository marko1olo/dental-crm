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
	exportInv19DiscrepanciesToCsv,
	exportInventoryTo1C,
	exportInventoryToCsv,
	generateInv19Html,
	generateInv3Html,
	generateTorg16ActFromInventory,
	sortAuditItemsByFefo,
	validateInventoryAuditDraft,
} from "../warehouseInventoryEngine.js";

export type InventoryCategoryFilter =
	| "all"
	| "anesthetics"
	| "filling"
	| "sterilization"
	| "disposables";

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
	const [branchNameRu] = useState<string>(
		initialDocument?.branchNameRu || "Центральный распределительный склад (ЦС)",
	);
	const [warehouseNameRu] = useState<string>(
		initialDocument?.warehouseNameRu || "Главный склад расходных материалов",
	);
	const [molFullName] = useState<string>(initialDocument?.molFullName || "Ответственный сотрудник");
	const [molPosition] = useState<string>(initialDocument?.molPosition || "Ответственный сотрудник");
	const [status, setStatus] = useState<WarehouseInventoryStatus>(initialDocument?.status || "reconciliation");
	const [commission] = useState<readonly WarehouseInventoryCommissionMember[]>(
		initialDocument?.commission || (isDemoShowcaseMode() ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS),
	);

	const [items, setItems] = useState<readonly WarehouseAuditItemLine[]>([]);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [filterTab, setFilterTab] = useState<"all" | "discrepancies" | "expired" | "risk">("all");
	const [categoryFilter, setCategoryFilter] = useState<InventoryCategoryFilter>("all");
	const [sortOrder, setSortOrder] = useState<"default" | "fefo" | "discrepancy" | "name">("default");
	const [toastMessage, setToastMessage] = useState<string | null>(null);

	useEffect(() => {
		if (isOpen) {
			if (initialDocument && initialDocument.items.length > 0) {
				setItems([...initialDocument.items]);
			} else if (isDemoShowcaseMode()) {
				setItems([...DEFAULT_INVENTORY_ITEMS_PRESET]);
			} else {
				setItems([]);
			}
		}
	}, [isOpen, initialDocument]);

	const showToast = useCallback((msg: string) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3500);
	}, []);

	const handleQuantityChange = useCallback((itemId: string, newActual: number) => {
		setItems((prev) =>
			prev.map((it) => {
				if (it.itemId !== itemId) return it;
				return computeAuditLineItem({ ...it, actualQuantity: Math.max(0, newActual) });
			}),
		);
	}, []);

	const handleAutofillFactByBook = useCallback(() => {
		setItems((prev) => prev.map((it) => computeAuditLineItem({ ...it, actualQuantity: it.bookQuantity })));
		showToast("Факт приравнен к учету по всем строкам описи (расхождений нет).");
	}, [showToast]);

	const totals: InventoryAuditTotals = useMemo(() => calculateInventoryAuditTotals(items), [items]);

	const categoryCounts = useMemo(() => {
		const counts = { all: items.length, anesthetics: 0, filling: 0, sterilization: 0, disposables: 0 };
		for (const it of items) {
			const cat = it.category.toLowerCase();
			if (cat.includes("анест")) counts.anesthetics++;
			else if (cat.includes("терап") || cat.includes("пломб") || cat.includes("композ")) counts.filling++;
			else if (cat.includes("стерил") || cat.includes("дезинф")) counts.sterilization++;
			else counts.disposables++;
		}
		return counts;
	}, [items]);

	const currentDocument: WarehouseInventoryAuditDocument = useMemo(() => {
		return {
			id: initialDocument?.id || `doc-${Date.now()}`,
			documentNumber: docNumber,
			orderNumber,
			orderDate,
			auditStartDate: initialDocument?.auditStartDate || orderDate || auditDate,
			auditEndDate: initialDocument?.auditEndDate || auditDate,
			auditDate,
			branchId: initialDocument?.branchId || "branch-main",
			branchNameRu,
			warehouseNameRu,
			molFullName,
			molPosition,
			status,
			commission,
			items,
			totals,
			notes: initialDocument?.notes,
			organizationNameRu: initialDocument?.organizationNameRu || 'ООО "ДЕНТЕ КЛИНИК"',
			organizationOkpo: initialDocument?.organizationOkpo || "12345678",
			organizationInn: initialDocument?.organizationInn || "7701234567",
		};
	}, [
		initialDocument?.id,
		initialDocument?.auditStartDate,
		initialDocument?.auditEndDate,
		initialDocument?.branchId,
		initialDocument?.notes,
		initialDocument?.organizationNameRu,
		initialDocument?.organizationOkpo,
		initialDocument?.organizationInn,
		docNumber,
		orderNumber,
		orderDate,
		auditDate,
		branchNameRu,
		warehouseNameRu,
		molFullName,
		molPosition,
		status,
		commission,
		items,
		totals,
	]);

	const handlePrintDocument = useCallback((html: string) => {
		if (typeof window === "undefined") return;
		const printWin = window.open("", "_blank");
		if (printWin) {
			printWin.document.open();
			printWin.document.write(html);
			printWin.document.close();
			printWin.focus();
			printWin.print();
		}
	}, []);

	const handleExportCsv = useCallback(() => {
		const csv = exportInventoryToCsv(currentDocument);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Инвентаризация_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Опись экспортирована в формате CSV (Excel UTF-8 BOM).");
	}, [currentDocument, showToast]);

	const handleExportInv19Csv = useCallback(() => {
		const csv = exportInv19DiscrepanciesToCsv(currentDocument);
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Сличительная_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Сличительная ведомость расхождений выгружена в CSV.");
	}, [currentDocument, showToast]);

	const handleExport1C = useCallback(() => {
		const xml = exportInventoryTo1C(currentDocument);
		const blob = new Blob([xml], { type: "application/xml;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `Инвентаризация_1C_${currentDocument.documentNumber.replace(/[\/\\]/g, "_")}.xml`;
		a.click();
		URL.revokeObjectURL(url);
		showToast("Документ инвентаризации выгружен в формате XML CommerceML.");
	}, [currentDocument, showToast]);

	const handleCreateTorg16 = useCallback(() => {
		const act = generateTorg16ActFromInventory(currentDocument);
		onTorg16Generated?.(act);
		showToast(`Сформирован акт списания ТОРГ-16 № ${act.actNumber} на сумму ${(act.totalCostKopecks / 100).toFixed(2)} ₽`);
	}, [currentDocument, onTorg16Generated, showToast]);

	const handleSave = useCallback(() => {
		const validation = validateInventoryAuditDraft(currentDocument);
		if (!validation.isValid) {
			showToast(`Ошибка валидации: ${validation.errors.join(", ")}`);
			return;
		}
		setStatus("approved");
		onDocumentSaved?.({ ...currentDocument, status: "approved" });
		showToast("Инвентаризационная опись сохранена (статус: Утверждена).");
	}, [currentDocument, onDocumentSaved, showToast]);

	const handleApply = useCallback(async () => {
		const validation = validateInventoryAuditDraft(currentDocument);
		if (!validation.isValid) {
			showToast(`Ошибка: ${validation.errors.join(", ")}`);
			return;
		}
		setStatus("applied");
		const appliedDoc: WarehouseInventoryAuditDocument = { ...currentDocument, status: "applied" };
		if (onApplyAudit) {
			await onApplyAudit(appliedDoc);
		}
		showToast("Инвентаризация успешно проведена! Остатки на складе скорректированы.");
	}, [currentDocument, onApplyAudit, showToast]);

	const filteredItems = useMemo(() => {
		let result = [...items];
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			result = result.filter(
				(it) => it.nameRu.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.batchNumber.toLowerCase().includes(q),
			);
		}
		if (filterTab === "discrepancies") result = result.filter((it) => it.discrepancyType !== "match");
		else if (filterTab === "expired") result = result.filter((it) => it.fefoStatus === "expired");
		else if (filterTab === "risk") result = result.filter((it) => it.fefoStatus === "warning_30" || it.fefoStatus === "warning_60");

		if (categoryFilter !== "all") {
			result = result.filter((it) => {
				const cat = it.category.toLowerCase();
				if (categoryFilter === "anesthetics") return cat.includes("анест");
				if (categoryFilter === "filling") return cat.includes("терап") || cat.includes("пломб") || cat.includes("композ");
				if (categoryFilter === "sterilization") return cat.includes("стерил") || cat.includes("дезинф");
				return !cat.includes("анест") && !cat.includes("терап") && !cat.includes("пломб") && !cat.includes("стерил");
			});
		}

		if (sortOrder === "fefo") result = sortAuditItemsByFefo(result);
		else if (sortOrder === "discrepancy") result.sort((a, b) => Math.abs(b.discrepancyCostKopecks) - Math.abs(a.discrepancyCostKopecks));
		else if (sortOrder === "name") result.sort((a, b) => a.nameRu.localeCompare(b.nameRu, "ru"));

		return result;
	}, [items, searchQuery, filterTab, categoryFilter, sortOrder]);

	return {
		docNumber,
		orderNumber,
		orderDate,
		warehouseNameRu,
		molFullName,
		molPosition,
		status,
		commission,
		items,
		searchQuery,
		setSearchQuery,
		filterTab,
		setFilterTab,
		categoryFilter,
		setCategoryFilter,
		sortOrder,
		setSortOrder,
		toastMessage,
		totals,
		categoryCounts,
		currentDocument,
		filteredItems,
		handleQuantityChange,
		handleAutofillFactByBook,
		handlePrintDocument,
		handleExportCsv,
		handleExportInv19Csv,
		handleExport1C,
		handleCreateTorg16,
		handleSave,
		handleApply,
	};
}
