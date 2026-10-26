import type { SterilizationLogRecord } from "@dental/shared";
import React, { useState } from "react";
import {
	AutoclaveMobileActionSheet,
	AutoclaveMobileCards,
	AutoclavePagination,
	AutoclaveRegisterRows,
	AutoclaveRegisterToolbar,
} from "./autoclave";
import type { AutoclaveRegisterTableProps } from "./autoclave/types";

export type { AutoclaveRegisterTableProps } from "./autoclave/types";

/**
 * SanPiN Autoclave Sterilization Register Table (Facade)
 * Composite coordinator for desktop table & mobile touch views.
 * Mandate 8b: strictly <= 120 lines.
 */
export function AutoclaveRegisterTable(props: AutoclaveRegisterTableProps) {
	const [isMobileToolbarSheetOpen, setIsMobileToolbarSheetOpen] = useState(false);
	const [selectedLogForSheet, setSelectedLogForSheet] = useState<SterilizationLogRecord | null>(null);

	const {
		logs, filteredLogs, logsSlice, loading, clinicDevices,
		searchQuery, setSearchQuery, deviceFilter, setDeviceFilter,
		stampedRows, onStampVerification, onOpenEquipmentModal,
		onPrintBatchPouches, onPrintSinglePouch, onOpenKraftForLog,
		onQuickShiftBatch, isLoggingBatch, onOpenNewCycleModal,
		onGenerateMonthlySterilizationLog, onGenerateMonthlyForm257,
		onOpenSterilizationLogModal, onOpenJournal257Modal, onOpenKraftModal,
		onLoadMore, onLoadAll,
	} = props;

	const handleMonthlyLog = onGenerateMonthlySterilizationLog || onGenerateMonthlyForm257 || (() => {});
	const handleOpenLogModal = onOpenSterilizationLogModal || onOpenJournal257Modal || (() => {});

	return (
		<div className="sanpin-table-wrapper w-full min-w-0" style={{ position: "relative", zIndex: 1, width: "100%" }}>
			<AutoclaveRegisterToolbar
				searchQuery={searchQuery} setSearchQuery={setSearchQuery}
				deviceFilter={deviceFilter} setDeviceFilter={setDeviceFilter}
				clinicDevices={clinicDevices} logs={logs} isLoggingBatch={isLoggingBatch}
				onOpenEquipmentModal={onOpenEquipmentModal} onPrintBatchPouches={onPrintBatchPouches}
				onQuickShiftBatch={onQuickShiftBatch} onOpenNewCycleModal={onOpenNewCycleModal}
				onGenerateMonthlySterilizationLog={handleMonthlyLog}
				onGenerateMonthlyForm257={handleMonthlyLog}
				onOpenSterilizationLogModal={handleOpenLogModal}
				onOpenJournal257Modal={handleOpenLogModal}
				onOpenMobileSheet={() => setIsMobileToolbarSheetOpen(true)}
			/>

			<AutoclaveRegisterRows
				logsSlice={logsSlice} filteredLogs={filteredLogs} loading={loading}
				clinicDevices={clinicDevices} stampedRows={stampedRows}
				onStampVerification={onStampVerification} onOpenEquipmentModal={onOpenEquipmentModal}
				onPrintBatchPouches={onPrintBatchPouches} onPrintSinglePouch={onPrintSinglePouch}
				onOpenKraftForLog={onOpenKraftForLog} onOpenNewCycleModal={onOpenNewCycleModal || (() => {})}
				onOpenJournal257Modal={onOpenJournal257Modal} onOpenKraftModal={onOpenKraftModal}
			/>

			<AutoclaveMobileCards
				logsSlice={logsSlice} filteredLogs={filteredLogs} loading={loading}
				clinicDevices={clinicDevices} stampedRows={stampedRows} isLoggingBatch={isLoggingBatch}
				onStampVerification={onStampVerification} onOpenEquipmentModal={onOpenEquipmentModal}
				onPrintSinglePouch={onPrintSinglePouch} onQuickShiftBatch={onQuickShiftBatch}
				onOpenKraftModal={onOpenKraftModal} onSelectLogForSheet={(log) => setSelectedLogForSheet(log)}
			/>

			<AutoclavePagination logsSlice={logsSlice} onLoadMore={onLoadMore} onLoadAll={onLoadAll} />

			<AutoclaveMobileActionSheet
				isToolbarSheetOpen={isMobileToolbarSheetOpen}
				onCloseToolbarSheet={() => setIsMobileToolbarSheetOpen(false)}
				logs={logs} clinicDevices={clinicDevices} isLoggingBatch={isLoggingBatch}
				onQuickShiftBatch={onQuickShiftBatch} onPrintBatchPouches={onPrintBatchPouches}
				onOpenEquipmentModal={onOpenEquipmentModal} onOpenNewCycleModal={onOpenNewCycleModal || (() => {})}
				onGenerateMonthlySterilizationLog={handleMonthlyLog}
				onGenerateMonthlyForm257={handleMonthlyLog} onOpenKraftModal={onOpenKraftModal}
				selectedLogForSheet={selectedLogForSheet} onCloseCycleSheet={() => setSelectedLogForSheet(null)}
				stampedRows={stampedRows} onStampVerification={onStampVerification}
				onPrintSinglePouch={onPrintSinglePouch} onOpenKraftForLog={onOpenKraftForLog}
			/>
		</div>
	);
}

export default AutoclaveRegisterTable;
