import type {
	PatientRecallRecord,
	RecallContactStatus,
	RecallPeriodFilter,
} from "./patientRecallEngine";

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
