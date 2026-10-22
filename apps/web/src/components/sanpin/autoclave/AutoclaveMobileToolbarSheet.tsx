import type { SterilizationLogRecord } from "@dental/shared";
import { X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes.js";
import { AutoclaveToolbarSheetItems } from "./AutoclaveToolbarSheetItems.js";

export interface AutoclaveMobileToolbarSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly logs: SterilizationLogRecord[];
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly isLoggingBatch: boolean;
	readonly onQuickShiftBatch: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onOpenNewCycleModal?: () => void;
	readonly onGenerateMonthlyForm257: () => void;
	readonly onOpenKraftModal: () => void;
}

export function AutoclaveMobileToolbarSheet({
	isOpen,
	onClose,
	logs,
	clinicDevices,
	isLoggingBatch,
	onQuickShiftBatch,
	onPrintBatchPouches,
	onOpenEquipmentModal,
	onOpenNewCycleModal,
	onGenerateMonthlyForm257,
	onOpenKraftModal,
}: AutoclaveMobileToolbarSheetProps) {
	if (!isOpen || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div
			className="sanpin-bottom-sheet-backdrop"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Панель действий автоклава"
		>
			<div className="sanpin-bottom-sheet" onClick={(e) => e.stopPropagation()}>
				<div className="sanpin-bottom-sheet-handle" />

				<div className="flex items-center justify-between pb-2 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
					<h3 className="text-base font-bold text-ink m-0">Действия автоклава</h3>
					<button
						type="button"
						onClick={onClose}
						className="sanpin-touch-btn p-1.5 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer"
						style={{ minHeight: "44px", minWidth: "44px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
						aria-label="Закрыть шторку"
					>
						<X size={20} />
					</button>
				</div>

				<AutoclaveToolbarSheetItems
					logs={logs}
					clinicDevices={clinicDevices}
					isLoggingBatch={isLoggingBatch}
					onClose={onClose}
					onQuickShiftBatch={onQuickShiftBatch}
					onPrintBatchPouches={onPrintBatchPouches}
					onOpenEquipmentModal={onOpenEquipmentModal}
					onOpenNewCycleModal={onOpenNewCycleModal}
					onGenerateMonthlyForm257={onGenerateMonthlyForm257}
					onOpenKraftModal={onOpenKraftModal}
				/>

				<button
					type="button"
					onClick={onClose}
					className="w-full min-h-[48px] h-12 mt-1 rounded-xl bg-[var(--paper-soft,#f1f5f9)] dark:bg-[var(--paper-strong,#1e293b)] text-ink font-bold text-sm border border-[var(--line,#cbd5e1)] dark:border-[#334155] touch-manipulation cursor-pointer"
				>
					Закрыть
				</button>
			</div>
		</div>,
		document.body
	);
}
