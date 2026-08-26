/**
 * DENTE CRM — Client-Side Conflict Resolution & Clinical Audit Trail Engine
 *
 * Provides:
 * 1. Field-Level Last-Write-Wins (LWW) resolution with Vector Clocks
 * 2. Multi-domain clinical CRDT merges (043/у diaries, Odontogram surfaces, Appointments, 804n services)
 * 3. Immutable Clinical Conflict Audit Log with exact timestamps and reason tracking
 */

import {
	type ConflictResolutionStrategy,
	type FieldConflictDetail,
	type MutationVector,
	type SyncMutationEntityKind,
	type VectorClock,
	mergeFieldLevelCrdt,
	mergeOdontogramTeethCrdt,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import type { ConflictAuditRecord } from "./types";

const conflictAuditTrail: ConflictAuditRecord[] = [];
const MAX_AUDIT_TRAIL_SIZE = 1000;

export function recordConflictAudit(params: {
	entityKind: SyncMutationEntityKind;
	entityId: string;
	mutationId: string;
	conflicts: FieldConflictDetail[];
}): ConflictAuditRecord[] {
	const nowIso = new Date().toISOString();
	const records: ConflictAuditRecord[] = [];

	for (const c of params.conflicts) {
		const rec: ConflictAuditRecord = {
			conflictId: `cfl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			entityKind: params.entityKind,
			entityId: params.entityId,
			mutationId: params.mutationId,
			field: c.field,
			clientValue: c.clientValue,
			serverValue: c.serverValue,
			resolvedValue: c.resolvedValue,
			strategy: c.strategy,
			winner: c.winner,
			resolvedAtIso: nowIso,
			reason: c.reason,
		};
		records.push(rec);
		conflictAuditTrail.unshift(rec);
	}

	if (conflictAuditTrail.length > MAX_AUDIT_TRAIL_SIZE) {
		conflictAuditTrail.splice(MAX_AUDIT_TRAIL_SIZE);
	}

	return records;
}

export function getConflictAuditTrail(filter?: {
	entityKind?: SyncMutationEntityKind;
	entityId?: string;
}): ConflictAuditRecord[] {
	if (!filter) return [...conflictAuditTrail];
	return conflictAuditTrail.filter((r) => {
		if (filter.entityKind && r.entityKind !== filter.entityKind) return false;
		if (filter.entityId && r.entityId !== filter.entityId) return false;
		return true;
	});
}

export function clearConflictAuditTrail(): void {
	conflictAuditTrail.length = 0;
}

export interface ResolveEntityConflictOptions<T extends Record<string, unknown> = Record<string, unknown>> {
	entityKind: SyncMutationEntityKind;
	entityId: string;
	serverEntity: T | null;
	clientPatch: Partial<T>;
	clientUpdatedAt: string;
	serverUpdatedAt?: string | null | undefined;
	serverVector?: MutationVector | undefined;
	clientVector?: MutationVector | undefined;
	clientId?: string | undefined;
	authorUserId?: string | undefined;
}

export function resolveEntityConflict<T extends Record<string, unknown> = Record<string, unknown>>(
	options: ResolveEntityConflictOptions<T>,
): {
	resolvedEntity: T;
	updatedVector: MutationVector;
	changedFields: string[];
	conflicts: FieldConflictDetail[];
	hasConflicts: boolean;
	strategy: "created" | "field_merge" | "lww" | "identical_noop";
} {
	const res = mergeFieldLevelCrdt<T>({
		entityKind: options.entityKind,
		entityId: options.entityId,
		serverEntity: options.serverEntity as Record<string, unknown> | null,
		serverVector: options.serverVector,
		clientPatch: options.clientPatch as Record<string, unknown>,
		clientVector: options.clientVector,
		clientUpdatedAt: options.clientUpdatedAt,
		serverUpdatedAt: options.serverUpdatedAt,
		clientId: options.clientId,
		authorUserId: options.authorUserId,
	});

	if (res.conflicts.length > 0) {
		recordConflictAudit({
			entityKind: options.entityKind,
			entityId: options.entityId,
			mutationId: `local-${options.entityId}`,
			conflicts: res.conflicts,
		});
	}

	return {
		resolvedEntity: res.mergedEntity,
		updatedVector: res.updatedVector,
		changedFields: res.changedFields,
		conflicts: res.conflicts,
		hasConflicts: res.hasConflicts,
		strategy: res.strategy,
	};
}

export {
	mergeOdontogramTeethCrdt,
	resolveCashOperationCrdt,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
};
