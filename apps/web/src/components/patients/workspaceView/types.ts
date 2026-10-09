import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";

export type WorkspaceTabKey = "timeline" | "plans" | "visits" | "scans";

export interface PatientWorkspaceViewProps {
	patientId: string;
	patientName?: string | null;
	dashboard?: Dashboard | null;
	initialTab?: WorkspaceTabKey;
	onOpenVisit?: (visitId: string) => void;
	onOpenPlan?: (planId: string) => void;
}

export interface ImagingStudyItem {
	id: string;
	patientId: string;
	title: string;
	kind: string;
	toothCode?: string | null;
	previewUrl?: string;
	viewerUrl?: string;
	capturedAt?: string;
	effectiveDoseMicrosv?: number;
	status?: string;
	modality?: string;
}

export interface DomSliceResult<T> {
	visibleItems: T[];
	totalCount: number;
	displayedCount: number;
	remainingCount: number;
	hasMore: boolean;
}

export const WORKSPACE_VIEW_TEST_ID = "patient-workspace-view";
