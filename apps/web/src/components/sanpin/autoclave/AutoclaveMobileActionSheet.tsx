import type { SterilizationLogRecord } from "@dental/shared";
import React from "react";
import type { ClinicAutoclaveDevice } from "./autoclaveDeviceTypes";
import { AutoclaveMobileCycleSheet } from "./AutoclaveMobileCycleSheet.js";
import { AutoclaveMobileToolbarSheet } from "./AutoclaveMobileToolbarSheet.js";

export interface AutoclaveMobileActionSheetProps {
	readonly isToolbarSheetOpen: boolean;
	readonly onCloseToolbarSheet: () => void;
	readonly logs: SterilizationLogRecord[];
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly isLoggingBatch: boolean;
	readonly onQuickShiftBatch: () => void;
	readonly onPrintBatchPouches: (log: SterilizationLogRecord, count?: number) => void;
	readonly onOpenEquipmentModal: () => void;
	readonly onOpenNewCycleModal?: (() => void) | undefined;
	readonly onGenerateMonthlySterilizationLog?: (() => void) | undefined;
	readonly onGenerateMonthlyForm257?: (() => void) | undefined;
	readonly onOpenKraftModal: () => void;
	readonly selectedLogForSheet: SterilizationLogRecord | null;
	readonly onCloseCycleSheet: () => void;
	readonly stampedRows: Record<string, boolean>;
	readonly onStampVerification: (logId: string) => void;
	readonly onPrintSinglePouch: (log: SterilizationLogRecord) => void;
	readonly onOpenKraftForLog: (log: SterilizationLogRecord) => void;
}

export function AutoclaveMobileActionSheet(props: AutoclaveMobileActionSheetProps) {
	const isStamped = Boolean(
		props.selectedLogForSheet &&
		(props.stampedRows[props.selectedLogForSheet.id] ||
		 props.selectedLogForSheet.notes?.includes("ЭЦП"))
	);

	return (
		<>
			<AutoclaveMobileToolbarSheet
				isOpen={props.isToolbarSheetOpen}
				onClose={props.onCloseToolbarSheet}
				logs={props.logs}
				clinicDevices={props.clinicDevices}
				isLoggingBatch={props.isLoggingBatch}
				onQuickShiftBatch={props.onQuickShiftBatch}
				onPrintBatchPouches={props.onPrintBatchPouches}
				onOpenEquipmentModal={props.onOpenEquipmentModal}
				onOpenNewCycleModal={props.onOpenNewCycleModal}
				onGenerateMonthlySterilizationLog={props.onGenerateMonthlySterilizationLog}
				onGenerateMonthlyForm257={props.onGenerateMonthlyForm257}
				onOpenKraftModal={props.onOpenKraftModal}
			/>
			<AutoclaveMobileCycleSheet
				selectedLog={props.selectedLogForSheet}
				onClose={props.onCloseCycleSheet}
				isStamped={isStamped}
				onStampVerification={props.onStampVerification}
				onPrintSinglePouch={props.onPrintSinglePouch}
				onPrintBatchPouches={props.onPrintBatchPouches}
				onOpenKraftForLog={props.onOpenKraftForLog}
			/>
		</>
	);
}
