import type React from "react";
import type { ClinicalTaskCallType } from "@dental/shared";
import type { PatientRecallRecord, RecallContactStatus, RecallPeriodFilter } from "./patientRecallEngine";
import { determineTaskCallTypeForCandidate } from "./recallRecordTypes";
import { PatientRecallsRegistryView } from "./PatientRecallsRegistryView";
import { RecallDispensaryFunnel } from "./RecallDispensaryFunnel";
import { PatientRecallsTaskCallsTab } from "./PatientRecallsTaskCallsTab";
import type { RecallHubActiveTab } from "./RecallHubHeader";

export interface PatientRecallsHubTabRouterProps {
	readonly activeTab: RecallHubActiveTab;
	readonly candidates: readonly PatientRecallRecord[];
	readonly filteredCandidates: readonly PatientRecallRecord[];
	readonly activeScriptCandidateId: string | null;
	readonly uniqueDoctors: readonly { readonly id: string; readonly name: string }[];
	readonly selectedDoctorId: string | "all";
	readonly onDoctorChange: (id: string | "all") => void;
	readonly selectedPeriod: RecallPeriodFilter;
	readonly onPeriodChange: (p: RecallPeriodFilter) => void;
	readonly selectedWorkflowStatus: RecallContactStatus | "all";
	readonly onStatusChangeFilter: (status: RecallContactStatus | "all") => void;
	readonly statusCounts: { readonly all: number; readonly due_now: number; readonly invited: number; readonly scheduled: number; readonly completed: number };
	readonly selectedTaskCallType?: ClinicalTaskCallType | "all" | undefined;
	readonly onSelectTaskCallType?: ((type: ClinicalTaskCallType | "all") => void) | undefined;
	readonly activeTaskCallScriptType?: ClinicalTaskCallType | null | undefined;
	readonly onToggleTaskCallScriptType?: ((type: ClinicalTaskCallType | null) => void) | undefined;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsHubTabRouter: React.FC<PatientRecallsHubTabRouterProps> = ({
	activeTab, candidates, filteredCandidates, activeScriptCandidateId,
	uniqueDoctors, selectedDoctorId, onDoctorChange, selectedPeriod, onPeriodChange,
	selectedWorkflowStatus, onStatusChangeFilter, statusCounts,
	selectedTaskCallType = "all", onSelectTaskCallType = () => {},
	activeTaskCallScriptType = null, onToggleTaskCallScriptType = () => {},
	searchQuery, onSearchChange,
	onBook, onToggleScript, onTogglePreview, onWhatsApp, onTelegram, onCopySms, onStatusUpdate,
}) => {
	if (activeTab === "registry") {
		return (
			<PatientRecallsRegistryView
				filteredCandidates={filteredCandidates}
				activeScriptCandidateId={activeScriptCandidateId}
				uniqueDoctors={uniqueDoctors}
				selectedDoctorId={selectedDoctorId}
				onDoctorChange={onDoctorChange}
				selectedPeriod={selectedPeriod}
				onPeriodChange={onPeriodChange}
				selectedStatus={selectedWorkflowStatus}
				onStatusChangeFilter={onStatusChangeFilter}
				statusCounts={statusCounts}
				searchQuery={searchQuery}
				onSearchChange={onSearchChange}
				onBook={onBook}
				onToggleScript={onToggleScript}
				onTogglePreview={onTogglePreview}
				onWhatsApp={onWhatsApp}
				onTelegram={onTelegram}
				onCopySms={onCopySms}
				onStatusUpdate={onStatusUpdate}
			/>
		);
	}

	if (activeTab === "funnel") {
		return (
			<RecallDispensaryFunnel
				candidates={filteredCandidates}
				activeScriptCandidateId={activeScriptCandidateId}
				onBook={onBook}
				onToggleScript={onToggleScript}
				onWhatsApp={onWhatsApp}
				onTelegram={onTelegram}
				onCopySms={onCopySms}
				onStatusUpdate={onStatusUpdate}
			/>
		);
	}

	if (activeTab === "task_calls") {
		const taskCallCandidates = candidates.map((c) => ({
			candidate: c,
			taskType: c.taskCallType ?? determineTaskCallTypeForCandidate(c),
		}));
		return (
			<PatientRecallsTaskCallsTab
				taskCallCandidates={taskCallCandidates}
				searchQuery={searchQuery}
				onSearchQueryChange={onSearchChange}
				selectedTaskCallType={selectedTaskCallType}
				onSelectTaskCallType={onSelectTaskCallType}
				activeTaskCallScriptType={activeTaskCallScriptType}
				onToggleTaskCallScriptType={onToggleTaskCallScriptType}
				onWhatsApp={onWhatsApp}
				onTelegram={onTelegram}
				onBook={onBook}
				onStatusUpdate={onStatusUpdate}
			/>
		);
	}

	return null;
};
