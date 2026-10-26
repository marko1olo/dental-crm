import React from "react";
import {
	DEFAULT_CLINIC_LEGAL_INFO,
	exportSterilizationLogToCsv,
	generateBatchSterilizationRecords,
	generateSterilizationLogPrintHtml,
	generateRegulatorySanpinInspectionHtml,
} from "./autoclaveLogEngine.js";
import { type AutoclaveJournal257TabProps } from "./journalTab/journalTabTypes";
import { useJournalTabState } from "./journalTab/useJournalTabState";
import { JournalTabMissingBanner } from "./journalTab/JournalTabMissingBanner";
import { JournalTabFiltersBar } from "./journalTab/JournalTabFiltersBar";
import { JournalTabTable } from "./journalTab/JournalTabTable";

export type AutoclaveSterilizationLogTabProps = AutoclaveJournal257TabProps;
export type { AutoclaveJournal257TabProps };

export function AutoclaveSterilizationLogTab({
	records, activeClinicalDates, onDeleteRecord, onVerifyRecord,
	onBatchAddRecords, onOpenNewCycle, clinicInfo = DEFAULT_CLINIC_LEGAL_INFO,
}: AutoclaveSterilizationLogTabProps) {
	const state = useJournalTabState(records, clinicInfo, activeClinicalDates, onBatchAddRecords);

	const handleExportCsv = () => {
		const csvContent = exportSterilizationLogToCsv(state.filteredRecords);
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `Zhurnal_avtoklavirovaniya_${new Date().toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const handleGenerateBatchForPeriod = () => {
		const targetDates = state.missingDaysAudit?.missingDates?.length ? state.missingDaysAudit.missingDates : undefined;
		const { currentMonthStart, currentMonthEnd } = state.getDynamicDateBounds();
		const start = state.startDate || currentMonthStart;
		const end = state.endDate || currentMonthEnd;
		const generated = generateBatchSterilizationRecords({
			startDate: targetDates ? undefined : start, endDate: targetDates ? undefined : end, targetDates,
			excludeSundays: !targetDates, cyclesPerDay: 2, packsPerCycle: 14,
			sterilizerId: state.selectedSterilizerId !== "all" ? state.selectedSterilizerId : "autoclave-melag-vacuklav-23b",
			operatorStaffFullName: clinicInfo.headNurse || "Сотрудник ЦСО / Врач",
			headNurseSignatureFullName: clinicInfo.chiefDoctor || "Ответственный по СанПиН", isHeadNurseVerified: true,
		});
		onBatchAddRecords?.(generated);
		if (!state.startDate || !state.endDate) { state.setStartDate(start); state.setEndDate(end); state.setPeriodPreset("current_month"); }
	};

	const handleGenerateMonthlySterilizationLog = () => {
		const { currentMonthStart, currentMonthEnd, currentMonthNameRu } = state.getDynamicDateBounds();
		const generated = generateBatchSterilizationRecords({
			startDate: currentMonthStart, endDate: currentMonthEnd, excludeSundays: true, cyclesPerDay: 2, packsPerCycle: 14,
			sterilizerId: state.selectedSterilizerId !== "all" ? state.selectedSterilizerId : "autoclave-melag-vacuklav-23b",
			operatorStaffFullName: clinicInfo.headNurse || "Сотрудник ЦСО / Врач",
			headNurseSignatureFullName: clinicInfo.chiefDoctor || "Ответственный по СанПиН", isHeadNurseVerified: true,
		});
		onBatchAddRecords?.(generated);
		state.setStartDate(currentMonthStart); state.setEndDate(currentMonthEnd); state.setPeriodPreset("current_month");
		const printHtml = generateSterilizationLogPrintHtml(generated, clinicInfo, `за ${currentMonthNameRu}`);
		const w = window.open("", "_blank");
		if (w) { w.document.write(printHtml); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
	};

	const handlePrintJournal = () => {
		const printHtml = generateSterilizationLogPrintHtml(state.filteredRecords.length > 0 ? state.filteredRecords : records, clinicInfo, state.periodLabel);
		const w = window.open("", "_blank");
		if (w) { w.document.write(printHtml); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
	};

	const handleGenerateRegulatorySanpinInspection = () => {
		const printHtml = generateRegulatorySanpinInspectionHtml({
			form257Records: state.filteredRecords.length > 0 ? state.filteredRecords : records, clinicInfo, periodLabelRu: state.periodLabel,
		});
		const w = window.open("", "_blank");
		if (w) { w.document.write(printHtml); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<JournalTabMissingBanner audit={state.missingDaysAudit} onGenerateBatch={handleGenerateBatchForPeriod} />
			<JournalTabFiltersBar
				searchQuery={state.searchQuery} onSearchChange={state.setSearchQuery}
				selectedSterilizerId={state.selectedSterilizerId} onSterilizerChange={state.setSelectedSterilizerId}
				selectedRegimeId={state.selectedRegimeId} onRegimeChange={state.setSelectedRegimeId}
				selectedStatus={state.selectedStatus} onStatusChange={state.setSelectedStatus}
				periodPreset={state.periodPreset} onPresetChange={state.handlePresetChange}
				startDate={state.startDate} onStartDateChange={(d) => { state.setStartDate(d); state.setPeriodPreset("custom"); }}
				endDate={state.endDate} onEndDateChange={(d) => { state.setEndDate(d); state.setPeriodPreset("custom"); }}
				onGenerateBatch={handleGenerateBatchForPeriod} filteredCount={state.filteredRecords.length} totalCount={records.length}
				onRegulatoryExport={handleGenerateRegulatorySanpinInspection} onMonthlyExport={handleGenerateMonthlySterilizationLog}
				onCsvExport={handleExportCsv} onPrintJournal={handlePrintJournal}
			/>
			<JournalTabTable
				records={records} filteredRecords={state.filteredRecords} headNurseName={clinicInfo.headNurse}
				onVerifyRecord={onVerifyRecord} onDeleteRecord={onDeleteRecord} onOpenNewCycle={onOpenNewCycle}
			/>
		</div>
	);
}

export { AutoclaveSterilizationLogTab as AutoclaveJournal257Tab };
export default AutoclaveSterilizationLogTab;
