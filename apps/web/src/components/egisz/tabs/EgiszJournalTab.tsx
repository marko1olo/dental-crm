/**
 * EgiszJournalTab.tsx
 *
 * Tab 6: EGISZ REMD Documents Journal & Outbox Queue.
 * Real-time monitoring of registered CDA packages, validation errors, and batch archives.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { JournalHeaderActions } from "./journal/JournalHeaderActions";
import { JournalRecordsTable } from "./journal/JournalRecordsTable";
import { JournalRemediationCard } from "./journal/JournalRemediationCard";
import { JournalStatsRibbon } from "./journal/JournalStatsRibbon";
import type { EgiszJournalTabProps } from "./journal/journalTypes";

export type { EgiszJournalTabProps } from "./journal/journalTypes";

export const EgiszJournalTab: React.FC<EgiszJournalTabProps> = ({
	records,
	journalFilter,
	onJournalFilterChange,
	selectedJournalId,
	onSelectJournalId,
	onBatchZipExport,
	onSingleZipExport,
	onSignJournalDocument,
	onExportJournalZip,
	onSwitchToSignatureTab,
	onRefreshOutbox,
	onBatchSendShift,
	isLoading,
}) => {
	const selectedRecord = records.find((r) => r.id === selectedJournalId);

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<JournalHeaderActions
				onBatchSendShift={onBatchSendShift}
				onRefreshOutbox={onRefreshOutbox}
				onBatchZipExport={onBatchZipExport}
			/>

			<JournalStatsRibbon
				records={records}
				journalFilter={journalFilter}
				onJournalFilterChange={onJournalFilterChange}
			/>

			<JournalRemediationCard
				selectedRecord={selectedRecord}
				journalFilter={journalFilter}
			/>

			<JournalRecordsTable
				records={records}
				journalFilter={journalFilter}
				selectedJournalId={selectedJournalId}
				onSelectJournalId={onSelectJournalId}
				onSingleZipExport={onSingleZipExport}
				onSignJournalDocument={onSignJournalDocument}
				onExportJournalZip={onExportJournalZip}
				onSwitchToSignatureTab={onSwitchToSignatureTab}
				isLoading={isLoading}
			/>
		</div>
	);
};
