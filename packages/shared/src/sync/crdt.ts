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
		clientId,
		authorUserId,
	} = options;

	const nowIso = new Date().toISOString();

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

		// Case A: Field was not present on server or server has no recorded vector timestamp
		if (serverVal === undefined || serverFieldTime === 0) {
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

		// Case B: Both have timestamps for this field
		if (clientFieldTime > serverFieldTime) {
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
				reason: `Client field timestamp (${clientFieldTime}) is newer than server timestamp (${serverFieldTime})`,
			});
		} else if (serverFieldTime > clientFieldTime) {
			// Server's edit is strictly newer -> Server wins this field
			conflicts.push({
				field,
				clientValue: clientVal,
				serverValue: serverVal,
				resolvedValue: serverVal,
				strategy: "lww",
				winner: "server",
				reason: `Server field timestamp (${serverFieldTime}) is newer than client timestamp (${clientFieldTime})`,
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
