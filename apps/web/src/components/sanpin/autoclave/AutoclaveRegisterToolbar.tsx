import type { SterilizationLogRecord } from "@dental/shared";
import React from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";
import { AutoclaveDesktopActionStrip } from "./AutoclaveDesktopActionStrip";
import { AutoclaveMobileActionTrigger } from "./AutoclaveMobileActionTrigger";
import { AutoclaveSearchField } from "./AutoclaveSearchField";

export interface AutoclaveRegisterToolbarProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
	readonly deviceFilter: string;
	readonly setDeviceFilter: (f: string) => void;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly logs: SterilizationLogRecord[];
	readonly isLoggingBatch: boolean;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onQuickShiftBatch: () => void;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onGenerateMonthlySterilizationLog?: () => void;
	readonly onGenerateMonthlyForm257?: () => void;
	readonly onOpenSterilizationLogModal?: () => void;
	readonly onOpenJournal257Modal?: () => void;
	readonly onOpenMobileSheet: () => void;
}

export function AutoclaveRegisterToolbar({
	searchQuery,
	setSearchQuery,
	deviceFilter,
	setDeviceFilter,
	clinicDevices,
	logs,
	isLoggingBatch,
	onOpenEquipmentModal,
	onPrintBatchPouches,
	onQuickShiftBatch,
	onOpenNewCycleModal,
	onGenerateMonthlySterilizationLog,
	onGenerateMonthlyForm257,
	onOpenSterilizationLogModal,
	onOpenJournal257Modal,
	onOpenMobileSheet,
}: AutoclaveRegisterToolbarProps) {
	const handleMonthlyLog = onGenerateMonthlySterilizationLog || onGenerateMonthlyForm257 || (() => {});
	const handleOpenLogModal = onOpenSterilizationLogModal || onOpenJournal257Modal || (() => {});
	return (
		<div className="sanpin-table-toolbar min-w-0 max-w-full flex items-center justify-between gap-2 p-2 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#0f172a)] border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
			<AutoclaveSearchField searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

			<AutoclaveDesktopActionStrip
				deviceFilter={deviceFilter}
				setDeviceFilter={setDeviceFilter}
				clinicDevices={clinicDevices}
				logs={logs}
				isLoggingBatch={isLoggingBatch}
				onOpenEquipmentModal={onOpenEquipmentModal}
				onPrintBatchPouches={onPrintBatchPouches}
				onQuickShiftBatch={onQuickShiftBatch}
				onOpenNewCycleModal={onOpenNewCycleModal}
				onGenerateMonthlySterilizationLog={handleMonthlyLog}
				onGenerateMonthlyForm257={handleMonthlyLog}
				onOpenSterilizationLogModal={handleOpenLogModal}
				onOpenJournal257Modal={handleOpenLogModal}
			/>

			<AutoclaveMobileActionTrigger
				deviceFilter={deviceFilter}
				setDeviceFilter={setDeviceFilter}
				onOpenMobileSheet={onOpenMobileSheet}
			/>
		</div>
	);
}
