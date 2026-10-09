
import {
	SOMATIC_SAFETY_FIELDS,
	isSomaticSafetyFieldOrRisk,
	mergeSomaticSafetyField,
} from "../crdt.js";
import { computePayloadHash, createCompositeIdempotencyKey, generateUuidV7 } from "../hashing.js";
import {
	type ConflictResolutionStrategy,
	type FieldConflictDetail,
	type LanAssistantCitoEvent,
	type LanChairStatus,
	type LanChairStatusEvent,
	type LanCitoCallReason,
	type LanCitoUrgency,
	type LanDiscoveryBeacon,
	type LanInvoiceTransferEvent,
	type LanInvoiceTransferItem,
	type LanMeshNode,
	type LanNodeRole,
	type LanP2PEventType,
	type LanP2PMessage,
	type MeshSyncExchangeRequest,
	type MeshSyncExchangeResponse,
	type MutationVector,
	type SyncMutationEnvelope,
	type SyncMutationResult,
	type SyncTierMode,
	type VectorClock,
	lanAssistantCitoEventSchema,
	lanChairStatusEventSchema,
	lanInvoiceTransferEventSchema,
	lanP2PMessageSchema,
} from "../types.js";
import { incrementVectorClock, mergeVectorClocks } from './vector-clock.js';

// ─────────────────────────────────────────────────────────────────────────────

export interface OdontogramToothState {
	toothNumber: number;
	statusCode: string;
	surfaces?: string[] | undefined;
	mobility?: number | undefined;
	notes?: string | undefined;
	updatedAt?: string | undefined;
}

export interface Form043DiaryConflictInput {
	existingDiary: Record<string, unknown> | null;
	incomingDiary: Record<string, unknown>;
	existingClock?: VectorClock | undefined;
	incomingClock?: VectorClock | undefined;
	existingUpdatedAt?: string | undefined;
	incomingUpdatedAt: string;
	nodeId: string;
}

export interface Form043DiaryConflictResult {
	resolvedDiary: Record<string, unknown>;
	updatedClock: VectorClock;
	hasConflict: boolean;
	strategy: "created" | "field_merge" | "lww";
	conflictDetails: FieldConflictDetail[];
}

/**
 * Merges two odontogram tooth lists non-destructively per tooth and per surface.
 */
export function mergeOdontogramTeethCrdt(
	existingTeeth: OdontogramToothState[] = [],
	incomingTeeth: OdontogramToothState[] = [],
): OdontogramToothState[] {
	const toothMap = new Map<number, OdontogramToothState>();

	const safeExisting = Array.isArray(existingTeeth) ? existingTeeth : [];
	const safeIncoming = Array.isArray(incomingTeeth) ? incomingTeeth : [];

	for (const tooth of safeExisting) {
		if (!tooth || typeof tooth.toothNumber !== "number" || !Number.isFinite(tooth.toothNumber)) continue;
		toothMap.set(tooth.toothNumber, { ...tooth });
	}

	for (const incTooth of safeIncoming) {
		if (!incTooth || typeof incTooth.toothNumber !== "number" || !Number.isFinite(incTooth.toothNumber)) continue;
		const existTooth = toothMap.get(incTooth.toothNumber);
		if (!existTooth) {
			toothMap.set(incTooth.toothNumber, { ...incTooth });
		} else {
			// Merge surface sets (union of treated/affected surfaces, removing empty/invalid values)
			const surfacesExist = Array.isArray(existTooth.surfaces) ? existTooth.surfaces : [];
			const surfacesInc = Array.isArray(incTooth.surfaces) ? incTooth.surfaces : [];
			const surfaceSet = new Set<string>();
			for (const s of [...surfacesExist, ...surfacesInc]) {
				if (typeof s === "string" && s.trim()) surfaceSet.add(s.trim());
			}

			const incTime = new Date(incTooth.updatedAt || 0).getTime() || 0;
			const existTime = new Date(existTooth.updatedAt || 0).getTime() || 0;

			const primary = incTime >= existTime ? incTooth : existTooth;

			toothMap.set(incTooth.toothNumber, {
				toothNumber: incTooth.toothNumber,
				statusCode: primary.statusCode || existTooth.statusCode || "healthy",
				surfaces: Array.from(surfaceSet).sort(),
				mobility: primary.mobility !== undefined ? primary.mobility : existTooth.mobility,
				notes: primary.notes || existTooth.notes,
				updatedAt: incTime >= existTime ? incTooth.updatedAt : existTooth.updatedAt,
			});
		}
	}

	return Array.from(toothMap.values()).sort((a, b) => a.toothNumber - b.toothNumber);
}

/**
 * 3-way Form 043/u and Medical Diary CRDT resolution.
 */
export function resolveForm043DiaryCrdt(
	input: Form043DiaryConflictInput,
): Form043DiaryConflictResult {
	const {
		existingDiary,
		incomingDiary,
		existingClock = {},
		incomingClock = {},
		existingUpdatedAt,
		incomingUpdatedAt,
		nodeId,
	} = input;

	if (!existingDiary) {
		const newClock = incrementVectorClock(incomingClock, nodeId);
		return {
			resolvedDiary: { ...incomingDiary },
			updatedClock: newClock,
			hasConflict: false,
			strategy: "created",
			conflictDetails: [],
		};
	}

	const mergedClock = incrementVectorClock(
		mergeVectorClocks(existingClock, incomingClock),
		nodeId,
	);
	const merged: Record<string, unknown> = { ...existingDiary };
	const conflicts: FieldConflictDetail[] = [];

	const incomingTime = new Date(incomingUpdatedAt).getTime() || 0;
	const existingTime = new Date(existingUpdatedAt || 0).getTime() || 0;

	for (const [field, incVal] of Object.entries(incomingDiary)) {
		if (field === "id" || field === "organizationId") continue;

		const existVal = existingDiary[field];

		if (existVal === undefined) {
			merged[field] = incVal;
			continue;
		}

		if (JSON.stringify(existVal) === JSON.stringify(incVal)) {
			continue;
		}

		// Specialized handler for Odontogram array
		if (field === "odontogram" || field === "odontogramTeeth") {
			const existTeeth = Array.isArray(existVal)
				? (existVal as OdontogramToothState[])
				: Array.isArray((existVal as Record<string, unknown>)?.teeth)
					? ((existVal as Record<string, unknown>).teeth as OdontogramToothState[])
					: [];
			const incTeeth = Array.isArray(incVal)
				? (incVal as OdontogramToothState[])
				: Array.isArray((incVal as Record<string, unknown>)?.teeth)
					? ((incVal as Record<string, unknown>).teeth as OdontogramToothState[])
					: [];

			const mergedTeeth = mergeOdontogramTeethCrdt(existTeeth, incTeeth);

			if (Array.isArray(incVal)) {
				merged[field] = mergedTeeth;
			} else {
				merged[field] = {
					...(incVal as Record<string, unknown>),
					teeth: mergedTeeth,
				};
			}

			conflicts.push({
				field,
				clientValue: incVal,
				serverValue: existVal,
				resolvedValue: merged[field],
				strategy: "crdt",
				winner: "merged",
				reason: "Odontogram per-tooth and per-surface CRDT map merged non-destructively",
			});
			continue;
		}

		// Specialized handler for string array treatment protocols / prescriptions
		if (Array.isArray(existVal) && Array.isArray(incVal)) {
			const set = new Set<string>();
			for (const item of existVal) {
				set.add(typeof item === "string" ? item : JSON.stringify(item));
			}
			for (const item of incVal) {
				set.add(typeof item === "string" ? item : JSON.stringify(item));
			}
			merged[field] = Array.from(set).map((str) => {
				try {
					return JSON.parse(str);
				} catch {
					return str;
				}
			});
			conflicts.push({
				field,
				clientValue: incVal,
				serverValue: existVal,
				resolvedValue: merged[field],
				strategy: "field_merge",
				winner: "merged",
				reason: `Array field '${field}' union-merged without dropping doctor entries`,
			});
			continue;
		}

		// Zero Keystroke Loss Invariant: blank/empty string incoming field NEVER destroys non-empty clinical notes
		if (
			typeof incVal === "string" &&
			!incVal.trim() &&
			typeof existVal === "string" &&
			existVal.trim().length > 0
		) {
			merged[field] = existVal;
			conflicts.push({
				field,
				clientValue: incVal,
				serverValue: existVal,
				resolvedValue: existVal,
				strategy: "crdt",
				winner: "server",
				reason: "Blank incoming clinical field rejected to protect existing non-empty diary notes (Zero Keystroke Loss)",
			});
			continue;
		}

		// Scalar fields (complaints, statusLocalis, diagnosisIcd10) resolved via LWW
		if (incomingTime >= existingTime) {
			merged[field] = incVal;
			conflicts.push({
				field,
				clientValue: incVal,
				serverValue: existVal,
				resolvedValue: incVal,
				strategy: "lww",
				winner: "client",
				reason: "Incoming clinical field edit timestamp is newer",
			});
		} else {
			merged[field] = existVal;
			conflicts.push({
				field,
				clientValue: incVal,
				serverValue: existVal,
				resolvedValue: existVal,
				strategy: "lww",
				winner: "server",
				reason: "Existing clinical field edit timestamp is newer",
			});
		}
	}

	return {
		resolvedDiary: merged,
		updatedClock: mergedClock,
		hasConflict: conflicts.length > 0,
		strategy: conflicts.length > 0 ? "field_merge" : "lww",
		conflictDetails: conflicts,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
