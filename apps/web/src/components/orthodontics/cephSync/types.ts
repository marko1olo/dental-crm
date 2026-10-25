import type {
	LandmarkMap,
	CephalometricAnalysisResult,
} from "../cephalometricMath";

export const CEPH_SYNC_CHANNEL_NAME = "dente_ceph_sync";
export const CEPH_STORAGE_SYNC_KEY = "dente_ceph_sync_event";

export type CephStudioSyncEventType =
	| "CEPH_STUDIO_OPENED"
	| "CEPH_STUDIO_CLOSED"
	| "CEPH_LANDMARKS_UPDATED"
	| "CEPH_ANALYSIS_COMPLETED"
	| "CEPH_INSERT_TO_PROTOCOL"
	| "CEPH_DEMO_MODE_TOGGLED";

export interface CephStudioSyncMessage<T = unknown> {
	readonly id: string;
	readonly type: CephStudioSyncEventType;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly timestamp: number;
	readonly payload: T;
}

export interface CephLandmarksUpdatedPayload {
	readonly landmarks: LandmarkMap;
	readonly scaleMmPerPixel: number;
	readonly placedCount: number;
}

export interface CephAnalysisCompletedPayload {
	readonly analysis: CephalometricAnalysisResult;
	readonly protocolText: string;
	readonly skeletalClassRu: string;
	readonly growthPatternRu: string;
}

export interface CephInsertToProtocolPayload {
	readonly protocolText: string;
	readonly diagnosisSummary: string;
	readonly skeletalClass: string;
	readonly growthPattern: string;
	readonly anbAngle?: number | null;
	readonly fmaAngle?: number | null;
	readonly u1SnAngle?: number | null;
	readonly impaAngle?: number | null;
}

export interface CephDemoModePayload {
	readonly isPatientDemoMode: boolean;
}

export interface CachedCephStudy {
	patientId?: string | undefined;
	patientName?: string | undefined;
	imageUrl?: string | undefined;
	landmarks?: LandmarkMap | undefined;
	scaleMmPerPixel?: number | undefined;
	analysis?: CephalometricAnalysisResult | undefined;
	filterMode?: string | undefined;
	brightness?: number | undefined;
	contrast?: number | undefined;
	activeTab?: string | undefined;
	timestamp?: number | undefined;
}
