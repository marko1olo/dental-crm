import type { Appointment, Dashboard, TreatmentPlanItem } from "@dental/shared";

export type WorkspaceTabKey = "timeline" | "plans" | "visits" | "scans";

export interface PatientWorkspaceViewProps {
	patientId: string;
	patientName?: string | null | undefined;
	dashboard?: Dashboard | null | undefined;
	initialTab?: WorkspaceTabKey | undefined;
	onOpenVisit?: ((visitId: string) => void) | undefined;
	onOpenPlan?: ((planId: string) => void) | undefined;
}

export interface ImagingStudyItem {
	id: string;
	patientId: string;
	title: string;
	kind: string;
	toothCode?: string | null | undefined;
	previewUrl?: string | undefined;
	viewerUrl?: string | undefined;
	capturedAt?: string | undefined;
	effectiveDoseMicrosv?: number | undefined;
	status?: string | undefined;
	modality?: string | undefined;
}

export interface DomSliceResult<T> {
	readonly visibleItems: readonly T[];
	readonly totalCount: number;
	readonly displayedCount: number;
	readonly remainingCount: number;
	readonly hasMore: boolean;
}

export const WORKSPACE_VIEW_TEST_ID = "patient-workspace-view";
