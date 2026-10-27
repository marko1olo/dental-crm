import { ChevronDown, PackageCheck } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { InventoryOperationsDocsGroup } from "./operationsMenu/InventoryOperationsDocsGroup.js";
import { InventoryOperationsQuickGroup } from "./operationsMenu/InventoryOperationsQuickGroup.js";

export interface InventoryOperationsMenuProps {
	readonly isOpen: boolean;
	readonly onToggle: () => void;
	readonly onClose: () => void;
	readonly onOpenAcceptanceWaybills: () => void;
	readonly onOpenWarehouseManager: () => void;
	readonly onOpenMdlpScanning: () => void;
	readonly onOpenClinicalWriteoff: () => void;
	readonly onOpenProcedureDeduction?: (() => void) | undefined;
	readonly onOpenWarehouseTransfer: () => void;
	readonly onOpenInventoryAudit: () => void;
	readonly onOpenMdlpDisposal: () => void;
	readonly onOpenNurseCarpuleModal?: (() => void) | undefined;
	readonly onOpenShiftDeductionModal?: (() => void) | undefined;
	readonly onOpenSterilizationCycleModal?: (() => void) | undefined;
	readonly onQuickWriteoffStandardKit: () => void;
	readonly onQuickWriteoffAnestheticCarpule: () => void;
	readonly onQuickWriteoffSterilizationKit: () => void;
	readonly onQuickWriteoffCarpules: () => void;
	readonly onQuickWriteoffVisitBundle: (bundle: "therapy" | "surgery") => void;
	readonly onQuickWriteoffShiftBundle: (bundle: "therapy" | "orthopedics" | "surgery") => void;
}

/**
 * Выпадающее меню складских операций (Мандаты 8b, 8d, 8e).
 * Инкапсулирует группировку редких и специализированных операций склада
 * по закону Хика (единая кнопка «Операции» в 1-строчном тулбаре).
 * Декомпозирован до <= 120 строк.
 */
export const InventoryOperationsMenu: React.FC<InventoryOperationsMenuProps> = ({
	isOpen,
	onToggle,
	onClose,
	onOpenAcceptanceWaybills,
	onOpenWarehouseManager,
	onOpenMdlpScanning,
	onOpenClinicalWriteoff,
	onOpenWarehouseTransfer,
	onOpenInventoryAudit,
	onOpenMdlpDisposal,
	onOpenShiftDeductionModal,
	onOpenSterilizationCycleModal,
	onQuickWriteoffStandardKit,
	onQuickWriteoffSterilizationKit,
	onQuickWriteoffVisitBundle,
	onQuickWriteoffShiftBundle,
}) => {
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				onClose();
			}
		};
		if (isOpen) {
			document.addEventListener("mousedown", handleOutside);
		}
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isOpen, onClose]);

	return (
		<div ref={menuRef} className="shrink-0 relative inline-block">
			<button
				type="button"
				className="dente-btn dente-btn-secondary h-9 min-h-[36px] px-3 rounded-xl shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 font-medium text-xs sm:text-sm cursor-pointer transition border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-xs"
				onClick={onToggle}
				title="Операции со складом: списание по наряду, перемещения, инвентаризация, маркировка, нормы расхода"
				aria-expanded={isOpen}
				data-testid="btn-warehouse-ops-menu"
			>
				<PackageCheck className="w-4 h-4 text-[var(--ink-muted)] shrink-0" />
				<span>Операции</span>
				<ChevronDown
					className={`w-3.5 h-3.5 text-[var(--ink-muted)] transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
				/>
			</button>

			{isOpen && (
				<div
					className="warehouse-ops-menu absolute right-0 top-[calc(100%+4px)] bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1.5 z-50 min-w-[280px] flex flex-col gap-0.5 text-xs text-[var(--ink)]"
					role="menu"
				>
					<InventoryOperationsDocsGroup
						onClose={onClose}
						onOpenAcceptanceWaybills={onOpenAcceptanceWaybills}
						onOpenWarehouseManager={onOpenWarehouseManager}
						onOpenMdlpScanning={onOpenMdlpScanning}
						onOpenClinicalWriteoff={onOpenClinicalWriteoff}
						onOpenWarehouseTransfer={onOpenWarehouseTransfer}
						onOpenInventoryAudit={onOpenInventoryAudit}
						onOpenMdlpDisposal={onOpenMdlpDisposal}
					/>

					<div className="my-1 border-t border-[var(--line)]" />

					<InventoryOperationsQuickGroup
						onClose={onClose}
						onOpenShiftDeductionModal={onOpenShiftDeductionModal}
						onOpenSterilizationCycleModal={onOpenSterilizationCycleModal}
						onQuickWriteoffStandardKit={onQuickWriteoffStandardKit}
						onQuickWriteoffSterilizationKit={onQuickWriteoffSterilizationKit}
						onQuickWriteoffVisitBundle={onQuickWriteoffVisitBundle}
						onQuickWriteoffShiftBundle={onQuickWriteoffShiftBundle}
					/>
				</div>
			)}
		</div>
	);
};

export default InventoryOperationsMenu;
