import {
	Activity,
	Clock,
	FileText,
	Layers,
	Package,
	Plus,
	Search,
	ShieldCheck,
	Sparkles,
	Syringe,
	Target,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../AppHelpers.js";
import { sliceDomList } from "../utils/domVirtualizationHelper.js";
import { isDemoShowcaseMode } from "../utils/demoModeEngine.js";

export type InventoryCategoryFilter =
	| "all"
	| "anesthesia"
	| "therapy"
	| "composite"
	| "disposables"
	| "surgery"
	| "endo";

export const INVENTORY_CATEGORIES: Array<{
	id: InventoryCategoryFilter;
	label: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{ id: "all", label: "Все", icon: Package },
	{ id: "anesthesia", label: "Анестезия", icon: Syringe },
	{ id: "therapy", label: "Терапия", icon: Sparkles },
	{ id: "composite", label: "Композиты", icon: Layers },
	{ id: "disposables", label: "Расходники", icon: ShieldCheck },
	{ id: "surgery", label: "Хирургия", icon: Activity },
	{ id: "endo", label: "Эндодонтия", icon: Target },
];
import { InventoryConfirmDialog } from "./inventory/InventoryConfirmDialog.js";
import { useInventoryLogic } from "./inventory/useInventoryLogic.js";
import { WarehousePackageWriteOffBar } from "./inventory/WarehousePackageWriteOffBar.js";
import { InventoryStockTable } from "./InventoryStockTable.js";
import {
	computeAuditLineItem,
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	SOLO_DOCTOR_COMMISSION_MEMBERS,
	type WarehouseAuditItemLine,
	type WarehouseInventoryAuditDocument,
} from "./inventory/warehouseInventoryEngine.js";
import { InventoryOperationsMenu } from "./inventory/InventoryOperationsMenu.js";
import { InventoryItemFormModal } from "./inventory/InventoryItemFormModal.js";
import { InventoryStockAdjustModal } from "./inventory/InventoryStockAdjustModal.js";
import { InventoryExternalModals } from "./inventory/InventoryExternalModals.js";
import { InventoryBatchFefoPanel } from "./InventoryBatchFefoPanel.js";
import { InventoryInboundInvoiceModal } from "./InventoryInboundInvoiceModal.js";
import { InventoryServiceUsagePanel } from "./InventoryServiceUsagePanel.js";
import { InventoryTopToolbar } from "./inventory/InventoryTopToolbar.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import {
	MobileInventoryGroupedList,
	type MobileInventoryCategoryType,
} from "./inventory/MobileInventoryGroupedList.js";

// 100% прозрачные реэкспорты декомпозированных модулей склада (Мандат 8b)
export * from "./InventoryStockTable.js";
export * from "./inventory/MobileInventoryGroupedList.js";
export * from "./InventoryBatchFefoPanel.js";
export * from "./InventoryInboundInvoiceModal.js";
export * from "./InventoryServiceUsagePanel.js";
export * from "./inventory/InventoryOperationsMenu.js";
export * from "./inventory/InventoryItemFormModal.js";
export * from "./inventory/InventoryStockAdjustModal.js";
export * from "./inventory/InventoryExternalModals.js";
export * from "./inventory/InventoryTopToolbar.js";

/**
 * Презентационный координатор складского модуля DENTE (Мандаты 8b, 8c, 8d, 8e, 8n).
 * Декомпозирован строго в пределах <= 800 строк.
 */
const InventoryViewInner: React.FC<{ organizationId: string }> = ({
	organizationId,
}) => {
	const inventory = useInventoryLogic(organizationId);
	const {
		items,
		isLoading,
		loadError,
		activeSubTab,
		setActiveSubTab,
		rulesList,
		searchQuery,
		setSearchQuery,
		showModal,
		setShowModal,
		editingItem,
		formData,
		setFormData,
		confirmDialog,
		setConfirmDialog,
		adjustingItem,
		setAdjustingItem,
		adjustAmount,
		setAdjustAmount,
		adjustType,
		setAdjustType,
		isAdjustingStock,
		isSavingItem,
		fetchItems,
		handleQuickWriteoffStandardKit,
		handleQuickWriteoffCarpules,
		isWritingOffCarpules,
		handleQuickWriteoffAnestheticCarpule,
		handleQuickWriteoffSterilizationKit,
		handleQuickWriteoffShiftBundle,
		handleQuickWriteoffVisitBundle,
		openAddModal,
		openEditModal,
		handleSaveItem,
		handleDeleteItem,
		handleAdjustStock,
		filteredItems,
		totalValue,
		lowStockCount,
		totalItems,
		getHeaders,
	} = inventory;

	// Локальные состояния открытия модальных окон
	const [isClinicalWriteoffOpen, setIsClinicalWriteoffOpen] = useState(false);
	const [isProcedureDeductionOpen, setIsProcedureDeductionOpen] = useState(false);
	const [isDeductingMaterials, setIsDeductingMaterials] = useState(false);
	const [isWarehouseTransferOpen, setIsWarehouseTransferOpen] = useState(false);
	const [isInventoryAuditOpen, setIsInventoryAuditOpen] = useState(false);
	const [isMdlpDisposalOpen, setIsMdlpDisposalOpen] = useState(false);
	const [isWarehouseManagerOpen, setIsWarehouseManagerOpen] = useState(false);
	const [isMdlpScanningOpen, setIsMdlpScanningOpen] = useState(false);
	const [isNurseCarpuleModalOpen, setIsNurseCarpuleModalOpen] = useState(false);
	const [isAcceptanceWaybillsOpen, setIsAcceptanceWaybillsOpen] = useState(false);
	const [isInboundInvoiceModalOpen, setIsInboundInvoiceModalOpen] = useState(false);
	const [isOpsMenuOpen, setIsOpsMenuOpen] = useState(false);
	const [isQuickPackagesOpen, setIsQuickPackagesOpen] = useState(false);
	const [stockViewMode, setStockViewMode] = useState<"standard" | "fefo">("standard");

	const [selectedCategory, setSelectedCategory] =
		useState<InventoryCategoryFilter>("all");

	// Виртуализация списка для слабых ноутбуков (Мандаты 8c, 8n)
	const [displayLimit, setDisplayLimit] = useState(40);

	React.useEffect(() => {
		setDisplayLimit(40);
	}, [searchQuery, activeSubTab, selectedCategory]);

	const categoryFilteredItems = useMemo(() => {
		const list = filteredItems ?? [];
		if (selectedCategory === "all") return list;
		return list.filter((item) => {
			const name = (item.name || "").toLowerCase();
			const cat = (item.category || "").toLowerCase();
			if (selectedCategory === "anesthesia") {
				return (
					cat.includes("анестез") ||
					name.includes("анестез") ||
					name.includes("карпул") ||
					name.includes("артикаин") ||
					name.includes("ультракаин") ||
					name.includes("септанест") ||
					name.includes("скандонест") ||
					name.includes("убистезин") ||
					name.includes("лидокаин")
				);
			}
			if (selectedCategory === "therapy") {
				return (
					cat.includes("терапи") ||
					name.includes("пломб") ||
					name.includes("бонд") ||
					name.includes("адгезив") ||
					name.includes("трави") ||
					name.includes("паста")
				);
			}
			if (selectedCategory === "composite") {
				return (
					cat.includes("композит") ||
					name.includes("композит") ||
					name.includes("filtek") ||
					name.includes("gradia") ||
					name.includes("estelite") ||
					name.includes("харизма") ||
					name.includes("спектрум")
				);
			}
			if (selectedCategory === "disposables") {
				return (
					cat.includes("расход") ||
					name.includes("расход") ||
					name.includes("перчатк") ||
					name.includes("маск") ||
					name.includes("нагрудник") ||
					name.includes("слюноотсос") ||
					name.includes("валик") ||
					name.includes("шприц")
				);
			}
			if (selectedCategory === "surgery") {
				return (
					cat.includes("хирург") ||
					name.includes("хирург") ||
					name.includes("имплант") ||
					name.includes("мембран") ||
					name.includes("шовн") ||
					name.includes("кост") ||
					name.includes("скальпель") ||
					name.includes("винт")
				);
			}
			if (selectedCategory === "endo") {
				return (
					cat.includes("эндо") ||
					name.includes("эндо") ||
					name.includes("гуттаперч") ||
					name.includes("файл") ||
					name.includes("силлер") ||
					name.includes("девавит") ||
					name.includes("бумажн")
				);
			}
			return true;
		});
	}, [filteredItems, selectedCategory]);

	const inventorySlice = useMemo(() => {
		return sliceDomList(categoryFilteredItems ?? [], displayLimit, 0);
	}, [categoryFilteredItems, displayLimit]);

	// Инициализация документа инвентаризации ИНВ-3/19
	const auditInitialDoc: WarehouseInventoryAuditDocument = useMemo(() => {
		const auditDate = new Date().toISOString().slice(0, 10);
		const isDemo = isDemoShowcaseMode();
		if (!items || items.length === 0) {
			return {
				id: `audit-${Date.now()}`,
				documentNumber: `ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
				orderNumber: "ПР-44/ИНВ",
				orderDate: auditDate,
				auditStartDate: auditDate,
				auditEndDate: auditDate,
				auditDate,
				branchId: organizationId,
				branchNameRu: "Центральное отделение",
				warehouseNameRu: "Главный склад расходных материалов",
				molFullName: "Ответственный сотрудник",
				molPosition: "Старшая медсестра / Администратор",
				status: "reconciliation" as const,
				commission: isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS,
				items: isDemo ? [...DEFAULT_INVENTORY_ITEMS_PRESET] : [],
				organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
				organizationOkpo: "49201948",
				organizationInn: "7701984512",
			};
		}
		const auditItems: WarehouseAuditItemLine[] = items.map((it, idx) => {
			const costRub = parseFloat(it.unitCostRub) || 0;
			const unitCostKopecks = Math.round(costRub * 100);
			const bookQuantity = Number(it.stockQuantity) || 0;
			const expiryDate = it.expirationDate || "2027-12-31";

			return computeAuditLineItem(
				{
					itemId: it.id,
					sku: it.sku || `SKU-${String(idx + 1).padStart(4, "0")}`,
					nameRu: it.name,
					category: it.category || "Расходные материалы",
					unitRu: it.unit || "шт.",
					okeiCode: "796",
					batchNumber: it.lotNumber || `ПАРТИЯ-${it.id.slice(0, 6)}`,
					expiryDate,
					storageLocationRu: "Основной стеллаж",
					bookQuantity,
					actualQuantity: bookQuantity,
					unitCostKopecks,
				},
				auditDate,
			);
		});

		return {
			id: `audit-${Date.now()}`,
			documentNumber: `ИНВ-${new Date().toISOString().slice(0, 7).replace("-", "/")}-001`,
			orderNumber: "ПР-44/ИНВ",
			orderDate: auditDate,
			auditStartDate: auditDate,
			auditEndDate: auditDate,
			auditDate,
			branchId: organizationId,
			branchNameRu: "Центральное отделение",
			warehouseNameRu: "Главный склад расходных материалов",
			molFullName: "Ответственный сотрудник",
			molPosition: "Старшая медсестра / Администратор",
			status: "reconciliation" as const,
			commission: isDemo ? DEFAULT_COMMISSION_MEMBERS : SOLO_DOCTOR_COMMISSION_MEMBERS,
			items: auditItems,
			organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
			organizationOkpo: "49201948",
			organizationInn: "7701984512",
		};
	}, [items, organizationId]);

	const paperSoftBg = "var(--paper-soft)";
	const borderColor = "var(--line)";

	const isMobile = useIsMobile(768);

	if (isLoading && items.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-[var(--muted)] gap-3">
				<Package size={20} />
				<span>Загрузка склада...</span>
			</div>
		);
	}

	if (isMobile) {
		return (
			<div className="w-full h-full flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
				<MobileInventoryGroupedList
					items={items}
					organizationId={organizationId}
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					onClearSearch={() => setSearchQuery("")}
					selectedCategory={
						selectedCategory === "therapy" || selectedCategory === "composite"
							? "filling"
							: (selectedCategory as MobileInventoryCategoryType)
					}
					onSelectCategory={(cat) => {
						setSelectedCategory(
							cat === "filling" ? "composite" : (cat as InventoryCategoryFilter),
						);
					}}
					onQuickDeduct={async (item, qty) => {
						const res = await fetch(
							`/api/inventory/${organizationId}/${item.id}/stock`,
							{
								method: "PATCH",
								headers: getHeaders({
									"Content-Type": "application/json",
								}),
								body: JSON.stringify({
									adjustment: -(qty || 1),
									allowOverdraft: true,
								}),
							},
						);
						if (res.ok) {
							fetchItems();
						}
					}}
					onReceiveItem={async (item, qty, lotNumber, expDate) => {
						const res = await fetch(
							`/api/inventory/${organizationId}/${item.id}/stock`,
							{
								method: "PATCH",
								headers: getHeaders({
									"Content-Type": "application/json",
								}),
								body: JSON.stringify({
									adjustment: qty || 1,
									allowOverdraft: true,
									lotNumber,
									expirationDate: expDate,
								}),
							},
						);
						if (res.ok) {
							fetchItems();
						}
					}}
					onSelectItem={(item) => openEditModal(item)}
					onEditItem={(item) => openEditModal(item)}
					onOpenAddModal={openAddModal}
					onOpenInboundInvoice={() => setIsInboundInvoiceModalOpen(true)}
					onOpenWaybills={() => setIsAcceptanceWaybillsOpen(true)}
					onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
					isWritingOffCarpules={isWritingOffCarpules}
					onRefresh={() => fetchItems()}
					money={money}
				/>

				{/* Modals & Dialogs on mobile */}
				<InventoryItemFormModal
					isOpen={showModal}
					onClose={() => setShowModal(false)}
					editingItem={editingItem}
					formData={formData}
					setFormData={setFormData}
					onSubmit={handleSaveItem}
					isSaving={isSavingItem}
				/>

				{confirmDialog?.isOpen && (
					<InventoryConfirmDialog
						title={confirmDialog.title}
						message={confirmDialog.message}
						onConfirm={confirmDialog.onConfirm}
						onCancel={() => setConfirmDialog(null)}
					/>
				)}

				<InventoryExternalModals
					organizationId={organizationId}
					items={items}
					auditInitialDoc={auditInitialDoc}
					isClinicalWriteoffOpen={isClinicalWriteoffOpen}
					onCloseClinicalWriteoff={() => setIsClinicalWriteoffOpen(false)}
					isProcedureDeductionOpen={isProcedureDeductionOpen}
					onCloseProcedureDeduction={() => setIsProcedureDeductionOpen(false)}
					isWarehouseTransferOpen={isWarehouseTransferOpen}
					onCloseWarehouseTransfer={() => setIsWarehouseTransferOpen(false)}
					isInventoryAuditOpen={isInventoryAuditOpen}
					onCloseInventoryAudit={() => setIsInventoryAuditOpen(false)}
					onOpenInventoryAudit={() => setIsInventoryAuditOpen(true)}
					isMdlpDisposalOpen={isMdlpDisposalOpen}
					onCloseMdlpDisposal={() => setIsMdlpDisposalOpen(false)}
					isWarehouseManagerOpen={isWarehouseManagerOpen}
					onCloseWarehouseManager={() => setIsWarehouseManagerOpen(false)}
					isMdlpScanningOpen={isMdlpScanningOpen}
					onCloseMdlpScanning={() => setIsMdlpScanningOpen(false)}
					isNurseCarpuleModalOpen={isNurseCarpuleModalOpen}
					onCloseNurseCarpuleModal={() => setIsNurseCarpuleModalOpen(false)}
					isAcceptanceWaybillsOpen={isAcceptanceWaybillsOpen}
					onCloseAcceptanceWaybills={() => setIsAcceptanceWaybillsOpen(false)}
					isInboundInvoiceModalOpen={isInboundInvoiceModalOpen}
					onCloseInboundInvoiceModal={() => setIsInboundInvoiceModalOpen(false)}
					isDeductingMaterials={isDeductingMaterials}
					setIsDeductingMaterials={setIsDeductingMaterials}
					fetchItems={fetchItems}
					getHeaders={getHeaders}
					onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
				/>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			{/* 1-LINE COMPACT TOOLBAR (Mandates 8d, 8e, Apple HIG standard) */}
			<InventoryTopToolbar
				activeSubTab={activeSubTab}
				setActiveSubTab={setActiveSubTab}
				stockViewMode={stockViewMode}
				setStockViewMode={setStockViewMode}
				itemsCount={items.length}
				rulesCount={rulesList.length}
				totalItems={totalItems}
				lowStockCount={lowStockCount}
				totalValue={totalValue}
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				isQuickPackagesOpen={isQuickPackagesOpen}
				setIsQuickPackagesOpen={setIsQuickPackagesOpen}
				paperSoftBg={paperSoftBg}
				borderColor={borderColor}
				isWritingOffCarpules={isWritingOffCarpules}
				handleQuickWriteoffCarpules={handleQuickWriteoffCarpules}
				isOpsMenuOpen={isOpsMenuOpen}
				setIsOpsMenuOpen={setIsOpsMenuOpen}
				setIsAcceptanceWaybillsOpen={setIsAcceptanceWaybillsOpen}
				setIsWarehouseManagerOpen={setIsWarehouseManagerOpen}
				setIsMdlpScanningOpen={setIsMdlpScanningOpen}
				setIsClinicalWriteoffOpen={setIsClinicalWriteoffOpen}
				setIsProcedureDeductionOpen={setIsProcedureDeductionOpen}
				setIsWarehouseTransferOpen={setIsWarehouseTransferOpen}
				setIsInventoryAuditOpen={setIsInventoryAuditOpen}
				setIsMdlpDisposalOpen={setIsMdlpDisposalOpen}
				setIsNurseCarpuleModalOpen={setIsNurseCarpuleModalOpen}
				handleQuickWriteoffStandardKit={handleQuickWriteoffStandardKit}
				handleQuickWriteoffAnestheticCarpule={handleQuickWriteoffAnestheticCarpule}
				handleQuickWriteoffSterilizationKit={handleQuickWriteoffSterilizationKit}
				handleQuickWriteoffVisitBundle={handleQuickWriteoffVisitBundle}
				handleQuickWriteoffShiftBundle={handleQuickWriteoffShiftBundle}
				setIsInboundInvoiceModalOpen={setIsInboundInvoiceModalOpen}
				openAddModal={openAddModal}
			/>

			{/* CATEGORY FILTER CHIPS ROW (DENTE canonical filter chips) */}
			{activeSubTab === "inventory" && (
				<div
					className="dente-filter-chips min-h-[36px] sm:h-9 px-3 py-1 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap shrink-0"
					role="toolbar"
					aria-label="Фильтр по категориям материалов"
					data-testid="inventory-category-filters-row"
				>
					<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mr-1 shrink-0">
						Категории:
					</span>
					{INVENTORY_CATEGORIES.map((cat) => {
						const Icon = cat.icon;
						const isActive = selectedCategory === cat.id;
						return (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={`dente-filter-chip ${isActive ? "active" : ""}`}
								aria-pressed={isActive}
								data-testid={`inventory-category-chip-${cat.id}`}
							>
								<Icon
									size={13}
									className="shrink-0"
								/>
								<span>{cat.label}</span>
							</button>
						);
					})}
				</div>
			)}

			{/* Accordion 1-Click Clinical Packages Write-Off Bar */}
			{activeSubTab === "inventory" && isQuickPackagesOpen && (
				<div className="p-2.5 bg-[var(--paper-soft)] border-b border-[var(--line)] shrink-0">
					<WarehousePackageWriteOffBar
						warehouseItems={items}
						organizationId={organizationId}
						allowSoftOverdraft={true}
						onWriteOffComplete={() => fetchItems()}
					/>
				</div>
			)}

			{/* MAIN CONTENT AREA */}
			<div className="p-2 flex-1 flex flex-col min-h-0 overflow-hidden w-full">
				{activeSubTab === "rules" ? (
					<InventoryServiceUsagePanel
						organizationId={organizationId}
						inventoryItems={items}
						rulesList={rulesList}
						onRulesUpdated={() => fetchItems()}
						getHeaders={getHeaders}
					/>
				) : stockViewMode === "fefo" ? (
					<InventoryBatchFefoPanel
						items={items}
						isLoading={isLoading}
						organizationId={organizationId}
						onDeductItem={(item, qty) => {
							setAdjustingItem(item);
							setAdjustType("out");
							setAdjustAmount(String(qty));
						}}
						onReceiveItem={(item, qty) => {
							setAdjustingItem(item);
							setAdjustType("in");
							setAdjustAmount(String(qty));
						}}
						onSelectItem={(item) => openEditModal(item)}
						onWriteOffExpired={(item) => {
							const name = item?.name?.toLowerCase() || "";
							const isCarpuleOrAnesthetic =
								name.includes("артикаин") ||
								name.includes("ультракаин") ||
								name.includes("септанест") ||
								name.includes("скандонест") ||
								name.includes("убистезин") ||
								name.includes("мепивакаин") ||
								name.includes("карпул");

							if (isCarpuleOrAnesthetic) {
								setIsNurseCarpuleModalOpen(true);
							} else {
								setIsClinicalWriteoffOpen(true);
							}
						}}
					/>
				) : (
					/* TABLE: Calibrated 7-column DENTE warehouse table */
					<InventoryStockTable
						items={inventorySlice.visibleItems}
						isLoading={isLoading}
						organizationId={organizationId}
						searchQuery={searchQuery}
						loadError={loadError}
						hasMore={inventorySlice.hasMore}
						remainingCount={inventorySlice.remainingCount}
						onShowMore={() => setDisplayLimit((prev) => prev + 40)}
						onSelectItem={(item) => openEditModal(item)}
						onEditItem={(item) => openEditModal(item)}
						onDeductItem={(item) => {
							setAdjustingItem(item);
							setAdjustType("out");
							setAdjustAmount("");
						}}
						onReceiveItem={(item) => {
							setAdjustingItem(item);
							setAdjustType("in");
							setAdjustAmount("");
						}}
						onDeleteItem={(id, name) => handleDeleteItem(id, name)}
						onOpenWaybills={() => setIsAcceptanceWaybillsOpen(true)}
						onOpenAddModal={() => openAddModal()}
						onOpenWarehouseManager={() => setIsWarehouseManagerOpen(true)}
						onOpenInventoryAudit={() => setIsInventoryAuditOpen(true)}
						onRetry={() => fetchItems()}
					/>
				)}
			</div>

			{/* ADD/EDIT ITEM MODAL */}
			<InventoryItemFormModal
				isOpen={showModal}
				onClose={() => setShowModal(false)}
				editingItem={editingItem}
				formData={formData}
				setFormData={setFormData}
				onSubmit={handleSaveItem}
				isSaving={isSavingItem}
			/>

			{/* ADJUST STOCK MODAL */}
			<InventoryStockAdjustModal
				adjustingItem={adjustingItem}
				onClose={() => setAdjustingItem(null)}
				adjustType={adjustType}
				setAdjustType={setAdjustType}
				adjustAmount={adjustAmount}
				setAdjustAmount={setAdjustAmount}
				onAdjustSubmit={handleAdjustStock}
				isAdjusting={isAdjustingStock}
			/>

			{/* Диалог подтверждения удаления */}
			{confirmDialog?.isOpen && (
				<InventoryConfirmDialog
					title={confirmDialog.title}
					message={confirmDialog.message}
					onConfirm={confirmDialog.onConfirm}
					onCancel={() => setConfirmDialog(null)}
				/>
			)}

			{/* Внешние специализированные складские модалки */}
			<InventoryExternalModals
				organizationId={organizationId}
				items={items}
				auditInitialDoc={auditInitialDoc}
				isClinicalWriteoffOpen={isClinicalWriteoffOpen}
				onCloseClinicalWriteoff={() => setIsClinicalWriteoffOpen(false)}
				isProcedureDeductionOpen={isProcedureDeductionOpen}
				onCloseProcedureDeduction={() => setIsProcedureDeductionOpen(false)}
				isWarehouseTransferOpen={isWarehouseTransferOpen}
				onCloseWarehouseTransfer={() => setIsWarehouseTransferOpen(false)}
				isInventoryAuditOpen={isInventoryAuditOpen}
				onCloseInventoryAudit={() => setIsInventoryAuditOpen(false)}
				onOpenInventoryAudit={() => setIsInventoryAuditOpen(true)}
				isMdlpDisposalOpen={isMdlpDisposalOpen}
				onCloseMdlpDisposal={() => setIsMdlpDisposalOpen(false)}
				isWarehouseManagerOpen={isWarehouseManagerOpen}
				onCloseWarehouseManager={() => setIsWarehouseManagerOpen(false)}
				isMdlpScanningOpen={isMdlpScanningOpen}
				onCloseMdlpScanning={() => setIsMdlpScanningOpen(false)}
				isNurseCarpuleModalOpen={isNurseCarpuleModalOpen}
				onCloseNurseCarpuleModal={() => setIsNurseCarpuleModalOpen(false)}
				isAcceptanceWaybillsOpen={isAcceptanceWaybillsOpen}
				onCloseAcceptanceWaybills={() => setIsAcceptanceWaybillsOpen(false)}
				isInboundInvoiceModalOpen={isInboundInvoiceModalOpen}
				onCloseInboundInvoiceModal={() => setIsInboundInvoiceModalOpen(false)}
				isDeductingMaterials={isDeductingMaterials}
				setIsDeductingMaterials={setIsDeductingMaterials}
				fetchItems={fetchItems}
				getHeaders={getHeaders}
				onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
			/>
		</div>
	);
};

export const InventoryView = React.memo(InventoryViewInner);
export default InventoryView;
