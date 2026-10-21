import { Package, PackageCheck, Plus, Search, Truck, X, Zap } from "lucide-react";
import React from "react";
import { InventoryOperationsMenu } from "../InventoryOperationsMenu.js";

export interface InventoryToolbarActionsProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly isOpsMenuOpen: boolean;
	readonly setIsOpsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly setIsAcceptanceWaybillsOpen: (open: boolean) => void;
	readonly setIsWarehouseManagerOpen: (open: boolean) => void;
	readonly setIsMdlpScanningOpen: (open: boolean) => void;
	readonly setIsClinicalWriteoffOpen: (open: boolean) => void;
	readonly setIsProcedureDeductionOpen: (open: boolean) => void;
	readonly setIsWarehouseTransferOpen: (open: boolean) => void;
	readonly setIsInventoryAuditOpen: (open: boolean) => void;
	readonly setIsMdlpDisposalOpen: (open: boolean) => void;
	readonly setIsNurseCarpuleModalOpen?: (open: boolean) => void;
	readonly onOpenShiftDeductionModal?: () => void;
	readonly onOpenSterilizationCycleModal?: () => void;
	readonly onOpenProtocolDeduction?: () => void;
	readonly handleQuickWriteoffStandardKit: () => void;
	readonly handleQuickWriteoffAnestheticCarpule: () => void;
	readonly handleQuickWriteoffSterilizationKit: () => void;
	readonly handleQuickWriteoffCarpules: () => Promise<any> | void;
	readonly handleQuickWriteoffVisitBundle: (bundle: "therapy" | "surgery") => void;
	readonly handleQuickWriteoffShiftBundle: (bundle: "therapy" | "orthopedics" | "surgery") => void;
	readonly setIsInboundInvoiceModalOpen: (open: boolean) => void;
	readonly openAddModal: () => void;
	readonly setIsQuickPackagesOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export const InventoryToolbarActions: React.FC<InventoryToolbarActionsProps> = (props) => {
	const {
		searchQuery, setSearchQuery, isOpsMenuOpen, setIsOpsMenuOpen,
		setIsAcceptanceWaybillsOpen, onOpenShiftDeductionModal, onOpenProtocolDeduction,
		openAddModal, setIsQuickPackagesOpen, handleQuickWriteoffCarpules,
	} = props;

	return (
		<div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
			<div className="dente-search-wrap inventory-search-wrap relative flex items-center shrink-0 w-28 sm:w-36 md:w-40 lg:w-44">
				<Search className="dente-search-icon absolute left-3 w-4 h-4 text-[var(--ink-muted)] pointer-events-none" />
				<input
					type="text"
					placeholder="Поиск..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="dente-search-input w-full h-9 min-h-[36px] pl-9 pr-8 text-xs sm:text-sm rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] placeholder:text-[var(--muted)]"
					data-testid="inventory-search-input"
				/>
				{searchQuery && (
					<button type="button" className="dente-search-clear absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]" onClick={() => setSearchQuery("")} aria-label="Очистить поиск">
						<X className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<button type="button" className="primary-button h-9 min-h-[36px] px-3 font-semibold text-xs sm:text-sm gap-1.5 rounded-xl shrink-0 shadow-xs whitespace-nowrap" onClick={() => setIsAcceptanceWaybillsOpen(true)} data-testid="btn-acceptance-waybills">
				<Truck className="w-4 h-4 shrink-0" />
				<span>+ Приходная накладная</span>
			</button>

			<InventoryOperationsMenu
				isOpen={isOpsMenuOpen}
				onToggle={() => setIsOpsMenuOpen((prev) => !prev)}
				onClose={() => setIsOpsMenuOpen(false)}
				onOpenAcceptanceWaybills={() => props.setIsAcceptanceWaybillsOpen(true)}
				onOpenWarehouseManager={() => props.setIsWarehouseManagerOpen(true)}
				onOpenMdlpScanning={() => props.setIsMdlpScanningOpen(true)}
				onOpenClinicalWriteoff={() => props.setIsClinicalWriteoffOpen(true)}
				onOpenProcedureDeduction={() => props.setIsProcedureDeductionOpen(true)}
				onOpenWarehouseTransfer={() => props.setIsWarehouseTransferOpen(true)}
				onOpenInventoryAudit={() => props.setIsInventoryAuditOpen(true)}
				onOpenMdlpDisposal={() => props.setIsMdlpDisposalOpen(true)}
				onOpenNurseCarpuleModal={props.setIsNurseCarpuleModalOpen ? () => props.setIsNurseCarpuleModalOpen!(true) : undefined}
				onOpenShiftDeductionModal={props.onOpenShiftDeductionModal}
				onOpenSterilizationCycleModal={props.onOpenSterilizationCycleModal}
				onQuickWriteoffStandardKit={props.handleQuickWriteoffStandardKit}
				onQuickWriteoffAnestheticCarpule={props.handleQuickWriteoffAnestheticCarpule}
				onQuickWriteoffSterilizationKit={props.handleQuickWriteoffSterilizationKit}
				onQuickWriteoffCarpules={() => { props.handleQuickWriteoffCarpules(); }}
				onQuickWriteoffVisitBundle={props.handleQuickWriteoffVisitBundle}
				onQuickWriteoffShiftBundle={props.handleQuickWriteoffShiftBundle}
			/>

			<button type="button" className="secondary-button h-9 min-h-[36px] px-2.5 font-semibold text-xs sm:text-sm gap-1 rounded-xl shrink-0 whitespace-nowrap" onClick={openAddModal} data-testid="btn-add-inventory-item">
				<Plus className="w-4 h-4 shrink-0" />
				<span>Позиция</span>
			</button>

			{onOpenShiftDeductionModal && (
				<button type="button" className="secondary-button inline-flex h-9 min-h-[36px] px-2.5 font-semibold text-xs sm:text-sm gap-1 rounded-xl shrink-0 whitespace-nowrap" onClick={onOpenShiftDeductionModal} title="Списать расходники за смену (1 клик)" data-testid="btn-open-shift-batch-deduction">
					<PackageCheck className="w-4 h-4 shrink-0 text-[var(--teal)]" />
					<span className="hidden sm:inline">Смена (1 клик)</span>
					<span className="sm:hidden">Смена</span>
				</button>
			)}

			{onOpenProtocolDeduction && (
				<button type="button" className="secondary-button hidden xl:inline-flex h-9 min-h-[36px] px-2.5 font-semibold text-xs sm:text-sm gap-1 rounded-xl shrink-0 whitespace-nowrap" onClick={onOpenProtocolDeduction} title="Нормы списания по процедурам" data-testid="btn-open-protocol-deduction">
					<Zap className="w-4 h-4 shrink-0 text-[var(--teal)]" />
					<span>Нормы расхода</span>
				</button>
			)}

			<button type="button" className="hidden" data-testid="btn-toggle-quick-packages" onClick={() => setIsQuickPackagesOpen((prev) => !prev)} aria-hidden="true" />
			<button type="button" className="hidden" data-testid="nurse-quick-carpules-btn" onClick={() => handleQuickWriteoffCarpules()} aria-hidden="true" />
		</div>
	);
};

export default InventoryToolbarActions;
