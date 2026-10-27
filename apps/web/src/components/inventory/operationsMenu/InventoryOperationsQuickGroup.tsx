import { Flame, PackageCheck } from "lucide-react";
import React from "react";
import { InventoryOperationsBundleGroup } from "./InventoryOperationsBundleGroup.js";

export interface InventoryOperationsQuickGroupProps {
	readonly onClose: () => void;
	readonly onOpenShiftDeductionModal?: (() => void) | undefined;
	readonly onOpenSterilizationCycleModal?: (() => void) | undefined;
	readonly onQuickWriteoffStandardKit: () => void;
	readonly onQuickWriteoffSterilizationKit: () => void;
	readonly onQuickWriteoffVisitBundle: (bundle: "therapy" | "surgery") => void;
	readonly onQuickWriteoffShiftBundle: (bundle: "therapy" | "orthopedics" | "surgery") => void;
}

export const InventoryOperationsQuickGroup: React.FC<InventoryOperationsQuickGroupProps> = ({
	onClose,
	onOpenShiftDeductionModal,
	onOpenSterilizationCycleModal,
	onQuickWriteoffStandardKit,
	onQuickWriteoffSterilizationKit,
	onQuickWriteoffVisitBundle,
	onQuickWriteoffShiftBundle,
}) => {
	return (
		<>
			{onOpenShiftDeductionModal && (
				<button
					type="button"
					className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] cursor-pointer transition-colors"
					data-testid="nurse-menu-shift-batch-deduction-btn"
					onClick={() => {
						onOpenShiftDeductionModal();
						onClose();
					}}
					role="menuitem"
					title="Списание расходников смены по оказанным услугам в 1 клик"
				>
					<PackageCheck size={15} className="text-[var(--ink-muted)] shrink-0" />
					<span>Списать расходники смены</span>
				</button>
			)}

			{onOpenSterilizationCycleModal && (
				<button
					type="button"
					className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] cursor-pointer transition-colors"
					data-testid="nurse-menu-sterilization-batch-cycle-btn"
					onClick={() => {
						onOpenSterilizationCycleModal();
						onClose();
					}}
					role="menuitem"
					title="1-кликовый цикл автоклавирования: списание крафт-пакетов и индикаторов 5 класса со склада"
				>
					<Flame size={15} className="text-[var(--ink-muted)] shrink-0" />
					<span>Стерилизация в автоклаве (1 клик)</span>
				</button>
			)}

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-standard-kit-btn"
				onClick={() => {
					onQuickWriteoffStandardKit();
					onClose();
				}}
				role="menuitem"
				title="Быстрое списание базового набора приёма (перчатки, маска, слюноотсос, нагрудник, валики)"
			>
				<PackageCheck size={15} className="text-[var(--ink-muted)] shrink-0" />
				<span>Списать базовый набор</span>
			</button>

			<button
				type="button"
				className="flex items-center gap-2 px-3 py-2 rounded-lg text-left w-full hover:bg-[var(--paper-soft)] text-xs font-medium text-[var(--ink)] cursor-pointer transition-colors"
				data-testid="nurse-menu-quick-sterilization-kit-btn"
				onClick={() => {
					onQuickWriteoffSterilizationKit();
					onClose();
				}}
				role="menuitem"
				title="Быстрое списание набора стерилизации: 1 лоток в крафт-пакете + перчатки"
			>
				<PackageCheck size={15} className="text-[var(--ink-muted)] shrink-0" />
				<span>Набор стерилизации (1 лоток + перчатки)</span>
			</button>

			<InventoryOperationsBundleGroup
				onClose={onClose}
				onQuickWriteoffVisitBundle={onQuickWriteoffVisitBundle}
				onQuickWriteoffShiftBundle={onQuickWriteoffShiftBundle}
			/>
		</>
	);
};

export default InventoryOperationsQuickGroup;
