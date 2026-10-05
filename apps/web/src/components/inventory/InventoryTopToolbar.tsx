import {
	Clock,
	FileText,
	Package,
	Plus,
	Search,
	Syringe,
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
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal-soft)] shadow-xs"
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
						<span className="text-[10px] opacity-70 font-mono">({itemsCount})</span>
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
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal-soft)] shadow-xs"
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
						<span>Сроки годности (FEFO)</span>
						<span className="text-[10px] opacity-70 font-mono">({itemsCount})</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveSubTab("rules")}
						className={`inventory-subtab-btn h-8 px-3 rounded-lg text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
							activeSubTab === "rules"
								? "active bg-[var(--paper)] text-[var(--ink)] font-bold shadow-xs border border-[var(--line)]"
								: "bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)] hover:text-[var(--ink)] hover:bg-[var(--teal-surface)] hover:border-[var(--teal-soft)] shadow-xs"
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
						<span className="text-[10px] opacity-70 font-mono">({rulesCount})</span>
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
					className="secondary-button min-h-[44px] sm:min-h-[32px] sm:h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 rounded-lg font-semibold text-xs cursor-pointer bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] shadow-xs"
					onClick={() => setIsInboundInvoiceModalOpen(true)}
					title="Приходная накладная поставщика (партии по срокам, погашение овердрафта)"
					data-testid="btn-acceptance-waybills"
				>
					<FileText size={13} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="hidden sm:inline">Приходная накладная</span>
				</button>

				{/* Add Inventory Item Button */}
				<button
					type="button"
					className="primary-button min-h-[44px] sm:min-h-[32px] sm:h-8 shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 rounded-lg font-bold text-xs cursor-pointer bg-[var(--teal)] text-[var(--on-teal,#ffffff)] border-none shadow-xs"
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
