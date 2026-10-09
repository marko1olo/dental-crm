
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
import { incrementVectorClock, compareVectorClocks, mergeVectorClocks } from './vector-clock.js';

// ─────────────────────────────────────────────────────────────────────────────

const APPOINTMENT_STATUS_RANK: Record<string, number> = {
	planned: 1,
	confirmed: 2,
	arrived: 3,
	in_treatment: 4,
	completed: 5,
	no_show: 2,
	cancelled: 0,
};

export interface ScheduleAppointmentConflictInput {
	existingAppointment: Record<string, unknown> | null;
	incomingAppointment: Record<string, unknown>;
	existingClock?: VectorClock | undefined;
	incomingClock?: VectorClock | undefined;
	existingUpdatedAt?: string | undefined;
	incomingUpdatedAt: string;
	nodeId: string;
}

export interface ScheduleAppointmentConflictResult {
	resolvedAppointment: Record<string, unknown>;
	updatedClock: VectorClock;
	hasConflict: boolean;
	strategy: "created" | "lww" | "status_priority" | "merged" | "somatic_safety_union";
	conflictDetails: FieldConflictDetail[];
}

function protectSomaticSafety(
	target: Record<string, unknown>,
	existing: Record<string, unknown>,
	incoming: Record<string, unknown>,
	conflicts: FieldConflictDetail[],
): void {
	const allKeys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
	for (const key of allKeys) {
		if (isSomaticSafetyFieldOrRisk(key)) {
			const existVal = existing[key];
			const incVal = incoming[key];
			if (existVal !== undefined && incVal !== undefined) {
				if (JSON.stringify(existVal) !== JSON.stringify(incVal)) {
					const somatic = mergeSomaticSafetyField(key, incVal, existVal);
					target[key] = somatic.resolvedValue;
					conflicts.push({
						field: key,
						clientValue: incVal,
						serverValue: existVal,
						resolvedValue: somatic.resolvedValue,
						strategy: "somatic_safety_union",
						winner: somatic.winner,
						reason: somatic.reason,
					});
				}
			} else if (existVal !== undefined && incVal === undefined) {
				target[key] = existVal;
			} else if (incVal !== undefined && existVal === undefined) {
				target[key] = incVal;
			}
		}
	}
}

export function resolveScheduleAppointmentCrdt(
	input: ScheduleAppointmentConflictInput,
): ScheduleAppointmentConflictResult {
	const {
		existingAppointment,
		incomingAppointment,
		existingClock = {},
		incomingClock = {},
		existingUpdatedAt,
		incomingUpdatedAt,
		nodeId,
	} = input;

	if (!existingAppointment) {
		const newClock = incrementVectorClock(incomingClock, nodeId);
		return {
			resolvedAppointment: { ...incomingAppointment },
			updatedClock: newClock,
			hasConflict: false,
			strategy: "created",
			conflictDetails: [],
		};
	}

	const causalRelation = compareVectorClocks(incomingClock, existingClock);
	const mergedClock = incrementVectorClock(
		mergeVectorClocks(existingClock, incomingClock),
		nodeId,
	);

	if (causalRelation === "after") {
		const resolved: Record<string, unknown> = {
			...existingAppointment,
			...incomingAppointment,
		};
		const somaticConflicts: FieldConflictDetail[] = [];
		protectSomaticSafety(
			resolved,
			existingAppointment,
			incomingAppointment,
			somaticConflicts,
		);
		const hasSomatic = somaticConflicts.length > 0;
		return {
			resolvedAppointment: resolved,
			updatedClock: mergedClock,
			hasConflict: hasSomatic,
			strategy: hasSomatic ? "somatic_safety_union" : "lww",
			conflictDetails: somaticConflicts,
		};
	}

	if (causalRelation === "before") {
		const resolved: Record<string, unknown> = {
			...incomingAppointment,
			...existingAppointment,
		};
		const somaticConflicts: FieldConflictDetail[] = [];
		protectSomaticSafety(
			resolved,
			existingAppointment,
			incomingAppointment,
			somaticConflicts,
		);
		const hasSomatic = somaticConflicts.length > 0;
		return {
			resolvedAppointment: resolved,
			updatedClock: mergedClock,
			hasConflict: hasSomatic,
			strategy: hasSomatic ? "somatic_safety_union" : "lww",
			conflictDetails: somaticConflicts,
		};
	}

	// Concurrent edits: apply clinical domain deterministic resolution
	const conflicts: FieldConflictDetail[] = [];
	const merged: Record<string, unknown> = { ...existingAppointment };

	const incomingStatus = String(incomingAppointment.status || "planned");
	const existingStatus = String(existingAppointment.status || "planned");

	const incomingRank = APPOINTMENT_STATUS_RANK[incomingStatus] ?? 1;
	const existingRank = APPOINTMENT_STATUS_RANK[existingStatus] ?? 1;

	// Status resolution: higher clinical progression wins (e.g. in_treatment > confirmed)
	if (incomingStatus !== existingStatus) {
		let winnerStatus = existingStatus;
		let winnerSide: "client" | "server" = "server";

		if (incomingStatus === "cancelled" || existingStatus === "cancelled") {
			// Cancellation LWW by timestamp
			const incomingTime = new Date(incomingUpdatedAt).getTime() || 0;
			const existingTime = new Date(existingUpdatedAt || 0).getTime() || 0;
			if (incomingTime >= existingTime) {
				winnerStatus = incomingStatus;
				winnerSide = "client";
			} else {
				winnerStatus = existingStatus;
				winnerSide = "server";
			}
		} else if (incomingRank > existingRank) {
			winnerStatus = incomingStatus;
			winnerSide = "client";
		}

		merged.status = winnerStatus;
		conflicts.push({
			field: "status",
			clientValue: incomingStatus,
			serverValue: existingStatus,
			resolvedValue: winnerStatus,
			strategy: "status_priority",
			winner: winnerSide,
			reason: `Appointment status resolved via clinical priority rank (incoming: ${incomingStatus} [${incomingRank}], existing: ${existingStatus} [${existingRank}])`,
		});
	}

	// Merge other fields (notes, services, doctor) via LWW field timestamps or lexical tie-break
	for (const [key, incVal] of Object.entries(incomingAppointment)) {
		if (key === "status" || key === "id" || key === "organizationId") continue;
		const existVal = existingAppointment[key];

		// Clinical Somatic Safety Invariant:
		if (isSomaticSafetyFieldOrRisk(key)) {
			const somatic = mergeSomaticSafetyField(key, incVal, existVal);
			merged[key] = somatic.resolvedValue;
			if (
				JSON.stringify(existVal) !== JSON.stringify(incVal) ||
				somatic.winner !== "server"
			) {
				conflicts.push({
					field: key,
					clientValue: incVal,
					serverValue: existVal,
					resolvedValue: somatic.resolvedValue,
					strategy: "somatic_safety_union",
					winner: somatic.winner,
					reason: somatic.reason,
				});
			}
			continue;
		}

		if (existVal === undefined) {
			merged[key] = incVal;
		} else if (JSON.stringify(existVal) !== JSON.stringify(incVal)) {
			const incomingTime = new Date(incomingUpdatedAt).getTime() || 0;
			const existingTime = new Date(existingUpdatedAt || 0).getTime() || 0;

			if (incomingTime > existingTime) {
				merged[key] = incVal;
				conflicts.push({
					field: key,
					clientValue: incVal,
					serverValue: existVal,
					resolvedValue: incVal,
					strategy: "lww",
					winner: "client",
					reason: "Incoming edit timestamp is newer",
				});
			} else if (existingTime > incomingTime) {
				merged[key] = existVal;
				conflicts.push({
					field: key,
					clientValue: incVal,
					serverValue: existVal,
					resolvedValue: existVal,
					strategy: "lww",
					winner: "server",
					reason: "Existing edit timestamp is newer",
				});
			} else {
				// Tie break deterministically by payload string comparison
				const incStr = JSON.stringify(incVal);
				const existStr = JSON.stringify(existVal);
				const clientWins = incStr.localeCompare(existStr) >= 0;
				merged[key] = clientWins ? incVal : existVal;
				conflicts.push({
					field: key,
					clientValue: incVal,
					serverValue: existVal,
					resolvedValue: merged[key],
					strategy: "crdt",
					winner: clientWins ? "client" : "server",
					reason: "Deterministic tie-break on identical timestamps",
				});
			}
		}
	}

	const hasStatusConflict = conflicts.some((c) => c.field === "status");
	const hasSomaticConflict = conflicts.some(
		(c) => c.strategy === "somatic_safety_union",
	);
	const resolvedStrategy:
		| "created"
		| "lww"
		| "status_priority"
		| "merged"
		| "somatic_safety_union" = hasStatusConflict
		? "status_priority"
		: hasSomaticConflict
			? "somatic_safety_union"
			: conflicts.length > 0
				? "status_priority"
				: "merged";

	return {
		resolvedAppointment: merged,
		updatedClock: mergedClock,
		hasConflict: conflicts.length > 0,
		strategy: resolvedStrategy,
		conflictDetails: conflicts,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
