import type { SterilizationLogRecord } from "@dental/shared";
import React from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes.js";
import { AutoclaveMobileCardsEmptyStates } from "./AutoclaveMobileCardsEmptyStates.js";
import { AutoclaveMobileCycleCardItem } from "./AutoclaveMobileCycleCardItem.js";
import { AutoclaveMobileFloatingBar } from "./AutoclaveMobileFloatingBar.js";
import type { AutoclaveLogsSlice } from "./types.js";

export interface AutoclaveMobileCardsProps {
	readonly logsSlice: AutoclaveLogsSlice;
	readonly filteredLogs: SterilizationLogRecord[];
	readonly loading: boolean;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly stampedRows: Record<string, boolean>;
	readonly isLoggingBatch: boolean;
	readonly onStampVerification: (logId: string) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onQuickShiftBatch: () => void;
	readonly onOpenKraftModal: () => void;
	readonly onSelectLogForSheet: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileCards({
	logsSlice,
	filteredLogs,
	loading,
	clinicDevices,
	stampedRows,
	isLoggingBatch,
	onStampVerification,
	onOpenEquipmentModal,
	onPrintSinglePouch,
	onQuickShiftBatch,
	onOpenKraftModal,
	onSelectLogForSheet,
}: AutoclaveMobileCardsProps) {
	const showEmptyOrLoading = loading || clinicDevices.length === 0 || filteredLogs.length === 0;

	return (
		<div
			className="md:hidden flex flex-col gap-3 p-1.5"
			data-testid="autoclave-mobile-cards-container"
		>
			{showEmptyOrLoading ? (
				<AutoclaveMobileCardsEmptyStates
					loading={loading}
					clinicDevices={clinicDevices}
					filteredLogsCount={filteredLogs.length}
					isLoggingBatch={isLoggingBatch}
					onOpenEquipmentModal={onOpenEquipmentModal}
					onQuickShiftBatch={onQuickShiftBatch}
					onOpenKraftModal={onOpenKraftModal}
				/>
			) : (
				logsSlice.visibleItems.map((log) => {
					const isStamped = Boolean(stampedRows[log.id] || log.notes?.includes("ЭЦП"));
					return (
						<AutoclaveMobileCycleCardItem
							key={log.id}
							log={log}
							isStamped={isStamped}
							onPrintSinglePouch={onPrintSinglePouch}
							onStampVerification={onStampVerification}
							onSelectLogForSheet={onSelectLogForSheet}
						/>
					);
				})
			)}

			<AutoclaveMobileFloatingBar
				isLoggingBatch={isLoggingBatch}
				onQuickShiftBatch={onQuickShiftBatch}
			/>
		</div>
	);
}
