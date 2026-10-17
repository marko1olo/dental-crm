import type React from "react";
import { CheckCircle2 } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus, RecallPeriodFilter } from "./patientRecallEngine";
import { RecallPatientRowCard } from "./RecallPatientRowCard";
import { PatientRecallsRegistryStatusChips } from "./PatientRecallsRegistryStatusChips";
import { PatientRecallsRegistryFilters } from "./PatientRecallsRegistryFilters";

export interface PatientRecallsRegistryViewProps {
	readonly filteredCandidates: readonly PatientRecallRecord[];
	readonly activeScriptCandidateId: string | null;
	readonly uniqueDoctors: readonly { readonly id: string; readonly name: string }[];
	readonly selectedDoctorId: string | "all";
	readonly onDoctorChange: (id: string | "all") => void;
	readonly selectedPeriod: RecallPeriodFilter;
	readonly onPeriodChange: (p: RecallPeriodFilter) => void;
	readonly selectedStatus?: RecallContactStatus | "all" | undefined;
	readonly onStatusChangeFilter?: ((status: RecallContactStatus | "all") => void) | undefined;
	readonly statusCounts?: {
		readonly all: number;
		readonly due_now: number;
		readonly invited: number;
		readonly scheduled: number;
		readonly completed: number;
	} | undefined;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview?: ((candidate: PatientRecallRecord) => void) | undefined;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsRegistryView: React.FC<PatientRecallsRegistryViewProps> = ({
	filteredCandidates, activeScriptCandidateId, uniqueDoctors, selectedDoctorId,
	onDoctorChange, selectedPeriod, onPeriodChange, selectedStatus = "all", onStatusChangeFilter,
	statusCounts, searchQuery, onSearchChange, onBook, onToggleScript, onTogglePreview,
	onWhatsApp, onTelegram, onCopySms, onStatusUpdate,
}) => {
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
			/>

			{filteredCandidates.length === 0 ? (
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
