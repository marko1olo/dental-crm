import React from "react";
import { JournalTabSelectorsRow, type JournalTabSelectorsRowProps } from "./JournalTabSelectorsRow";
import { JournalTabPeriodRow, type JournalTabPeriodRowProps } from "./JournalTabPeriodRow";
import { JournalTabActionButtons, type JournalTabActionButtonsProps } from "./JournalTabActionButtons";

export interface JournalTabFiltersBarProps extends JournalTabSelectorsRowProps, JournalTabPeriodRowProps, JournalTabActionButtonsProps {}

export const JournalTabFiltersBar: React.FC<JournalTabFiltersBarProps> = (props) => (
	<div
		style={{
			display: "flex", flexDirection: "column", gap: "0.75rem",
			background: "var(--paper-strong, #f8fafc)", padding: "0.875rem",
			borderRadius: "10px", border: "1px solid var(--line, #e2e8f0)",
		}}
	>
		<JournalTabSelectorsRow
			searchQuery={props.searchQuery} onSearchChange={props.onSearchChange}
			selectedSterilizerId={props.selectedSterilizerId} onSterilizerChange={props.onSterilizerChange}
			selectedRegimeId={props.selectedRegimeId} onRegimeChange={props.onRegimeChange}
			selectedStatus={props.selectedStatus} onStatusChange={props.onStatusChange}
		/>
		<div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--line, #e2e8f0)" }}>
			<JournalTabPeriodRow
				periodPreset={props.periodPreset} onPresetChange={props.onPresetChange}
				startDate={props.startDate} onStartDateChange={props.onStartDateChange}
				endDate={props.endDate} onEndDateChange={props.onEndDateChange}
				onGenerateBatch={props.onGenerateBatch}
				filteredCount={props.filteredCount} totalCount={props.totalCount}
			/>
			<JournalTabActionButtons
				onRegulatoryExport={props.onRegulatoryExport}
				onMonthlyExport={props.onMonthlyExport}
				onCsvExport={props.onCsvExport}
				onPrintJournal={props.onPrintJournal}
			/>
		</div>
	</div>
);
