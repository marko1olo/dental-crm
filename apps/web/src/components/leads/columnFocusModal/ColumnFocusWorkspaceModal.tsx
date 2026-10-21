/**
 * DENTE Dental CRM — Column Focus Workspace Modal Component (Layer 4)
 * Mandate 8b (<= 120 lines)
 */

import React from "react";
import { ColumnFocusBatchToolbar } from "./ColumnFocusBatchToolbar";
import { ColumnFocusContent } from "./ColumnFocusContent";
import { ColumnFocusFooter } from "./ColumnFocusFooter";
import { ColumnFocusHeader } from "./ColumnFocusHeader";
import type { ExpandedColumnFocusModalProps } from "./types";
import { useColumnFocusModalLogic } from "./useColumnFocusModalLogic";

export const ColumnFocusWorkspaceModal: React.FC<
	ExpandedColumnFocusModalProps
> = (props) => {
	const { isOpen, onClose, column, staff, onStatusChange, onEditLead, onScheduleLead, onCreatePatient } = props;
	const l = useColumnFocusModalLogic(props);

	if (!isOpen) return null;

	return (
		<div className="expanded-focus-modal-overlay" onClick={onClose} data-testid="expanded-column-modal">
			<div className="expanded-focus-modal-container" onClick={(e) => e.stopPropagation()}>
				<ColumnFocusHeader
					column={column}
					metrics={l.metrics}
					viewMode={l.viewMode}
					onViewModeChange={l.setViewMode}
					onClose={onClose}
				/>

				<ColumnFocusBatchToolbar
					searchQuery={l.searchQuery}
					onSearchQueryChange={l.setSearchQuery}
					urgencyFilter={l.urgencyFilter}
					onUrgencyFilterChange={l.setUrgencyFilter}
					metrics={l.metrics}
					sortOption={l.sortOption}
					onSortOptionChange={l.setSortOption}
					onExportCsv={l.handleExportCsv}
					selectedLeadIds={l.selectedLeadIds}
					totalDisplayLeads={l.displayLeads.length}
					onToggleSelectAll={l.toggleSelectAll}
					nextStageInfo={l.nextStageInfo}
					isProcessingBatch={l.isProcessingBatch}
					onBatchAdvance={l.handleBatchAdvance}
					onBatchMoveToStage={l.handleBatchMoveToStage}
					staff={staff}
					batchTargetDoctorId={l.batchTargetDoctorId}
					onBatchTargetDoctorIdChange={l.setBatchTargetDoctorId}
					onBatchAssign={l.handleBatchAssign}
					onClearSelection={() => l.toggleSelectAll()}
				/>

				<div className="expanded-focus-content-scroll">
					<ColumnFocusContent
						displayLeads={l.displayLeads}
						visibleLeads={l.visibleLeads}
						columnLeads={l.columnLeads}
						viewMode={l.viewMode}
						selectedLeadIds={l.selectedLeadIds}
						nextStageInfo={l.nextStageInfo}
						visibleLimit={l.visibleLimit}
						onToggleSelectLead={l.toggleSelectLead}
						onToggleSelectAll={l.toggleSelectAll}
						onEditLead={onEditLead}
						onStatusChange={onStatusChange}
						onScheduleLead={onScheduleLead}
						onCreatePatient={onCreatePatient}
						onClose={onClose}
						onLoadMore={l.handleLoadMore}
					/>
				</div>

				<ColumnFocusFooter
					visibleCount={l.visibleLeads.length}
					displayCount={l.displayLeads.length}
					totalCount={l.columnLeads.length}
					onClose={onClose}
				/>
			</div>
		</div>
	);
};
