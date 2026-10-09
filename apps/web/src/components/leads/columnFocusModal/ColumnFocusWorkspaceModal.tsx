/**
 * DENTE Dental CRM — Column Focus Workspace Modal Component (Layer 4)
 *
 * Mandate 8n (Clinical Ergonomics, Scale Sovereignty & Solo Doctor Autonomy)
 * Orchestrates Header, BatchToolbar, CardsList, TableView, and Footer into
 * a focused fullscreen 92vw / 90vh clinical workspace.
 */

import React from "react";
import { Filter } from "lucide-react";
import { ColumnFocusBatchToolbar } from "./ColumnFocusBatchToolbar";
import { ColumnFocusCardsList } from "./ColumnFocusCardsList";
import { ColumnFocusHeader } from "./ColumnFocusHeader";
import { ColumnFocusTableView } from "./ColumnFocusTableView";
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
				{/* 1. Header & Metrics Bar */}
				<ColumnFocusHeader
					column={column}
					metrics={metrics}
					viewMode={viewMode}
					onViewModeChange={setViewMode}
					onClose={onClose}
				/>

				{/* 2. Filter & Bulk Action Toolbar */}
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
					onClearSelection={() =>
						toggleSelectAll() // when selectedLeadIds.size > 0, toggleSelectAll deselects all
					}
				/>

				{/* 3. Content Workspace (Dual View) */}
				<div className="expanded-focus-content-scroll">
					{displayLeads.length === 0 ? (
						<div className="expanded-focus-empty-state">
							<Filter
								size={32}
								className="text-[var(--muted)] opacity-40 mb-2"
							/>
							<p className="text-[14px] font-semibold text-[var(--ink)]">
								{columnLeads.length === 0
									? "В этом этапе пока нет обращений"
									: "По заданным фильтрам ничего не найдено"}
							</p>
							<p className="text-[12px] text-[var(--muted)] mt-1">
								{columnLeads.length === 0
									? "Новые лиды появятся здесь автоматически или перетащите их с соседних колонок"
									: "Попробуйте сбросить поисковый запрос или фильтр срочности SLA"}
							</p>
						</div>
					) : viewMode === "cards" ? (
						<ColumnFocusCardsList
							displayLeads={displayLeads}
							visibleLeads={visibleLeads}
							selectedLeadIds={selectedLeadIds}
							onToggleSelectLead={toggleSelectLead}
							onEditLead={onEditLead}
							onStatusChange={onStatusChange}
							onScheduleLead={onScheduleLead}
							onCreatePatient={onCreatePatient}
							onClose={onClose}
							nextStageInfo={nextStageInfo}
							visibleLimit={visibleLimit}
							onLoadMore={handleLoadMore}
						/>
					) : (
						<ColumnFocusTableView
							displayLeads={displayLeads}
							visibleLeads={visibleLeads}
							selectedLeadIds={selectedLeadIds}
							onToggleSelectLead={toggleSelectLead}
							onToggleSelectAll={toggleSelectAll}
							onEditLead={onEditLead}
							onStatusChange={onStatusChange}
							onScheduleLead={onScheduleLead}
							onCreatePatient={onCreatePatient}
							onClose={onClose}
							nextStageInfo={nextStageInfo}
							visibleLimit={visibleLimit}
							onLoadMore={handleLoadMore}
						/>
					)}
				</div>

				{/* 4. Footer Status Bar */}
				<footer className="expanded-focus-footer">
					<div className="flex items-center gap-3 text-[11.5px] text-[var(--muted)]">
						<span>
							Показано: <strong>{visibleLeads.length}</strong> из{" "}
							{displayLeads.length}
							{displayLeads.length !== columnLeads.length
								? ` (всего ${columnLeads.length})`
								: ""}
						</span>
						<span>·</span>
						<span>
							Клавиша <strong>Esc</strong> для возврата к доске
						</span>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="expanded-focus-footer-close-btn"
						>
							Закрыть
						</button>
					</div>
				</footer>
			</div>
		</div>
	);
};
