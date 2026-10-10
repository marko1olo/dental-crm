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
 * SanPiN 3.3686-21 Autoclave Sterilization Register Table (Form 257/u Facade)
 * High-performance composite coordinator for desktop table & mobile touch views.
 */
export function AutoclaveRegisterTable({
	logs,
	filteredLogs,
	logsSlice,
	loading,
	clinicDevices,
	searchQuery,
	setSearchQuery,
	deviceFilter,
	setDeviceFilter,
	stampedRows,
	onStampVerification,
	onOpenEquipmentModal,
	onPrintBatchPouches,
	onPrintSinglePouch,
	onOpenKraftForLog,
	onQuickShiftBatch,
	isLoggingBatch,
	onOpenNewCycleModal,
	onGenerateMonthlyForm257,
	onOpenJournal257Modal,
	onOpenKraftModal,
	onLoadMore,
	onLoadAll,
}: AutoclaveRegisterTableProps) {
	// Mobile Bottom Sheet state for general toolbar actions
	const [isMobileToolbarSheetOpen, setIsMobileToolbarSheetOpen] = useState(false);

	// Mobile Bottom Sheet state for cycle card actions
	const [selectedLogForSheet, setSelectedLogForSheet] = useState<SterilizationLogRecord | null>(null);

	return (
		<div
			className="sanpin-table-wrapper w-full min-w-0"
			style={{ position: "relative", zIndex: 1, width: "100%" }}
		>
			{/* Adaptive Toolbar (Desktop strip + Mobile 1-row trigger) */}
			<AutoclaveRegisterToolbar
				searchQuery={searchQuery}
				setSearchQuery={setSearchQuery}
				deviceFilter={deviceFilter}
				setDeviceFilter={setDeviceFilter}
				clinicDevices={clinicDevices}
				logs={logs}
				isLoggingBatch={isLoggingBatch}
				onOpenEquipmentModal={onOpenEquipmentModal}
				onPrintBatchPouches={onPrintBatchPouches}
				onQuickShiftBatch={onQuickShiftBatch}
				onOpenNewCycleModal={onOpenNewCycleModal}
				onGenerateMonthlyForm257={onGenerateMonthlyForm257}
				onOpenJournal257Modal={onOpenJournal257Modal}
				onOpenMobileSheet={() => setIsMobileToolbarSheetOpen(true)}
			/>

			{/* Desktop Table View (Hidden on Mobile) */}
			<AutoclaveRegisterRows
				logsSlice={logsSlice}
				filteredLogs={filteredLogs}
				loading={loading}
				clinicDevices={clinicDevices}
				stampedRows={stampedRows}
				onStampVerification={onStampVerification}
				onOpenEquipmentModal={onOpenEquipmentModal}
				onPrintBatchPouches={onPrintBatchPouches}
				onPrintSinglePouch={onPrintSinglePouch}
				onOpenKraftForLog={onOpenKraftForLog}
				onOpenNewCycleModal={onOpenNewCycleModal || (() => {})}
				onOpenJournal257Modal={onOpenJournal257Modal}
				onOpenKraftModal={onOpenKraftModal}
			/>

			{/* Mobile Cards View (Hidden on Desktop) */}
			<AutoclaveMobileCards
				logsSlice={logsSlice}
				filteredLogs={filteredLogs}
				loading={loading}
				clinicDevices={clinicDevices}
				stampedRows={stampedRows}
				isLoggingBatch={isLoggingBatch}
				onStampVerification={onStampVerification}
				onOpenEquipmentModal={onOpenEquipmentModal}
				onPrintSinglePouch={onPrintSinglePouch}
				onQuickShiftBatch={onQuickShiftBatch}
				onOpenKraftModal={onOpenKraftModal}
				onSelectLogForSheet={(log) => setSelectedLogForSheet(log)}
			/>

			{/* Virtualized/Pagination Controls */}
			<AutoclavePagination
				logsSlice={logsSlice}
				onLoadMore={onLoadMore}
				onLoadAll={onLoadAll}
			/>

			{/* Apple HIG Mobile Bottom Sheets */}
			<AutoclaveMobileActionSheet
				isToolbarSheetOpen={isMobileToolbarSheetOpen}
				onCloseToolbarSheet={() => setIsMobileToolbarSheetOpen(false)}
				logs={logs}
				clinicDevices={clinicDevices}
				isLoggingBatch={isLoggingBatch}
				onQuickShiftBatch={onQuickShiftBatch}
				onPrintBatchPouches={onPrintBatchPouches}
				onOpenEquipmentModal={onOpenEquipmentModal}
				onOpenNewCycleModal={onOpenNewCycleModal || (() => {})}
				onGenerateMonthlyForm257={onGenerateMonthlyForm257}
				onOpenKraftModal={onOpenKraftModal}
				selectedLogForSheet={selectedLogForSheet}
				onCloseCycleSheet={() => setSelectedLogForSheet(null)}
				stampedRows={stampedRows}
				onStampVerification={onStampVerification}
				onPrintSinglePouch={onPrintSinglePouch}
				onOpenKraftForLog={onOpenKraftForLog}
			/>
		</div>
	);
}
