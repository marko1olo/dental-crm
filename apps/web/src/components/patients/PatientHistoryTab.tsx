/**
 * apps/web/src/components/patients/PatientHistoryTab.tsx
 * DENTE Dental CRM — Канонический координатор-фасад (Layer 5) клинического таймлайна.
 */

import React from "react";
import { Calendar } from "lucide-react";
import "./PatientHistoryTab.css";
import {
	type ClinicalSpecialty, type SpecialtyFilterOption, SPECIALTY_FILTERS,
	type ClinicalMaterialItem, type ClinicalAttachedScan, type ClinicalVisitItem,
	type PatientHistoryTabProps, DEFAULT_CLINICAL_VISITS, usePatientHistory,
	HistoryFiltersBar, HistoryTimelineCard, HistoryFinancialSummary, HistoryDetailDrawer,
	HistoryEmptyState,
} from "./patientHistory";

export type {
	ClinicalSpecialty, SpecialtyFilterOption, ClinicalMaterialItem,
	ClinicalAttachedScan, ClinicalVisitItem, PatientHistoryTabProps,
};
export { SPECIALTY_FILTERS, DEFAULT_CLINICAL_VISITS };

export const PatientHistoryTab: React.FC<PatientHistoryTabProps> = React.memo(
	function PatientHistoryTab({
		patientId,
		patientName = "Пациент",
		visits: initialVisits,
		dashboard,
		onNavigateToVisit,
		onNewAppointment,
		onPrintProtocol,
		onExtract043,
		onAddToTreatmentPlan,
		className = "",
	}) {
		const {
			selectedSpecialty, setSelectedSpecialty, searchQuery, setSearchQuery,
			expandedVisitIds, selectedDetailVisit, rawVisitsList, filteredVisits,
			groupedByMonth, financialSummary, getSpecialtyCount, toggleAccordion,
			handleExpandAll, handleCollapseAll, handleExtract043, handleAddToTreatmentPlan,
			handleOpenDetailDrawer, handleCloseDetailDrawer,
		} = usePatientHistory({
			patientId, initialVisits, dashboard, onPrintProtocol, onExtract043, onAddToTreatmentPlan,
		});

		return (
			<div className={`clinical-timeline-container ${className}`} data-testid="patient-history-timeline-tab">
				<HistoryFiltersBar
					selectedSpecialty={selectedSpecialty}
					onSelectSpecialty={setSelectedSpecialty}
					searchQuery={searchQuery}
					onSearchQueryChange={setSearchQuery}
					onClearSearch={() => setSearchQuery("")}
					totalVisitsCount={rawVisitsList.length}
					getSpecialtyCount={getSpecialtyCount}
					onExpandAll={handleExpandAll}
					onCollapseAll={handleCollapseAll}
					onNewAppointment={onNewAppointment}
					patientId={patientId}
				/>

				{rawVisitsList.length > 0 && (
					<HistoryFinancialSummary summary={financialSummary} patientName={patientName} />
				)}

				{filteredVisits.length === 0 && (
					<HistoryEmptyState searchQuery={searchQuery} />
				)}

				{groupedByMonth.map((group) => (
					<div key={group.monthKey} className="clinical-month-group" data-testid={`timeline-month-group-${group.monthKey}`}>
						<div className="clinical-month-header">
							<div className="clinical-month-title">
								<Calendar className="w-3.5 h-3.5 text-[var(--teal)]" />
								<span>{group.monthNameRu}</span>
								<span className="clinical-month-badge">
									{group.items.length} {group.items.length === 1 ? "визит" : group.items.length < 5 ? "визита" : "визитов"}
								</span>
							</div>
							<div className="text-[11px] font-mono font-bold text-[var(--ink)]">
								{group.totalAmountRub.toLocaleString("ru-RU")} ₽
							</div>
						</div>

						<div className="flex flex-col gap-2">
							{group.items.map((visit) => (
								<HistoryTimelineCard
									key={visit.id}
									visit={visit}
									isExpanded={expandedVisitIds.has(visit.id)}
									onToggle={() => toggleAccordion(visit.id)}
									onExtract043={handleExtract043}
									onAddToTreatmentPlan={handleAddToTreatmentPlan}
									onNavigateToVisit={onNavigateToVisit}
									onOpenDetailDrawer={handleOpenDetailDrawer}
								/>
							))}
						</div>
					</div>
				))}

				<HistoryDetailDrawer
					visit={selectedDetailVisit}
					isOpen={Boolean(selectedDetailVisit)}
					onClose={handleCloseDetailDrawer}
					onExtract043={handleExtract043}
					onAddToTreatmentPlan={handleAddToTreatmentPlan}
					onNavigateToVisit={onNavigateToVisit}
				/>
			</div>
		);
	},
);

PatientHistoryTab.displayName = "PatientHistoryTab";
