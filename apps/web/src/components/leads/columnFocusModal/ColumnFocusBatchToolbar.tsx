/**
 * DENTE Dental CRM — Column Focus Batch & Filter Toolbar (Layer 1)
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ColumnFocusBulkActionBar } from "./ColumnFocusBulkActionBar";
import { ColumnFocusFilterRow } from "./ColumnFocusFilterRow";
import type { ColumnFocusBatchToolbarProps } from "./types";

export const ColumnFocusBatchToolbar: React.FC<ColumnFocusBatchToolbarProps> = (
	props,
) => {
	const {
		searchQuery,
		onSearchQueryChange,
		urgencyFilter,
		onUrgencyFilterChange,
		metrics,
		sortOption,
		onSortOptionChange,
		onExportCsv,
		selectedLeadIds,
		totalDisplayLeads,
		onToggleSelectAll,
		nextStageInfo,
		isProcessingBatch,
		onBatchAdvance,
		onBatchMoveToStage,
		staff,
		batchTargetDoctorId,
		onBatchTargetDoctorIdChange,
		onBatchAssign,
		onClearSelection,
	} = props;

	return (
		<>
			<ColumnFocusFilterRow
				searchQuery={searchQuery}
				onSearchQueryChange={onSearchQueryChange}
				urgencyFilter={urgencyFilter}
				onUrgencyFilterChange={onUrgencyFilterChange}
				metrics={metrics}
				sortOption={sortOption}
				onSortOptionChange={onSortOptionChange}
				onExportCsv={onExportCsv}
			/>

			<ColumnFocusBulkActionBar
				selectedLeadIds={selectedLeadIds}
				totalDisplayLeads={totalDisplayLeads}
				onToggleSelectAll={onToggleSelectAll}
				nextStageInfo={nextStageInfo}
				isProcessingBatch={isProcessingBatch}
				onBatchAdvance={onBatchAdvance}
				onBatchMoveToStage={onBatchMoveToStage}
				staff={staff}
				batchTargetDoctorId={batchTargetDoctorId}
				onBatchTargetDoctorIdChange={onBatchTargetDoctorIdChange}
				onBatchAssign={onBatchAssign}
				onExportCsv={onExportCsv}
				onClearSelection={onClearSelection}
			/>
		</>
	);
};
