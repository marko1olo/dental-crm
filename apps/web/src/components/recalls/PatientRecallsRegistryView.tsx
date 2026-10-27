import React, { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
	toCanonicalRecallStatus,
	type CanonicalRecallWorkflowStatus,
	type PatientRecallRecord,
} from "./patientRecallEngine";
import { RecallPatientRowCard } from "./RecallPatientRowCard";
import { PatientRecallsRegistryStatusChips } from "./PatientRecallsRegistryStatusChips";
import { PatientRecallsRegistryFilters } from "./PatientRecallsRegistryFilters";
import { PatientRecallsKanbanView } from "./PatientRecallsKanbanView";
import type { PatientRecallsRegistryViewProps } from "./PatientRecallsRegistryViewTypes";

export type { PatientRecallsRegistryViewProps };

export const PatientRecallsRegistryView: React.FC<PatientRecallsRegistryViewProps> = ({
	filteredCandidates, activeScriptCandidateId, uniqueDoctors, selectedDoctorId,
	onDoctorChange, selectedPeriod, onPeriodChange, selectedStatus = "all", onStatusChangeFilter,
	statusCounts, searchQuery, onSearchChange, onBook, onToggleScript, onTogglePreview,
	onWhatsApp, onTelegram, onCopySms, onStatusUpdate,
}) => {
	const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

	const kanbanGroups = useMemo<Record<CanonicalRecallWorkflowStatus, readonly PatientRecallRecord[]>>(() => {
		const groups: Record<CanonicalRecallWorkflowStatus, PatientRecallRecord[]> = {
			not_called: [],
			reached: [],
			declined: [],
			scheduled: [],
		};
		for (const candidate of filteredCandidates) {
			const canonical = toCanonicalRecallStatus(candidate.status);
			groups[canonical].push(candidate);
		}
		return groups;
	}, [filteredCandidates]);

	return (
		<div className="recall-registry-section">
			<PatientRecallsRegistryStatusChips
				selectedStatus={selectedStatus}
				onStatusChangeFilter={onStatusChangeFilter}
				statusCounts={statusCounts}
			/>

			<PatientRecallsRegistryFilters
				searchQuery={searchQuery}
				onSearchChange={onSearchChange}
				uniqueDoctors={uniqueDoctors}
				selectedDoctorId={selectedDoctorId}
				onDoctorChange={onDoctorChange}
				selectedPeriod={selectedPeriod}
				onPeriodChange={onPeriodChange}
				viewMode={viewMode}
				onViewModeChange={setViewMode}
			/>

			{viewMode === "kanban" ? (
				<PatientRecallsKanbanView
					kanbanGroups={kanbanGroups}
					onBook={onBook}
					onWhatsApp={onWhatsApp}
					onCopySms={onCopySms}
					onStatusUpdate={onStatusUpdate}
				/>
			) : filteredCandidates.length === 0 ? (
				<div className="recall-empty-state">
					<div className="recall-empty-icon">
						<CheckCircle2 size={36} className="recall-empty-check-icon" />
					</div>
					<h3>Нет пациентов по выбранному фильтру</h3>
					<p>Все пациенты обработаны, либо срок вызова еще не наступил.</p>
				</div>
			) : (
				<div className="recall-cards-stream" role="feed" aria-label="Список пациентов на обзвон">
					{filteredCandidates.map((candidate) => (
						<RecallPatientRowCard
							key={candidate.id}
							candidate={candidate}
							isScriptActive={activeScriptCandidateId === candidate.id}
							onBook={onBook}
							onToggleScript={onToggleScript}
							onTogglePreview={onTogglePreview}
							onWhatsApp={onWhatsApp}
							onTelegram={onTelegram}
							onCopySms={onCopySms}
							onStatusUpdate={onStatusUpdate}
						/>
					))}
				</div>
			)}
		</div>
	);
};
