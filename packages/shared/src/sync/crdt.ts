import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEntityKind,
} from "./types.js";

export interface MergeFieldLevelCrdtOptions {
	entityKind: SyncMutationEntityKind;
	entityId: string;
	serverEntity: Record<string, unknown> | null | undefined;
	serverVector?: MutationVector | null | undefined;
	clientPatch: Record<string, unknown>;
	clientVector?: MutationVector | null | undefined;
	clientUpdatedAt: string;
	serverUpdatedAt?: string | null | undefined;
	clientId?: string | undefined;
	authorUserId?: string | undefined;
}

export interface MergeFieldLevelCrdtResult<T = Record<string, unknown>> {
	mergedEntity: T;
	updatedVector: MutationVector;
	changedFields: string[];
	conflicts: FieldConflictDetail[];
	hasConflicts: boolean;
	strategy: "created" | "field_merge" | "lww" | "identical_noop";
}

function parseIsoTimestamp(isoString?: string | null | undefined): number {
	if (!isoString) return 0;
	const t = new Date(isoString).getTime();
	return Number.isNaN(t) ? 0 : t;
}

/**
 * Global Clock Skew Calibration State & Utilities for CRDT LWW
 *
 * `clockSkewMs = serverTimeMs - clientLocalTimeMs`
 * When clockSkewMs is added to local timestamp, we get the calibrated server-aligned timestamp.
 */
let currentClockSkewMs = 0;
let lastMonotonicAdjustedMs = 0;

// Hard boundary bounds for valid JavaScript Dates (Year 1970 to Year 2999)
const MIN_VALID_EPOCH_MS = 0;
const MAX_VALID_EPOCH_MS = 32503680000000; // ~Year 3000

export function setGlobalClockSkew(skewMs: number): void {
	if (!Number.isFinite(skewMs)) {
		currentClockSkewMs = 0;
		return;
	}
	// Bound extreme drifts to +/- 10 years to prevent arithmetic overflow in JS Date
	const MAX_REASONABLE_SKEW_MS = 10 * 365.25 * 24 * 60 * 60 * 1000;
	currentClockSkewMs = Math.max(
		-MAX_REASONABLE_SKEW_MS,
		Math.min(MAX_REASONABLE_SKEW_MS, skewMs),
	);
}

export function getGlobalClockSkew(): number {
	return currentClockSkewMs;
}

export function calibrateClockSkew(
	serverIsoOrMs?: string | number | null | undefined,
	clientLocalTimeMs?: number | undefined,
): number {
	if (serverIsoOrMs === null || serverIsoOrMs === undefined || serverIsoOrMs === "") {
		return currentClockSkewMs;
	}

	let serverMs: number;
	if (typeof serverIsoOrMs === "number") {
		serverMs = serverIsoOrMs;
	} else {
		serverMs = new Date(serverIsoOrMs).getTime();
	}

	if (!Number.isFinite(serverMs) || serverMs < MIN_VALID_EPOCH_MS || serverMs > MAX_VALID_EPOCH_MS) {
		return currentClockSkewMs;
	}

	const safeLocalTimeMs =
		typeof clientLocalTimeMs === "number" && Number.isFinite(clientLocalTimeMs)
			? clientLocalTimeMs
			: Date.now();

	const skew = serverMs - safeLocalTimeMs;
	setGlobalClockSkew(skew);
	return currentClockSkewMs;
}

export function getAdjustedNowMs(localTimeMs?: number): number {
	const isExplicit = typeof localTimeMs === "number" && Number.isFinite(localTimeMs);
	const safeLocalMs = isExplicit ? (localTimeMs as number) : Date.now();

	let calculated = safeLocalMs + currentClockSkewMs;

	// Clamp within valid JS Date bounds
	if (!Number.isFinite(calculated) || calculated < MIN_VALID_EPOCH_MS) {
		calculated = safeLocalMs;
	}

	if (!isExplicit) {
		// Guarantee monotonic non-decreasing timestamp sequence when generating "now" within the session
		if (calculated <= lastMonotonicAdjustedMs) {
			calculated = lastMonotonicAdjustedMs + 1;
		}
		lastMonotonicAdjustedMs = calculated;
	}

	return calculated;
}

export function getAdjustedNowIso(localTimeMs?: number): string {
	const ms = getAdjustedNowMs(localTimeMs);
	try {
		const date = new Date(ms);
		if (Number.isNaN(date.getTime())) {
			return new Date().toISOString();
		}
		return date.toISOString();
	} catch {
		return new Date().toISOString();
	}
}

export function resetGlobalClockSkew(): void {
	currentClockSkewMs = 0;
	lastMonotonicAdjustedMs = 0;
}

/**
 * Deterministic Field-Level Last-Write-Wins (LWW) CRDT & Three-Way Merging.
 *
 * Guaranteed Invariants:
 * 1. Independent fields never clobber each other:
 *    - e.g., if Doctor edited `anamnesis` offline while Receptionist updated `phone` online,
 *      both `anamnesis` and `phone` are preserved!
 * 2. Same-field concurrent collisions are resolved deterministically using
 *    vector clocks / field timestamps (`mutationVector` / `updatedAt`).
 * 3. Idempotent: merging the exact same patch multiple times produces the exact same result.
 */
export function mergeFieldLevelCrdt<T extends Record<string, unknown>>(
	options: MergeFieldLevelCrdtOptions,
): MergeFieldLevelCrdtResult<T> {
	const {
		entityId,
		serverEntity,
		serverVector = {},
		clientPatch,
		clientVector = {},
		clientUpdatedAt,
		serverUpdatedAt,
		clientId,
		authorUserId,
	} = options;

	const nowIso = getAdjustedNowIso();

	// Case 1: Entity does not exist on server yet (New entity creation)
	if (!serverEntity) {
		const newVector: MutationVector = {};
		const changedFields: string[] = [];

		for (const [key, value] of Object.entries(clientPatch)) {
			if (value !== undefined) {
				changedFields.push(key);
				const clientFieldEntry = clientVector?.[key];
				newVector[key] = {
					updatedAt: clientFieldEntry?.updatedAt || clientUpdatedAt || nowIso,
					version: (clientFieldEntry?.version ?? 0) + 1,
					authorId: authorUserId,
					clientId,
				};
			}
		}

		return {
			mergedEntity: { ...clientPatch, id: entityId } as unknown as T,
			updatedVector: newVector,
			changedFields,
			conflicts: [],
			hasConflicts: false,
			strategy: "created",
		};
	}

	const merged: Record<string, unknown> = { ...serverEntity };
	const mergedVector: MutationVector = { ...(serverVector || {}) };
	const changedFields: string[] = [];
	const conflicts: FieldConflictDetail[] = [];

	// Metadata and immutable system fields that shouldn't be overridden by blind patch
	const protectedFields = new Set([
		"id",
		"organizationId",
		"organization_id",
		"createdAt",
		"created_at",
	]);

	for (const [field, clientVal] of Object.entries(clientPatch)) {
		if (protectedFields.has(field) || clientVal === undefined) {
			continue;
		}

		const serverVal = serverEntity[field];
		const serverFieldEntry = serverVector?.[field];
		const clientFieldEntry = clientVector?.[field];

		const serverFieldTime = parseIsoTimestamp(
			serverFieldEntry?.updatedAt,
		);
		const clientFieldTime = parseIsoTimestamp(
			clientFieldEntry?.updatedAt || clientUpdatedAt,
		);

		// If values are deeply identical, no-op
		const clientValJson = JSON.stringify(clientVal);
		const serverValJson = JSON.stringify(serverVal);
		if (clientValJson === serverValJson) {
			continue;
		}

		const fallbackServerTime = parseIsoTimestamp(
			serverUpdatedAt ||
				(serverEntity?.updatedAt as string) ||
				(serverEntity?.updated_at as string),
		);
		const effectiveServerFieldTime =
			serverFieldTime > 0 ? serverFieldTime : fallbackServerTime;

		// Case A: Field was not present on server at all
		if (serverVal === undefined) {
			merged[field] = clientVal;
			changedFields.push(field);
			mergedVector[field] = {
				updatedAt: clientFieldEntry?.updatedAt || clientUpdatedAt || nowIso,
				version: (serverFieldEntry?.version ?? 0) + 1,
				authorId: authorUserId,
				clientId,
			};
			continue;
		}

		// Case B: Both have values - compare timestamps
		if (clientFieldTime > effectiveServerFieldTime) {
			// Client's edit is strictly newer
			merged[field] = clientVal;
			changedFields.push(field);
			mergedVector[field] = {
				updatedAt: clientFieldEntry?.updatedAt || clientUpdatedAt || nowIso,
				version: (serverFieldEntry?.version ?? 0) + 1,
				authorId: authorUserId,
				clientId,
			};

			conflicts.push({
				field,
				clientValue: clientVal,
				serverValue: serverVal,
				resolvedValue: clientVal,
				strategy: "lww",
				winner: "client",
				reason: `Client field timestamp (${clientFieldTime}) is newer than server timestamp (${effectiveServerFieldTime})`,
			});
		} else if (effectiveServerFieldTime > clientFieldTime) {
			// Server's edit is strictly newer -> Server wins this field
			conflicts.push({
				field,
				clientValue: clientVal,
				serverValue: serverVal,
				resolvedValue: serverVal,
				strategy: "lww",
				winner: "server",
				reason: `Server field timestamp (${effectiveServerFieldTime}) is newer than client timestamp (${clientFieldTime})`,
			});
		} else {
			// Exact timestamp tie -> Deterministic tie-breaking (lexical comparison of serialized value)
			const clientWins = clientValJson.localeCompare(serverValJson) >= 0;
			const resolvedValue = clientWins ? clientVal : serverVal;

			if (clientWins) {
				merged[field] = clientVal;
				changedFields.push(field);
				mergedVector[field] = {
					updatedAt: nowIso,
					version: (serverFieldEntry?.version ?? 0) + 1,
					authorId: authorUserId,
					clientId,
				};
			}

			conflicts.push({
				field,
				clientValue: clientVal,
				serverValue: serverVal,
				resolvedValue,
				strategy: "crdt",
				winner: clientWins ? "client" : "server",
				reason: "Timestamp tie resolved deterministically",
			});
		}
	}

	const hasActualConflicts = conflicts.length > 0;
	return {
		mergedEntity: merged as unknown as T,
		updatedVector: mergedVector,
		changedFields,
		conflicts,
		hasConflicts: hasActualConflicts,
		strategy: hasActualConflicts ? "lww" : changedFields.length > 0 ? "field_merge" : "identical_noop",
	};
}
