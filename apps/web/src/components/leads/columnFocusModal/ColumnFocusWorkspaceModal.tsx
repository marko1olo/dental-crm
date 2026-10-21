/**
 * DENTE Dental CRM — Column Focus Workspace Modal Component (Layer 4)
 * Mandate 8b (<= 120 lines)
 */

import type React from "react";
import { ColumnFocusBatchToolbar } from "./ColumnFocusBatchToolbar";
import { ColumnFocusContent } from "./ColumnFocusContent";
import { ColumnFocusFooter } from "./ColumnFocusFooter";
import { ColumnFocusHeader } from "./ColumnFocusHeader";
import type { ExpandedColumnFocusModalProps } from "./types";
import { useColumnFocusModalLogic } from "./useColumnFocusModalLogic";

export const ColumnFocusWorkspaceModal: React.FC<
	ExpandedColumnFocusModalProps
> = (props) => {
	const {
		isOpen,
		onClose,
		column,
		staff,
		onStatusChange,
		onEditLead,
		onScheduleLead,
		onCreatePatient,
	} = props;

	const {
		viewMode,
		setViewMode,
		searchQuery,
		setSearchQuery,
		urgencyFilter,
		setUrgencyFilter,
		sortOption,
		setSortOption,
		selectedLeadIds,
		batchTargetDoctorId,
		setBatchTargetDoctorId,
		isProcessingBatch,
		columnLeads,
		metrics,
		displayLeads,
		visibleLimit,
		visibleLeads,
		nextStageInfo,
		toggleSelectLead,
		toggleSelectAll,
		handleBatchAdvance,
		handleBatchMoveToStage,
		handleBatchAssign,
		handleExportCsv,
		handleLoadMore,
	} = useColumnFocusModalLogic(props);

	if (!isOpen) return null;

	return (
		<div
			className="expanded-focus-modal-overlay"
			onClick={onClose}
			data-testid="expanded-column-modal"
		>
			<div
				className="expanded-focus-modal-container"
				onClick={(e) => e.stopPropagation()}
			>
				<ColumnFocusHeader
					column={column}
					metrics={metrics}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					onClose={onClose}
				/>

				<ColumnFocusBatchToolbar
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
					urgencyFilter={urgencyFilter}
					onUrgencyFilterChange={setUrgencyFilter}
					metrics={metrics}
					sortOption={sortOption}
					onSortOptionChange={setSortOption}
					onExportCsv={handleExportCsv}
					selectedLeadIds={selectedLeadIds}
					totalDisplayLeads={displayLeads.length}
					onToggleSelectAll={toggleSelectAll}
					nextStageInfo={nextStageInfo}
					isProcessingBatch={isProcessingBatch}
					onBatchAdvance={handleBatchAdvance}
					onBatchMoveToStage={handleBatchMoveToStage}
					staff={staff}
					batchTargetDoctorId={batchTargetDoctorId}
					onBatchTargetDoctorIdChange={setBatchTargetDoctorId}
					onBatchAssign={handleBatchAssign}
					onClearSelection={() => toggleSelectAll()}
				/>

				<div className="expanded-focus-content-scroll">
					<ColumnFocusContent
						displayLeads={displayLeads}
						visibleLeads={visibleLeads}
						columnLeads={columnLeads}
						viewMode={viewMode}
						selectedLeadIds={selectedLeadIds}
						nextStageInfo={nextStageInfo}
						visibleLimit={visibleLimit}
						onToggleSelectLead={toggleSelectLead}
						onToggleSelectAll={toggleSelectAll}
						onEditLead={onEditLead}
						onStatusChange={onStatusChange}
						onScheduleLead={onScheduleLead}
						onCreatePatient={onCreatePatient}
						onClose={onClose}
						onLoadMore={handleLoadMore}
					/>
				</div>

				<ColumnFocusFooter
					visibleCount={visibleLeads.length}
					displayCount={displayLeads.length}
					totalCount={columnLeads.length}
					onClose={onClose}
				/>
			</div>
		</div>
	);
};
