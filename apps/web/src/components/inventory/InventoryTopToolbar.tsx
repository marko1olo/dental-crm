import React from "react";
import type { InventorySubTab } from "./useInventoryRules.js";
import { InventoryToolbarIdentity } from "./toolbarModules/InventoryToolbarIdentity.js";
import { InventoryToolbarKpis } from "./toolbarModules/InventoryToolbarKpis.js";
import { InventoryToolbarActions } from "./toolbarModules/InventoryToolbarActions.js";

export interface InventoryTopToolbarProps {
	activeSubTab: InventorySubTab;
	setActiveSubTab: (tab: InventorySubTab) => void;
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
	handleQuickWriteoffCarpules: (options?: any) => Promise<any> | void;
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
	setIsNurseCarpuleModalOpen?: (open: boolean) => void;
	onOpenShiftDeductionModal?: () => void;
	onOpenProtocolDeduction?: () => void;
	handleQuickWriteoffStandardKit: () => void;
	handleQuickWriteoffAnestheticCarpule: () => void;
	handleQuickWriteoffSterilizationKit: () => void;
	handleQuickWriteoffVisitBundle: (bundle: "therapy" | "surgery") => void;
	handleQuickWriteoffShiftBundle: (bundle: "therapy" | "orthopedics" | "surgery") => void;
	setIsInboundInvoiceModalOpen: (open: boolean) => void;
	openAddModal: () => void;
}

/**
 * Компактный 1-строчный тулбар складского модуля (Мандаты 8b, 8d, 8e, Apple HIG standard).
 * Декомпозирован строго <= 120 строк в соответствии с Мандатом 8b.
 * Единый Primary CTA: «+ Приходная накладная».
 */
export const InventoryTopToolbar: React.FC<InventoryTopToolbarProps> = (props) => {
	const {
		activeSubTab, setActiveSubTab, stockViewMode, setStockViewMode,
		itemsCount, rulesCount, totalItems, lowStockCount,
	} = props;

	return (
		<div
			className="h-12 min-h-[48px] max-h-[52px] px-3 sm:px-4 bg-[var(--paper)] border-b border-[var(--line)] flex flex-nowrap items-center justify-between gap-2 shrink-0 w-full overflow-x-auto no-scrollbar scrollbar-none"
			role="toolbar"
			aria-label="Панель склада материалов"
		>
			<div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0">
				<InventoryToolbarIdentity
					activeSubTab={activeSubTab}
					setActiveSubTab={setActiveSubTab}
					stockViewMode={stockViewMode}
					setStockViewMode={setStockViewMode}
					itemsCount={itemsCount}
					rulesCount={rulesCount}
				/>
				<InventoryToolbarKpis
					totalItems={totalItems}
					lowStockCount={lowStockCount}
				/>
			</div>

			<InventoryToolbarActions {...props} />
		</div>
	);
};

export default InventoryTopToolbar;
