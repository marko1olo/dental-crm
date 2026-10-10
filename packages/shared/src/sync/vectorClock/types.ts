import type { FieldConflictDetail, VectorClock } from "../types.js";

export interface SyncEntityVector {
	entityKind: string;
	entityId: string;
	vectorClock: VectorClock;
	updatedAtMs: number;
	lastModifiedByNodeId: string;
	stateHash?: string | undefined;
}

export type VectorComparisonResult =
	| "identical"
	| "local_dominates"
	| "remote_dominates"
	| "divergent_split_brain";

export interface PerSurfaceState {
	surface: string; // e.g. "O", "M", "D", "V", "L", "B", "P", "C", "I"
	status: string; // e.g. "caries", "filling", "crown", "healthy", "extracted"
	updatedAtMs: number;
	doctorId?: string | undefined;
	doctorName?: string | undefined;
	material?: string | undefined;
	shade?: string | undefined;
	[key: string]: unknown;
}

export interface OdontogramToothCrdtState {
	toothNumber: number;
	statusCode: string;
	surfaces?: string[] | Record<string, PerSurfaceState> | undefined;
	surfaceStates?: Record<string, PerSurfaceState> | undefined;
	mobility?: number | undefined;
	notes?: string | undefined;
	updatedAtMs?: number | undefined;
	updatedAt?: string | undefined;
	[key: string]: unknown;
}

export interface ClinicalDiaryEntry {
	id?: string | undefined;
	entryId?: string | undefined;
	timestampMs: number;
	timestampIso: string;
	doctorName: string;
	authorName?: string | undefined;
	doctorId?: string | undefined;
	note: string;
	text?: string | undefined;
	signature?: string | undefined;
	doctorSignature?: string | undefined;
	category?: string | undefined;
	[key: string]: unknown;
}

export interface SplitBrainReconciliationInput {
	entityKind: string;
	entityId: string;
	localState: Record<string, unknown> | null | undefined;
	remoteState: Record<string, unknown> | null | undefined;
	localVector?: VectorClock | undefined;
	remoteVector?: VectorClock | undefined;
	localUpdatedAtMs?: number | undefined;
	remoteUpdatedAtMs?: number | undefined;
	localNodeId?: string | undefined;
	remoteNodeId?: string | undefined;
	reconcilingNodeId?: string | undefined;
	localDoctorName?: string | undefined;
	remoteDoctorName?: string | undefined;
	localDoctorSignature?: string | undefined;
	remoteDoctorSignature?: string | undefined;
}

export interface SplitBrainReconciliationResult<T = Record<string, unknown>> {
	entityKind: string;
	entityId: string;
	mergedState: T;
	mergedVectorClock: VectorClock;
	changedFields: string[];
	conflictDetails: FieldConflictDetail[];
	hasDivergence: boolean;
	resolutionStrategy:
		| "identical_noop"
		| "local_win"
		| "remote_win"
		| "split_brain_crdt_merged";
	somaticAlertsPreserved: boolean;
	surfacesMergedCount: number;
	diaryNotesAppendedCount: number;
}
