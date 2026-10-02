import {
	Clock,
	FileText,
	Package,
	Plus,
	Search,
	Syringe,
	Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { money } from "../AppHelpers.js";
import { sliceDomList } from "../utils/domVirtualizationHelper.js";
import { isDemoShowcaseMode } from "../utils/demoModeEngine.js";
import { InventoryConfirmDialog } from "./inventory/InventoryConfirmDialog.js";
import { useInventoryLogic } from "./inventory/useInventoryLogic.js";
import { WarehousePackageWriteOffBar } from "./inventory/WarehousePackageWriteOffBar.js";
import { WarehouseItemsTable } from "./warehouse/WarehouseItemsTable.js";
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

// 100% прозрачные реэкспорты декомпозированных модулей склада (Мандат 8b)
export * from "./InventoryStockTable.js";
export * from "./InventoryBatchFefoPanel.js";
export * from "./InventoryInboundInvoiceModal.js";
export * from "./InventoryServiceUsagePanel.js";
export * from "./inventory/InventoryOperationsMenu.js";
export * from "./inventory/InventoryItemFormModal.js";
export * from "./inventory/InventoryStockAdjustModal.js";
export * from "./inventory/InventoryExternalModals.js";

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

	// Виртуализация списка для слабых ноутбуков (Мандаты 8c, 8n)
	const [displayLimit, setDisplayLimit] = useState(40);

	React.useEffect(() => {
		setDisplayLimit(40);
	}, [searchQuery, activeSubTab]);

	const inventorySlice = useMemo(() => {
		return sliceDomList(filteredItems ?? [], displayLimit, 0);
	}, [filteredItems, displayLimit]);

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

	if (isLoading && items.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-[var(--muted)] gap-3">
				<Package size={20} />
				<span>Загрузка склада...</span>
			</div>
		);
	}

	return (
		<div className="w-full h-full flex flex-col overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			{/* 1-LINE COMPACT TOOLBAR (Mandates 8d, 8e, Apple HIG standard) */}
			<div
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 py-1 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex flex-nowrap overflow-x-auto no-scrollbar scrollbar-none items-center justify-between gap-2 shrink-0"
				role="toolbar"
				aria-label="Панель склада материалов"
			>
				{/* Left: Section Identity, Sub-tabs, and Inline KPI */}
				<div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap min-w-0 max-w-full touch-pan-x shrink-0">
					<div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink,#0f172a)] shrink-0">
						<Package size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span>Склад материалов</span>
					</div>

					{/* Subtabs switcher */}
					<div
						className="inventory-subtabs-container flex items-center gap-1 bg-[var(--paper-soft)] p-0.5 rounded-xl border border-[var(--line)] shrink-0"
						role="tablist"
						aria-label="Режимы склада"
					>
						<button
							type="button"
							onClick={() => {
								setActiveSubTab("inventory");
								setStockViewMode("standard");
							}}
							className={`inventory-subtab-btn h-8 px-3 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
								activeSubTab === "inventory" && stockViewMode === "standard"
									? "active bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs border border-[var(--line)]"
									: "bg-transparent text-[var(--muted)] border border-transparent hover:text-[var(--ink)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal-soft)]"
							}`}
							role="tab"
							aria-selected={activeSubTab === "inventory" && stockViewMode === "standard"}
							data-testid="tab-inventory-items"
						>
							<Package
								size={14}
								className={
									activeSubTab === "inventory" && stockViewMode === "standard"
										? "text-teal-600 dark:text-teal-400 shrink-0"
										: "text-[var(--muted)] shrink-0"
								}
							/>
							<span>Остатки</span>
							<span className="text-[10px] opacity-70 font-mono">({items.length})</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveSubTab("inventory");
								setStockViewMode("fefo");
							}}
							className={`inventory-subtab-btn h-8 px-3 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
								activeSubTab === "inventory" && stockViewMode === "fefo"
									? "active bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs border border-[var(--line)]"
									: "bg-transparent text-[var(--muted)] border border-transparent hover:text-[var(--ink)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal-soft)]"
							}`}
							role="tab"
							aria-selected={activeSubTab === "inventory" && stockViewMode === "fefo"}
							data-testid="tab-inventory-fefo"
						>
							<Clock
								size={14}
								className={
									activeSubTab === "inventory" && stockViewMode === "fefo"
										? "text-teal-600 dark:text-teal-400 shrink-0"
										: "text-[var(--muted)] shrink-0"
								}
							/>
							<span>Сводка FEFO</span>
							<span className="text-[10px] opacity-70 font-mono">({items.length})</span>
						</button>

						<button
							type="button"
							onClick={() => setActiveSubTab("rules")}
							className={`inventory-subtab-btn h-8 px-3 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
								activeSubTab === "rules"
									? "active bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs border border-[var(--line)]"
									: "bg-transparent text-[var(--muted)] border border-transparent hover:text-[var(--ink)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal-soft)]"
							}`}
							role="tab"
							aria-selected={activeSubTab === "rules"}
							data-testid="tab-inventory-rules"
						>
							<FileText
								size={14}
								className={
									activeSubTab === "rules"
										? "text-teal-600 dark:text-teal-400 shrink-0"
										: "text-[var(--muted)] shrink-0"
								}
							/>
							<span>Правила списания</span>
							<span className="text-[10px] opacity-70 font-mono">({rulesList.length})</span>
						</button>
					</div>

					{/* Compact Inline KPI Badges */}
					<div className="hidden lg:flex items-center gap-1.5 text-xs text-[var(--muted,#64748b)] shrink-0 pl-1 border-l border-[var(--line,#e2e8f0)]">
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[11px] font-medium shrink-0 whitespace-nowrap">
							Поз: <strong className="text-[var(--ink,#0f172a)] font-bold">{totalItems}</strong>
						</span>
						<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[11px] font-medium shrink-0 whitespace-nowrap">
							Дефицит:{" "}
							<strong
								className={
									lowStockCount > 0
										? "text-rose-600 dark:text-rose-400 font-bold"
										: "text-teal-600 dark:text-teal-400 font-bold"
								}
							>
								{lowStockCount}
							</strong>
						</span>
						{totalValue > 0 && (
							<span className="hidden 2xl:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#e2e8f0)] text-[11px] font-medium shrink-0 whitespace-nowrap">
								Стоимость:{" "}
								<strong className="text-teal-600 dark:text-teal-400 font-bold">
									{money(totalValue)}
								</strong>
							</span>
						)}
					</div>
				</div>

				{/* Right: Search, Quick Packages Toggle, Carpule Disposal, Ops Menu, Inbound Invoice, Add Item */}
				<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
					{/* Compact Search Input */}
					<div className="relative flex items-center shrink-0">
						<Search
							size={13}
							className="absolute left-2.5 text-[var(--muted)] pointer-events-none"
						/>
						<input
							type="text"
							placeholder="Поиск..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-28 sm:w-36 text-xs h-8 pl-7.5 pr-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] outline-none"
							data-testid="inventory-search-input"
						/>
					</div>

					{/* Quick Packages Toggle */}
					<button
						type="button"
						onClick={() => setIsQuickPackagesOpen((prev) => !prev)}
						className="h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors border shrink-0 whitespace-nowrap"
						style={{
							background: isQuickPackagesOpen ? "var(--teal-soft)" : paperSoftBg,
							color: isQuickPackagesOpen ? "var(--teal-dark, #0f766e)" : "var(--ink)",
							borderColor: isQuickPackagesOpen ? "var(--teal)" : borderColor,
						}}
						title="Пакетное списание расходников в 1 клик (Мандаты 8e, 8k)"
						data-testid="btn-toggle-quick-packages"
					>
						<Zap
							size={13}
							className={isQuickPackagesOpen ? "text-teal-600 dark:text-teal-400 shrink-0" : "text-amber-500 shrink-0"}
						/>
						<span className="hidden sm:inline">Пакеты</span>
					</button>

					{/* 1-Click Carpules Write-off */}
					<button
						type="button"
						data-testid="nurse-quick-carpules-btn"
						disabled={isWritingOffCarpules}
						onClick={() => handleQuickWriteoffCarpules()}
						className="secondary-button h-8 px-2.5 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 font-bold text-xs cursor-pointer transition-colors bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
						title="Утилизировать пустую карпулу анестетика в 1 клик"
					>
						<Syringe size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">
							{isWritingOffCarpules ? "Списание..." : "Карпулы"}
						</span>
					</button>

					{/* Operations Dropdown Menu */}
					<InventoryOperationsMenu
						isOpen={isOpsMenuOpen}
						onToggle={() => setIsOpsMenuOpen((prev) => !prev)}
						onClose={() => setIsOpsMenuOpen(false)}
						onOpenAcceptanceWaybills={() => setIsAcceptanceWaybillsOpen(true)}
						onOpenWarehouseManager={() => setIsWarehouseManagerOpen(true)}
						onOpenMdlpScanning={() => setIsMdlpScanningOpen(true)}
						onOpenClinicalWriteoff={() => setIsClinicalWriteoffOpen(true)}
						onOpenProcedureDeduction={() => setIsProcedureDeductionOpen(true)}
						onOpenWarehouseTransfer={() => setIsWarehouseTransferOpen(true)}
						onOpenInventoryAudit={() => setIsInventoryAuditOpen(true)}
						onOpenMdlpDisposal={() => setIsMdlpDisposalOpen(true)}
						onOpenNurseCarpuleModal={() => setIsNurseCarpuleModalOpen(true)}
						onQuickWriteoffStandardKit={handleQuickWriteoffStandardKit}
						onQuickWriteoffAnestheticCarpule={handleQuickWriteoffAnestheticCarpule}
						onQuickWriteoffSterilizationKit={handleQuickWriteoffSterilizationKit}
						onQuickWriteoffCarpules={handleQuickWriteoffCarpules}
						onQuickWriteoffVisitBundle={handleQuickWriteoffVisitBundle}
						onQuickWriteoffShiftBundle={handleQuickWriteoffShiftBundle}
					/>

					{/* Quick Acceptance Inbound Invoice Button */}
					<button
						type="button"
						className="secondary-button min-h-[44px] sm:min-h-[28px] sm:h-7 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 rounded-lg font-semibold text-xs cursor-pointer bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
						onClick={() => setIsInboundInvoiceModalOpen(true)}
						title="Приходная накладная поставщика (FEFO партии, ТОРГ-12, погашение овердрафта)"
						data-testid="btn-acceptance-waybills"
					>
						<FileText size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
						<span className="hidden sm:inline">Приход (FEFO)</span>
					</button>

					{/* Add Inventory Item Button */}
					<button
						type="button"
						className="primary-button min-h-[44px] sm:min-h-[28px] sm:h-7 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 rounded-lg font-bold text-xs cursor-pointer bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-none"
						onClick={openAddModal}
						data-testid="btn-add-inventory-item"
					>
						<Plus size={14} className="shrink-0" />
						<span>Позиция</span>
					</button>
				</div>
			</div>

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
					<WarehouseItemsTable
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
