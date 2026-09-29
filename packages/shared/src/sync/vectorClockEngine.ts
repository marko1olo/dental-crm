/**
 * DENTE CRM — Vector Clock Engine & Split-Brain Re-convergence
 *
 * Implements:
 * 1. Monotonic Entity-Level Vector Clock Tracking (`sync_entity_vectors`)
 * 2. Causal Dependency & Split-Brain Divergence Detection
 * 3. Deterministic Domain-Specific CRDT Reconciliation:
 *    - Somatic allergies / medical alerts -> Union merge (never drop a life-critical allergy!).
 *    - Odontogram -> Per-surface Last-Write-Wins (LWW) with millisecond vector timestamps.
 *    - Clinical diary notes -> Chronological append with doctor signature.
 * 4. General Field-Level LWW with clock skew calibration and deterministic tie-breaking.
 */

import {
	ANESTHESIA_RISK_RANK,
	SOMATIC_SAFETY_FIELDS,
	isSomaticSafetyFieldOrRisk,
	mergeSomaticSafetyField,
} from "./crdt.js";
import { computePayloadHash } from "./hashing.js";
import {
	compareVectorClocks,
	incrementVectorClock,
	mergeVectorClocks,
} from "./mesh.js";
import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEntityKind,
	VectorClock,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Data Contracts & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 2. Vector Clock Comparison & Causality Detection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compares two vector clocks to classify their relationship:
 * - "identical": exactly equal counters for all nodes
 * - "local_dominates": local >= remote for all keys and local > remote for at least one
 * - "remote_dominates": remote >= local for all keys and remote > local for at least one
 * - "divergent_split_brain": local has elements strictly greater AND remote has elements strictly greater
 */
export function compareEntityVectors(
	local: VectorClock = {},
	remote: VectorClock = {},
): VectorComparisonResult {
	const rel = compareVectorClocks(local, remote);
	if (rel === "identical") return "identical";
	if (rel === "after") return "local_dominates";
	if (rel === "before") return "remote_dominates";
	return "divergent_split_brain";
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Somatic Safety & Medical Alerts CRDT Invariant (Never Drop Life-Critical Data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merges somatic safety lists (allergies, contraindications, chronic diseases)
 * preserving EVERY life-critical allergy from both local and remote nodes.
 * Deduplication is case-insensitive, order-stable, and trims whitespace.
 */
export function unionMergeSomaticAllergies(
	localAllergies: unknown,
	remoteAllergies: unknown,
): { merged: string[] | string; isArray: boolean; addedCount: number } {
	const extractItems = (val: unknown): string[] => {
		if (Array.isArray(val)) {
			return val
				.map((x) => (typeof x === "string" ? x.trim() : String(x).trim()))
				.filter(Boolean);
		}
		if (typeof val === "string") {
			return val
				.split(/[;,]/)
				.map((x) => x.trim())
				.filter(Boolean);
		}
		return [];
	};

	const localItems = extractItems(localAllergies);
	const remoteItems = extractItems(remoteAllergies);

	const union: string[] = [];
	const seen = new Set<string>();

	for (const item of [...localItems, ...remoteItems]) {
		const lower = item.toLowerCase();
		if (!seen.has(lower)) {
			seen.add(lower);
			union.push(item);
		}
	}

	const isArray = Array.isArray(localAllergies) || Array.isArray(remoteAllergies);
	const addedCount = union.length - localItems.length;

	return {
		merged: isArray ? union : union.join("; "),
		isArray,
		addedCount: Math.max(0, addedCount),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Odontogram Per-Surface Last-Write-Wins (LWW) with Millisecond Timestamps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes surfaces into a map of PerSurfaceState with millisecond timestamps.
 */
function normalizeToothSurfaces(
	tooth: OdontogramToothCrdtState,
	fallbackMs: number,
	defaultDoctorId?: string,
): Map<string, PerSurfaceState> {
	const map = new Map<string, PerSurfaceState>();

	// 1. If surfaceStates map is directly provided
	if (tooth.surfaceStates && typeof tooth.surfaceStates === "object") {
		for (const [surf, state] of Object.entries(tooth.surfaceStates)) {
			if (!surf || !state) continue;
			const safeSurf = surf.toUpperCase().trim();
			const rec = state as Record<string, unknown>;
			map.set(safeSurf, {
				...rec,
				surface: safeSurf,
				status: (rec.status as string) || tooth.statusCode || "treated",
				updatedAtMs: (rec.updatedAtMs as number) ?? tooth.updatedAtMs ?? fallbackMs,
				doctorId: (rec.doctorId as string) ?? defaultDoctorId,
				doctorName: rec.doctorName as string | undefined,
			});
		}
		return map;
	}

	// 2. If surfaces is a record of PerSurfaceState
	if (tooth.surfaces && typeof tooth.surfaces === "object" && !Array.isArray(tooth.surfaces)) {
		for (const [surf, state] of Object.entries(tooth.surfaces as Record<string, unknown>)) {
			if (!surf || !state) continue;
			const safeSurf = surf.toUpperCase().trim();
			const rec = (typeof state === "object" && state !== null ? state : { status: String(state) }) as Record<string, unknown>;
			map.set(safeSurf, {
				...rec,
				surface: safeSurf,
				status: (rec.status as string) || tooth.statusCode || "treated",
				updatedAtMs: (rec.updatedAtMs as number) ?? tooth.updatedAtMs ?? fallbackMs,
				doctorId: (rec.doctorId as string) ?? defaultDoctorId,
				doctorName: rec.doctorName as string | undefined,
			});
		}
		return map;
	}

	// 3. If surfaces is string array (e.g. ["O", "M", "D"])
	if (Array.isArray(tooth.surfaces)) {
		for (const item of tooth.surfaces) {
			if (typeof item === "string" && item.trim()) {
				const safeSurf = item.toUpperCase().trim();
				map.set(safeSurf, {
					surface: safeSurf,
					status: tooth.statusCode || "treated",
					updatedAtMs: tooth.updatedAtMs ?? fallbackMs,
					doctorId: defaultDoctorId,
				});
			}
		}
	}

	return map;
}

function toothHasRecordSurfaces(tooth: OdontogramToothCrdtState): boolean {
	return Boolean(
		(tooth.surfaces && typeof tooth.surfaces === "object" && !Array.isArray(tooth.surfaces)) ||
		tooth.surfaceStates,
	);
}

/**
 * Reconciles two odontogram tooth states per-surface using millisecond LWW.
 * If Dr. A treated surface "M" on Satellite at t=1000 and Dr. B treated surface "D" on Master at t=1050:
 * BOTH surfaces "M" and "D" are preserved!
 * If both touched surface "O", the higher millisecond timestamp strictly wins for surface "O".
 */
export function mergeOdontogramToothPerSurface(
	localTooth: OdontogramToothCrdtState,
	remoteTooth: OdontogramToothCrdtState,
	localDefaultMs = 0,
	remoteDefaultMs = 0,
): {
	mergedTooth: OdontogramToothCrdtState;
	surfacesMergedCount: number;
	surfaces: Record<string, PerSurfaceState>;
} {
	const localSurfaceMap = normalizeToothSurfaces(localTooth, localDefaultMs);
	const remoteSurfaceMap = normalizeToothSurfaces(remoteTooth, remoteDefaultMs);

	const allSurfaces = new Set([...localSurfaceMap.keys(), ...remoteSurfaceMap.keys()]);
	const mergedSurfaceMap = new Map<string, PerSurfaceState>();

	for (const surf of allSurfaces) {
		const localState = localSurfaceMap.get(surf);
		const remoteState = remoteSurfaceMap.get(surf);

		if (localState && !remoteState) {
			mergedSurfaceMap.set(surf, { ...localState });
		} else if (!localState && remoteState) {
			mergedSurfaceMap.set(surf, { ...remoteState });
		} else if (localState && remoteState) {
			// Per-surface LWW millisecond resolution
			if (remoteState.updatedAtMs > localState.updatedAtMs) {
				mergedSurfaceMap.set(surf, { ...remoteState });
			} else if (localState.updatedAtMs > remoteState.updatedAtMs) {
				mergedSurfaceMap.set(surf, { ...localState });
			} else {
				// Deterministic tie break on millisecond tie
				const remoteWins = (remoteState.status || "").localeCompare(localState.status || "") >= 0;
				mergedSurfaceMap.set(surf, remoteWins ? { ...remoteState } : { ...localState });
			}
		}
	}

	const localTime = localTooth.updatedAtMs ?? localDefaultMs;
	const remoteTime = remoteTooth.updatedAtMs ?? remoteDefaultMs;
	const latestTooth = remoteTime >= localTime ? remoteTooth : localTooth;
	const olderTooth = remoteTime >= localTime ? localTooth : remoteTooth;

	const surfaceStatesRecord: Record<string, PerSurfaceState> = {};
	const surfaceNames: string[] = [];

	for (const [surf, state] of mergedSurfaceMap.entries()) {
		surfaceStatesRecord[surf] = state;
		surfaceNames.push(surf);
	}
	surfaceNames.sort();

	const isRecordSurfaces = toothHasRecordSurfaces(localTooth) || toothHasRecordSurfaces(remoteTooth);

	const mergedTooth: OdontogramToothCrdtState = {
		...olderTooth,
		...latestTooth,
		toothNumber: localTooth.toothNumber ?? remoteTooth.toothNumber,
		statusCode: latestTooth.statusCode || olderTooth.statusCode || "healthy",
		surfaces: isRecordSurfaces ? surfaceStatesRecord : surfaceNames,
		surfaceStates: surfaceStatesRecord,
		mobility: latestTooth.mobility ?? olderTooth.mobility,
		notes: latestTooth.notes || olderTooth.notes,
		updatedAtMs: Math.max(localTime, remoteTime),
		updatedAt: new Date(Math.max(localTime, remoteTime)).toISOString(),
	};

	return {
		mergedTooth,
		surfacesMergedCount: surfaceNames.length,
		surfaces: surfaceStatesRecord,
	};
}

/**
 * Merges full lists of teeth across two workstations with per-surface LWW.
 */
export function mergeOdontogramListPerSurface(
	localTeeth: OdontogramToothCrdtState[] = [],
	remoteTeeth: OdontogramToothCrdtState[] = [],
	localDefaultMs = Date.now(),
	remoteDefaultMs = Date.now(),
): { mergedTeeth: OdontogramToothCrdtState[]; totalSurfacesMerged: number } {
	const toothMap = new Map<number, OdontogramToothCrdtState>();
	let totalSurfacesMerged = 0;

	for (const tooth of localTeeth) {
		if (typeof tooth?.toothNumber === "number") {
			toothMap.set(tooth.toothNumber, { ...tooth });
		}
	}

	for (const remoteTooth of remoteTeeth) {
		if (typeof remoteTooth?.toothNumber !== "number") continue;
		const localTooth = toothMap.get(remoteTooth.toothNumber);
		if (!localTooth) {
			toothMap.set(remoteTooth.toothNumber, { ...remoteTooth });
			totalSurfacesMerged += Array.isArray(remoteTooth.surfaces) ? remoteTooth.surfaces.length : 0;
		} else {
			const { mergedTooth, surfacesMergedCount } = mergeOdontogramToothPerSurface(
				localTooth,
				remoteTooth,
				localDefaultMs,
				remoteDefaultMs,
			);
			toothMap.set(remoteTooth.toothNumber, mergedTooth);
			totalSurfacesMerged += surfacesMergedCount;
		}
	}

	const sorted = Array.from(toothMap.values()).sort((a, b) => a.toothNumber - b.toothNumber);
	return {
		mergedTeeth: sorted,
		totalSurfacesMerged,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Clinical Diary Notes: Chronological Append with Doctor Signature
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes diary input into structured entries.
 */
function extractDiaryEntries(
	diaryVal: unknown,
	defaultDoctorName: string,
	defaultDoctorId?: string | undefined,
	defaultSignature?: string | undefined,
	defaultTimestampMs = Date.now(),
): ClinicalDiaryEntry[] {
	if (!diaryVal) return [];

	const results: ClinicalDiaryEntry[] = [];

	if (Array.isArray(diaryVal)) {
		for (const item of diaryVal) {
			if (typeof item === "object" && item !== null) {
				const rec = item as Record<string, unknown>;
				const tsMs =
					typeof rec.timestampMs === "number"
						? rec.timestampMs
						: typeof rec.timestamp === "number"
							? rec.timestamp
							: typeof rec.timestampIso === "string"
								? new Date(rec.timestampIso).getTime() || defaultTimestampMs
								: defaultTimestampMs;
				const note =
					(rec.note as string) ||
					(rec.text as string) ||
					(rec.content as string) ||
					"";
				if (note.trim()) {
					const entryId = (rec.id as string) || (rec.entryId as string) || undefined;
					const docName = (rec.doctorName as string) || (rec.authorName as string) || defaultDoctorName;
					const sig = (rec.doctorSignature as string) || (rec.signature as string) || defaultSignature;
					const entry: ClinicalDiaryEntry = {
						id: entryId,
						entryId,
						timestampMs: tsMs,
						timestampIso:
							(rec.timestampIso as string) || new Date(tsMs).toISOString(),
						doctorName: docName,
						authorName: docName,
						doctorId: (rec.doctorId as string) || defaultDoctorId,
						note: note.trim(),
						text: note.trim(),
						signature: sig,
						doctorSignature: sig,
						category: (rec.category as string) || undefined,
					};
					results.push(entry);
				}
			} else if (typeof item === "string" && item.trim()) {
				const entry: ClinicalDiaryEntry = {
					timestampMs: defaultTimestampMs,
					timestampIso: new Date(defaultTimestampMs).toISOString(),
					doctorName: defaultDoctorName,
					authorName: defaultDoctorName,
					doctorId: defaultDoctorId,
					note: item.trim(),
					text: item.trim(),
					signature: defaultSignature,
					doctorSignature: defaultSignature,
				};
				results.push(entry);
			}
		}
		return results;
	}

	if (typeof diaryVal === "string" && diaryVal.trim()) {
		return [
			{
				timestampMs: defaultTimestampMs,
				timestampIso: new Date(defaultTimestampMs).toISOString(),
				doctorName: defaultDoctorName,
				doctorId: defaultDoctorId,
				note: diaryVal.trim(),
				signature: defaultSignature,
			},
		];
	}

	return [];
}


/**
 * Merges clinical diary notes by chronological append with doctor signature.
 * Prevents dropping any medical notes or doctor observations during split-brain re-convergence.
 */
export function mergeClinicalDiaryChronological(
	localVal: unknown,
	remoteVal: unknown,
	localContext: {
		doctorName?: string | undefined;
		doctorId?: string | undefined;
		signature?: string | undefined;
		timestampMs?: number | undefined;
	} = {},
	remoteContext: {
		doctorName?: string | undefined;
		doctorId?: string | undefined;
		signature?: string | undefined;
		timestampMs?: number | undefined;
	} = {},
): {
	mergedEntries: ClinicalDiaryEntry[];
	mergedString: string;
	appendedCount: number;
} {
	const localEntries = extractDiaryEntries(
		localVal,
		localContext.doctorName || "Врач-стоматолог (Локально)",
		localContext.doctorId,
		localContext.signature,
		localContext.timestampMs || Date.now(),
	);

	const remoteEntries = extractDiaryEntries(
		remoteVal,
		remoteContext.doctorName || "Врач-стоматолог (Удаленно)",
		remoteContext.doctorId,
		remoteContext.signature,
		remoteContext.timestampMs || Date.now(),
	);

	// Deduplicate entries by note content and doctor signature
	const combined: ClinicalDiaryEntry[] = [];
	const seen = new Set<string>();

	for (const entry of [...localEntries, ...remoteEntries]) {
		const key = `${entry.timestampIso}|${entry.doctorName}|${entry.signature || ""}|${entry.note.trim()}`;
		if (!seen.has(key)) {
			seen.add(key);
			combined.push(entry);
		}
	}

	// Chronological sort: oldest first to form a clean longitudinal medical timeline
	combined.sort((a, b) => a.timestampMs - b.timestampMs);

	const formattedStrings = combined.map((entry) => {
		const sigBadge = entry.signature ? ` [ЭЦП: ${entry.signature}]` : "";
		const doc = entry.doctorName ? `Врач: ${entry.doctorName}` : "Врач";
		return `[${entry.timestampIso}] ${doc}${sigBadge}:\n${entry.note}`;
	});

	const appendedCount = combined.length - localEntries.length;

	return {
		mergedEntries: combined,
		mergedString: formattedStrings.join("\n\n---\n\n"),
		appendedCount: Math.max(0, appendedCount),
	};
}

export const EXTENDED_ANESTHESIA_RISK_RANK: Record<string, number> = {
	normal: 1,
	норма: 1,
	low: 2,
	низкий: 2,
	"asa i": 1,
	"asa 1": 1,
	"asa ii": 2,
	"asa 2": 2,
	moderate: 3,
	умеренный: 3,
	средний: 3,
	"asa iii": 3,
	"asa 3": 3,
	high: 4,
	высокий: 4,
	"asa iv": 4,
	"asa 4": 4,
	critical: 5,
	критический: 5,
	"asa v": 5,
	"asa 5": 5,
	"asa vi": 6,
	"asa 6": 6,
};

export function getAnesthesiaRiskRank(val: unknown): number {
	if (typeof val !== "string") return 0;
	const normalized = val.toLowerCase().trim();
	if (normalized in EXTENDED_ANESTHESIA_RISK_RANK) {
		return EXTENDED_ANESTHESIA_RISK_RANK[normalized]!;
	}
	const match = normalized.match(/asa\s*([0-9ivx]+)/i);
	if (match && match[1]) {
		const token = match[1].toLowerCase();
		if (token === "1" || token === "i") return 1;
		if (token === "2" || token === "ii") return 2;
		if (token === "3" || token === "iii") return 3;
		if (token === "4" || token === "iv") return 4;
		if (token === "5" || token === "v") return 5;
		if (token === "6" || token === "vi") return 6;
	}
	return ANESTHESIA_RISK_RANK[normalized] ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Master Split-Brain Reconciliation Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reconciles divergent entity states between two nodes (e.g. Master reconnecting
 * after satellite offline work or temporary master election).
 *
 * Guaranteed CRDT Laws:
 * 1. Somatic allergies & medical alerts: Union merge (never drop a life-critical allergy!).
 * 2. Odontogram: Per-surface Last-Write-Wins (LWW) with millisecond vector timestamps.
 * 3. Clinical diary notes: Chronological append with doctor signature.
 * 4. General scalar fields: LWW with millisecond timestamp + deterministic tie-break.
 */
export function reconcileSplitBrainEntity<T extends Record<string, unknown> = Record<string, unknown>>(
	input: SplitBrainReconciliationInput,
): SplitBrainReconciliationResult<T> {
	const {
		entityKind,
		entityId,
		localState,
		remoteState,
		localVector = {},
		remoteVector = {},
		localUpdatedAtMs = 0,
		remoteUpdatedAtMs = 0,
		localNodeId = "local-node",
		remoteNodeId = "remote-node",
		reconcilingNodeId = localNodeId,
		localDoctorName,
		remoteDoctorName,
		localDoctorSignature,
		remoteDoctorSignature,
	} = input;

	// Case 1: Entity exists only on one side
	if (!localState && !remoteState) {
		return {
			entityKind,
			entityId,
			mergedState: {} as T,
			mergedVectorClock: incrementVectorClock(remoteVector, reconcilingNodeId),
			changedFields: [],
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "identical_noop",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	if (!localState && remoteState) {
		const newClock = incrementVectorClock(remoteVector, reconcilingNodeId);
		return {
			entityKind,
			entityId,
			mergedState: { ...remoteState } as T,
			mergedVectorClock: newClock,
			changedFields: Object.keys(remoteState),
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "remote_win",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	if (localState && !remoteState) {
		const newClock = incrementVectorClock(localVector, reconcilingNodeId);
		return {
			entityKind,
			entityId,
			mergedState: { ...localState } as T,
			mergedVectorClock: newClock,
			changedFields: [],
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "local_win",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	// Both states exist — verify vector causality
	const causality = compareEntityVectors(localVector, remoteVector);
	const mergedClock = incrementVectorClock(
		mergeVectorClocks(localVector, remoteVector),
		reconcilingNodeId,
	);

	const safeLocal = localState as Record<string, unknown>;
	const safeRemote = remoteState as Record<string, unknown>;

	// If identical payloads, no reconciliation needed
	if (JSON.stringify(safeLocal) === JSON.stringify(safeRemote)) {
		return {
			entityKind,
			entityId,
			mergedState: { ...safeLocal } as T,
			mergedVectorClock: mergedClock,
			changedFields: [],
			conflictDetails: [],
			hasDivergence: false,
			resolutionStrategy: "identical_noop",
			somaticAlertsPreserved: true,
			surfacesMergedCount: 0,
			diaryNotesAppendedCount: 0,
		};
	}

	const merged: Record<string, unknown> = { ...safeLocal };
	const changedFields: string[] = [];
	const conflicts: FieldConflictDetail[] = [];
	let surfacesMergedTotal = 0;
	let diaryAppendedTotal = 0;
	let somaticPreserved = true;

	const allKeys = new Set([...Object.keys(safeLocal), ...Object.keys(safeRemote)]);

	for (const field of allKeys) {
		// Protected immutable fields
		if (field === "id" || field === "organizationId" || field === "organization_id") {
			continue;
		}

		const localVal = safeLocal[field];
		const remoteVal = safeRemote[field];

		// If field is missing on one side
		if (localVal === undefined && remoteVal !== undefined) {
			merged[field] = remoteVal;
			changedFields.push(field);
			continue;
		}
		if (remoteVal === undefined && localVal !== undefined) {
			merged[field] = localVal;
			continue;
		}

		// Values identical -> no-op
		if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
			continue;
		}

		// ─────────────────────────────────────────────────────────────────────────
		// 1. Somatic Allergies & Medical Alerts Invariant
		// ─────────────────────────────────────────────────────────────────────────
		if (isSomaticSafetyFieldOrRisk(field)) {
			if (field === "anesthesiaRisk" || field === "anesthesia_risk") {
				const localRank = getAnesthesiaRiskRank(localVal);
				const remoteRank = getAnesthesiaRiskRank(remoteVal);
				const higherVal = remoteRank > localRank ? remoteVal : localVal;
				merged[field] = higherVal;
				changedFields.push(field);
				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: higherVal,
					strategy: "somatic_safety_union",
					winner: remoteRank > localRank ? "client" : "server",
					reason: `Anesthesia risk level elevated to highest clinical priority (${String(higherVal)})`,
				});
			} else {
				const { merged: mergedAllergies, isArray } = unionMergeSomaticAllergies(localVal, remoteVal);
				merged[field] = mergedAllergies;
				changedFields.push(field);
				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: mergedAllergies,
					strategy: "somatic_safety_union",
					winner: "merged",
					reason: "Union-merged somatic allergies and alerts: zero life-critical data loss guaranteed",
				});
			}
			somaticPreserved = true;
			continue;
		}

		// ─────────────────────────────────────────────────────────────────────────
		// 2. Odontogram Per-Surface CRDT Invariant
		// ─────────────────────────────────────────────────────────────────────────
		if (
			field === "odontogram" ||
			field === "odontogramTeeth" ||
			field === "teeth" ||
			field === "surfaces" ||
			field === "surfaceStates" ||
			(typeof localVal === "object" &&
				localVal !== null &&
				typeof remoteVal === "object" &&
				remoteVal !== null &&
				("surfaces" in localVal || "surfaces" in remoteVal || "surfaceStates" in localVal || "surfaceStates" in remoteVal))
		) {
			if (field === "surfaces" || field === "surfaceStates") {
				const toothMerged = mergeOdontogramToothPerSurface(
					{ surfaces: localVal as any, toothNumber: (safeLocal.toothNumber as number) ?? 0, statusCode: (safeLocal.condition as string) ?? "treated" },
					{ surfaces: remoteVal as any, toothNumber: (safeRemote.toothNumber as number) ?? 0, statusCode: (safeRemote.condition as string) ?? "treated" },
					localUpdatedAtMs,
					remoteUpdatedAtMs,
				);
				merged[field] = toothMerged.surfaces;
				changedFields.push(field);
				surfacesMergedTotal += toothMerged.surfacesMergedCount;
				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: toothMerged.surfaces,
					strategy: "crdt",
					winner: "merged",
					reason: `Per-surface Last-Write-Wins CRDT reconciliation merged ${toothMerged.surfacesMergedCount} surfaces without dropping independent treatments`,
				});
				continue;
			}

			if (Array.isArray(localVal) || Array.isArray(remoteVal)) {
				const localTeeth = (Array.isArray(localVal) ? localVal : []) as OdontogramToothCrdtState[];
				const remoteTeeth = (Array.isArray(remoteVal) ? remoteVal : []) as OdontogramToothCrdtState[];

				const { mergedTeeth, totalSurfacesMerged } = mergeOdontogramListPerSurface(
					localTeeth,
					remoteTeeth,
					localUpdatedAtMs,
					remoteUpdatedAtMs,
				);

				merged[field] = mergedTeeth;
				changedFields.push(field);
				surfacesMergedTotal += totalSurfacesMerged;

				conflicts.push({
					field,
					clientValue: remoteVal,
					serverValue: localVal,
					resolvedValue: mergedTeeth,
					strategy: "crdt",
					winner: "merged",
					reason: `Per-surface Last-Write-Wins CRDT reconciliation merged ${totalSurfacesMerged} surfaces without dropping independent treatments`,
				});
				continue;
			}

			// Nested tooth object (e.g. tooth26: { surfaces: ... })
			const toothMerged = mergeOdontogramToothPerSurface(
				localVal as any,
				remoteVal as any,
				localUpdatedAtMs,
				remoteUpdatedAtMs,
			);
			merged[field] = toothMerged.mergedTooth;
			changedFields.push(field);
			surfacesMergedTotal += toothMerged.surfacesMergedCount;
			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: toothMerged.mergedTooth,
				strategy: "crdt",
				winner: "merged",
				reason: `Per-surface Last-Write-Wins CRDT reconciliation for tooth ${field} merged ${toothMerged.surfacesMergedCount} surfaces`,
			});
			continue;
		}

		// ─────────────────────────────────────────────────────────────────────────
		// 3. Clinical Diary Notes: Chronological Append with Doctor Signature
		// ─────────────────────────────────────────────────────────────────────────
		if (
			field === "diaryNotes" ||
			field === "diary_notes" ||
			field === "diaryEntries" ||
			field === "clinicalNotes" ||
			field === "doctorNotes" ||
			(entityKind === "visit_diary" && (field === "notes" || field === "diary" || field === "objective"))
		) {
			const { mergedEntries, mergedString, appendedCount } = mergeClinicalDiaryChronological(
				localVal,
				remoteVal,
				{
					doctorName: localDoctorName,
					signature: localDoctorSignature,
					timestampMs: localUpdatedAtMs,
				},
				{
					doctorName: remoteDoctorName,
					signature: remoteDoctorSignature,
					timestampMs: remoteUpdatedAtMs,
				},
			);

			// If original was string, provide string; otherwise structured entries
			merged[field] = typeof localVal === "string" || typeof remoteVal === "string" ? mergedString : mergedEntries;
			changedFields.push(field);
			diaryAppendedTotal += appendedCount;

			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: merged[field],
				strategy: "field_merge",
				winner: "merged",
				reason: `Chronological append with doctor signatures preserved ${mergedEntries.length} clinical diary notes`,
			});
			continue;
		}

		// ─────────────────────────────────────────────────────────────────────────
		// 4. General Scalar Fields: LWW with millisecond timestamps
		// ─────────────────────────────────────────────────────────────────────────
		if (remoteUpdatedAtMs > localUpdatedAtMs) {
			merged[field] = remoteVal;
			changedFields.push(field);
			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: remoteVal,
				strategy: "lww",
				winner: "client",
				reason: `Remote edit timestamp (${remoteUpdatedAtMs}ms) is strictly newer than local (${localUpdatedAtMs}ms)`,
			});
		} else if (localUpdatedAtMs > remoteUpdatedAtMs) {
			merged[field] = localVal;
			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: localVal,
				strategy: "lww",
				winner: "server",
				reason: `Local edit timestamp (${localUpdatedAtMs}ms) is strictly newer than remote (${remoteUpdatedAtMs}ms)`,
			});
		} else {
			// Millisecond timestamp tie: deterministic string serialization tie-break
			const remoteStr = JSON.stringify(remoteVal);
			const localStr = JSON.stringify(localVal);
			const remoteWins = remoteStr.localeCompare(localStr) >= 0;

			merged[field] = remoteWins ? remoteVal : localVal;
			if (remoteWins) changedFields.push(field);

			conflicts.push({
				field,
				clientValue: remoteVal,
				serverValue: localVal,
				resolvedValue: merged[field],
				strategy: "crdt",
				winner: remoteWins ? "client" : "server",
				reason: "Deterministic tie-break on identical millisecond timestamps",
			});
		}
	}

	return {
		entityKind,
		entityId,
		mergedState: merged as T,
		mergedVectorClock: mergedClock,
		changedFields,
		conflictDetails: conflicts,
		hasDivergence: causality === "divergent_split_brain" || conflicts.length > 0,
		resolutionStrategy: "split_brain_crdt_merged",
		somaticAlertsPreserved: somaticPreserved,
		surfacesMergedCount: surfacesMergedTotal,
		diaryNotesAppendedCount: diaryAppendedTotal,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Vector Clock Engine Table Manager
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory / persistent table manager for tracking `sync_entity_vectors` across
 * the clinic network and managing split-brain re-convergence.
 */
export class VectorClockEngine {
	private readonly nodeId: string;
	private readonly vectors = new Map<string, SyncEntityVector>();

	constructor(nodeId?: string) {
		this.nodeId = (nodeId && typeof nodeId === "string" ? nodeId.trim() : "") || "default-node";
	}

	getNodeId(): string {
		return this.nodeId;
	}

	private makeKey(entityKind: string, entityId: string): string {
		return `${entityKind}:${entityId}`;
	}

	/**
	 * Records a local or remote mutation, advancing the vector clock for the given nodeId.
	 */
	recordMutation(
		entityKind: string,
		entityId: string,
		actingNodeId = this.nodeId,
		timestampMs = Date.now(),
		stateHash?: string,
	): SyncEntityVector {
		const key = this.makeKey(entityKind, entityId);
		const existing = this.vectors.get(key);

		const baseClock = existing?.vectorClock ? { ...existing.vectorClock } : {};
		const updatedClock = incrementVectorClock(baseClock, actingNodeId);

		const updatedVector: SyncEntityVector = {
			entityKind,
			entityId,
			vectorClock: updatedClock,
			updatedAtMs: Math.max(timestampMs, (existing?.updatedAtMs ?? 0) + 1),
			lastModifiedByNodeId: actingNodeId,
			stateHash: stateHash ?? existing?.stateHash,
		};

		this.vectors.set(key, updatedVector);
		return updatedVector;
	}

	/**
	 * Increments the vector clock for an entity mutation.
	 */
	incrementVector(
		entityKind: string,
		entityId: string,
		actingNodeId = this.nodeId,
	): SyncEntityVector {
		return this.recordMutation(entityKind, entityId, actingNodeId);
	}

	/**
	 * Fetches vector clock for a specific entity.
	 */
	getEntityVector(entityKind: string, entityId: string): SyncEntityVector | undefined {
		return this.vectors.get(this.makeKey(entityKind, entityId));
	}

	/**
	 * Direct setter for synchronizing entity vectors.
	 */
	setEntityVector(vector: SyncEntityVector): void {
		this.vectors.set(this.makeKey(vector.entityKind, vector.entityId), { ...vector });
	}

	/**
	 * Returns all tracked entity vectors.
	 */
	getAllVectors(): SyncEntityVector[] {
		return Array.from(this.vectors.values());
	}

	/**
	 * Exports all entity vectors for LAN exchange.
	 */
	exportSyncEntityVectors(): SyncEntityVector[] {
		return this.getAllVectors();
	}

	/**
	 * Ingests remote entity vectors and returns keys that are divergent (split-brain).
	 */
	detectDivergentEntities(remoteVectors: SyncEntityVector[]): {
		divergent: Array<{ local: SyncEntityVector; remote: SyncEntityVector }>;
		remoteNewer: SyncEntityVector[];
		localNewer: SyncEntityVector[];
		identical: SyncEntityVector[];
	} {
		const divergent: Array<{ local: SyncEntityVector; remote: SyncEntityVector }> = [];
		const remoteNewer: SyncEntityVector[] = [];
		const localNewer: SyncEntityVector[] = [];
		const identical: SyncEntityVector[] = [];

		for (const remote of remoteVectors) {
			const local = this.getEntityVector(remote.entityKind, remote.entityId);
			if (!local) {
				remoteNewer.push(remote);
				continue;
			}

			const relation = compareEntityVectors(local.vectorClock, remote.vectorClock);
			if (relation === "identical") {
				identical.push(local);
			} else if (relation === "remote_dominates") {
				remoteNewer.push(remote);
			} else if (relation === "local_dominates") {
				localNewer.push(local);
			} else {
				divergent.push({ local, remote });
			}
		}

		return { divergent, remoteNewer, localNewer, identical };
	}

	/**
	 * Full reconciliation between local entity state and remote entity state.
	 * Automatically records the resulting merged vector clock in the local engine table.
	 */
	reconcile(input: Omit<SplitBrainReconciliationInput, "reconcilingNodeId">): SplitBrainReconciliationResult {
		const result = reconcileSplitBrainEntity({
			...input,
			reconcilingNodeId: this.nodeId,
		});

		// Record reconciled vector clock in the engine table
		this.setEntityVector({
			entityKind: input.entityKind,
			entityId: input.entityId,
			vectorClock: result.mergedVectorClock,
			updatedAtMs: Math.max(input.localUpdatedAtMs ?? 0, input.remoteUpdatedAtMs ?? 0, Date.now()),
			lastModifiedByNodeId: this.nodeId,
			stateHash: computePayloadHash(result.mergedState),
		});

		return result;
	}

	size(): number {
		return this.vectors.size;
	}

	clear(): void {
		this.vectors.clear();
	}
}
