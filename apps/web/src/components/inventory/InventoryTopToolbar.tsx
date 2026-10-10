import {
	Clock,
	FileText,
	Package,
	Plus,
	Search,
	Syringe,
	X,
	Zap,
} from "lucide-react";
import React from "react";
import { money } from "../../AppHelpers.js";
import { InventoryOperationsMenu } from "./InventoryOperationsMenu.js";

export interface InventoryTopToolbarProps {
	activeSubTab: "inventory" | "rules";
	setActiveSubTab: (tab: "inventory" | "rules") => void;
	stockViewMode: "standard" | "fefo";
	setStockViewMode: (mode: "standard" | "fefo") => void;
	itemsCount: number;
	rulesCount: number;
	totalItems: number;
	lowStockCount: number;
	totalValue: number;
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	isQuickPackagesOpen: boolean;
	setIsQuickPackagesOpen: React.Dispatch<React.SetStateAction<boolean>>;
	paperSoftBg?: string;
	borderColor?: string;
	isWritingOffCarpules: boolean;
	handleQuickWriteoffCarpules: (options?: {
		carpulesCount?: number;
		drugName?: string;
		visitId?: string;
		cabinetId?: string;
		chairId?: string;
		disposalReason?: "used_in_procedure" | "partial_dose" | "broken_capsule" | "expired";
		isBroken?: boolean;
		isPartial?: boolean;
		disinfectionMethod?: string;
		notes?: string;
	}) => Promise<any> | void;
	isOpsMenuOpen: boolean;
	setIsOpsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	setIsAcceptanceWaybillsOpen: (open: boolean) => void;
	setIsWarehouseManagerOpen: (open: boolean) => void;
	setIsMdlpScanningOpen: (open: boolean) => void;
	setIsClinicalWriteoffOpen: (open: boolean) => void;
	setIsProcedureDeductionOpen: (open: boolean) => void;
	setIsWarehouseTransferOpen: (open: boolean) => void;
	setIsInventoryAuditOpen: (open: boolean) => void;
	setIsMdlpDisposalOpen: (open: boolean) => void;
	setIsNurseCarpuleModalOpen: (open: boolean) => void;
	handleQuickWriteoffStandardKit: () => void;
	handleQuickWriteoffAnestheticCarpule: () => void;
	handleQuickWriteoffSterilizationKit: () => void;
	handleQuickWriteoffVisitBundle: () => void;
	handleQuickWriteoffShiftBundle: () => void;
	setIsInboundInvoiceModalOpen: (open: boolean) => void;
	openAddModal: () => void;
}

/**
 * Компактный 1-строчный тулбар складского модуля (Мандаты 8b, 8d, 8e, Apple HIG standard).
 * Вынесен из InventoryView для строгого соблюдения лимита <= 800 строк на файл.
 */
export const InventoryTopToolbar: React.FC<InventoryTopToolbarProps> = ({
	activeSubTab,
	setActiveSubTab,
	stockViewMode,
	setStockViewMode,
	itemsCount,
	rulesCount,
	totalItems,
	lowStockCount,
	totalValue,
	searchQuery,
	setSearchQuery,
	isQuickPackagesOpen,
	setIsQuickPackagesOpen,
	paperSoftBg = "var(--paper-soft)",
	borderColor = "var(--line)",
	isWritingOffCarpules,
	handleQuickWriteoffCarpules,
	isOpsMenuOpen,
	setIsOpsMenuOpen,
	setIsAcceptanceWaybillsOpen,
	setIsWarehouseManagerOpen,
	setIsMdlpScanningOpen,
	setIsClinicalWriteoffOpen,
	setIsProcedureDeductionOpen,
	setIsWarehouseTransferOpen,
	setIsInventoryAuditOpen,
	setIsMdlpDisposalOpen,
	setIsNurseCarpuleModalOpen,
	handleQuickWriteoffStandardKit,
	handleQuickWriteoffAnestheticCarpule,
	handleQuickWriteoffSterilizationKit,
	handleQuickWriteoffVisitBundle,
	handleQuickWriteoffShiftBundle,
	setIsInboundInvoiceModalOpen,
	openAddModal,
}) => {
	return (
		<div
			className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 py-1 bg-[var(--paper,#ffffff)] border-b border-[var(--line,#e2e8f0)] flex flex-nowrap overflow-x-auto no-scrollbar scrollbar-none items-center justify-between gap-1.5 shrink-0 max-w-full"
			role="toolbar"
			aria-label="Панель склада материалов"
		>
			{/* Left: Section Identity, Sub-tabs, and Inline KPI */}
			<div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none flex-nowrap min-w-0 shrink">
				<div className="flex items-center gap-1 font-bold text-xs text-[var(--ink,#0f172a)] shrink-0">
					<Package size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span>Склад</span>
				</div>

				{/* Subtabs switcher */}
				<div
					className="dente-segmented-bar shrink-0"
					role="tablist"
					aria-label="Режимы склада"
				>
					<button
						type="button"
						onClick={() => {
							setActiveSubTab("inventory");
							setStockViewMode("standard");
						}}
						className={`dente-segmented-item ${
							activeSubTab === "inventory" && stockViewMode === "standard" ? "active" : ""
						}`}
						role="tab"
						aria-selected={activeSubTab === "inventory" && stockViewMode === "standard"}
						data-testid="tab-inventory-items"
					>
						<Package
							size={13}
							className={
								activeSubTab === "inventory" && stockViewMode === "standard"
									? "text-teal-600 dark:text-teal-400 shrink-0"
									: "text-[var(--muted)] shrink-0"
							}
						/>
						<span>Остатки</span>
						<span className="text-[10px] opacity-70 font-mono">({itemsCount})</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setActiveSubTab("inventory");
							setStockViewMode("fefo");
						}}
						className={`dente-segmented-item ${
							activeSubTab === "inventory" && stockViewMode === "fefo" ? "active" : ""
						}`}
						role="tab"
						aria-selected={activeSubTab === "inventory" && stockViewMode === "fefo"}
						data-testid="tab-inventory-fefo"
					>
						<Clock
							size={13}
							className={
								activeSubTab === "inventory" && stockViewMode === "fefo"
									? "text-teal-600 dark:text-teal-400 shrink-0"
									: "text-[var(--muted)] shrink-0"
							}
						/>
						<span>Партии FEFO</span>
						<span className="text-[10px] opacity-70 font-mono">({itemsCount})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSubTab("rules")}
						className={`dente-segmented-item ${
							activeSubTab === "rules" ? "active" : ""
						}`}
						role="tab"
						aria-selected={activeSubTab === "rules"}
						data-testid="tab-inventory-rules"
					>
						<FileText
							size={13}
							className={
								activeSubTab === "rules"
									? "text-teal-600 dark:text-teal-400 shrink-0"
									: "text-[var(--muted)] shrink-0"
							}
						/>
						<span>Нормы списания</span>
						<span className="text-[10px] opacity-70 font-mono">({rulesCount})</span>
					</button>
				</div>

				{/* Compact Inline KPI Badges */}
				<div className="hidden 2xl:flex items-center gap-1 text-xs text-[var(--muted,#64748b)] shrink-0 pl-1 border-l border-[var(--line,#e2e8f0)]">
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
				</div>
			</div>

			{/* Right: Search, Quick Packages Toggle, Carpule Disposal, Ops Menu, Inbound Invoice, Add Item */}
			<div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
				{/* Compact Search Input */}
				<div
					className="dente-search-wrap relative flex items-center shrink-0"
					style={{ width: 148, minWidth: 120, maxWidth: 160, flex: "0 0 148px" }}
				>
					<Search
						size={13}
						className="dente-search-icon"
					/>
					<input
						type="text"
						placeholder="Поиск..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="dente-search-input !h-8"
						style={{ width: "100%", height: 32, minHeight: 32 }}
						data-testid="inventory-search-input"
					/>
					{searchQuery && (
						<button
							type="button"
							className="dente-search-clear"
							onClick={() => setSearchQuery("")}
							aria-label="Очистить поиск"
						>
							<X size={12} />
						</button>
					)}
				</div>

				{/* Quick Packages Toggle */}
				<button
					type="button"
					onClick={() => setIsQuickPackagesOpen((prev) => !prev)}
					className="h-8 px-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors border shrink-0 whitespace-nowrap"
					style={{
						height: 32,
						minHeight: 32,
						borderRadius: 8,
						background: isQuickPackagesOpen ? "var(--teal-soft)" : paperSoftBg,
						color: isQuickPackagesOpen ? "var(--teal-dark, #0f766e)" : "var(--ink)",
						borderColor: isQuickPackagesOpen ? "var(--teal)" : borderColor,
					}}
					title="Пакетное списание расходных материалов"
					data-testid="btn-toggle-quick-packages"
				>
					<Zap
						size={13}
						className={isQuickPackagesOpen ? "text-teal-600 dark:text-teal-400 shrink-0" : "text-amber-500 shrink-0"}
					/>
					<span className="hidden sm:inline">Пакеты</span>
				</button>

				{/* Carpules Write-off */}
				<button
					type="button"
					data-testid="nurse-quick-carpules-btn"
					disabled={isWritingOffCarpules}
					onClick={() => handleQuickWriteoffCarpules()}
					className="secondary-button h-8 px-2 rounded-lg shrink-0 whitespace-nowrap inline-flex items-center gap-1 font-semibold text-xs cursor-pointer transition-colors"
					style={{ height: 32, minHeight: 32, borderRadius: 8 }}
					title="Утилизировать пустую карпулу анестетика"
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
					className="secondary-button h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 rounded-lg font-semibold text-xs cursor-pointer"
					style={{ height: 32, minHeight: 32, borderRadius: 8 }}
					onClick={() => setIsInboundInvoiceModalOpen(true)}
					title="Приходная накладная поставщика (партии по срокам, погашение дефицита)"
					data-testid="btn-acceptance-waybills"
				>
					<FileText size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="hidden sm:inline">Накладная</span>
				</button>

				{/* Add Inventory Item Button */}
				<button
					type="button"
					className="primary-button h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1 px-2.5 rounded-lg font-bold text-xs cursor-pointer"
					style={{ height: 32, minHeight: 32, borderRadius: 8 }}
					onClick={openAddModal}
					data-testid="btn-add-inventory-item"
				>
					<Plus size={14} className="shrink-0" />
					<span>Позиция</span>
				</button>
			</div>
		</div>
	);
};
