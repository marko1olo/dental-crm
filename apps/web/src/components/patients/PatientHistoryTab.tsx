/**
 * apps/web/src/components/patients/PatientHistoryTab.tsx — Координатор клинического таймлайна.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 */

import React from "react";
import "./PatientHistoryTab.css";
import {
	type ClinicalSpecialty, type SpecialtyFilterOption, SPECIALTY_FILTERS,
	type ClinicalMaterialItem, type ClinicalAttachedScan, type ClinicalVisitItem,
	type PatientHistoryTabProps, DEFAULT_CLINICAL_VISITS, usePatientHistory,
	HistoryFiltersBar, HistoryFinancialSummary, HistoryDetailDrawer, HistoryEmptyState,
} from "./patientHistory";
import { PatientTimelineScroller, type VirtualTimelineEntry } from "./patientHistory/PatientTimelineScroller";

export type {
	ClinicalSpecialty, SpecialtyFilterOption, ClinicalMaterialItem,
	ClinicalAttachedScan, ClinicalVisitItem, PatientHistoryTabProps, VirtualTimelineEntry,
};
export { SPECIALTY_FILTERS, DEFAULT_CLINICAL_VISITS };

export const PatientHistoryTab: React.FC<PatientHistoryTabProps> = React.memo(
	function PatientHistoryTab(props) {
		const { patientId, patientName = "Пациент", onNewAppointment, onNavigateToVisit, className = "" } = props;
		const state = usePatientHistory(props);

		return (
			<div className={`clinical-timeline-container ${className}`} data-testid="patient-history-timeline-tab">
				<HistoryFiltersBar
					selectedSpecialty={state.selectedSpecialty}
					onSelectSpecialty={state.setSelectedSpecialty}
					searchQuery={state.searchQuery}
					onSearchQueryChange={state.setSearchQuery}
					onClearSearch={() => state.setSearchQuery("")}
					totalVisitsCount={state.rawVisitsList.length}
					getSpecialtyCount={state.getSpecialtyCount}
					onExpandAll={state.handleExpandAll}
					onCollapseAll={state.handleCollapseAll}
					onNewAppointment={onNewAppointment}
					patientId={patientId}
				/>

				{state.rawVisitsList.length > 0 && (
					<HistoryFinancialSummary summary={state.financialSummary} patientName={patientName} />
				)}

				{state.filteredVisits.length === 0 ? (
					<HistoryEmptyState searchQuery={state.searchQuery} />
				) : (
					<PatientTimelineScroller
						groupedByMonth={state.groupedByMonth}
						expandedVisitIds={state.expandedVisitIds}
						onToggleAccordion={state.toggleAccordion}
						onExtract043={state.handleExtract043}
						onAddToTreatmentPlan={state.handleAddToTreatmentPlan}
						onNavigateToVisit={onNavigateToVisit}
						onOpenDetailDrawer={state.handleOpenDetailDrawer}
					/>
				)}

				<HistoryDetailDrawer
					visit={state.selectedDetailVisit}
					isOpen={Boolean(state.selectedDetailVisit)}
					onClose={state.handleCloseDetailDrawer}
					onExtract043={state.handleExtract043}
					onAddToTreatmentPlan={state.handleAddToTreatmentPlan}
					onNavigateToVisit={onNavigateToVisit}
				/>
			</div>
		);
	},
);

PatientHistoryTab.displayName = "PatientHistoryTab";
