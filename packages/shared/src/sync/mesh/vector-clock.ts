
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a new Vector Clock initialized with an optional node ID and sequence.
 */
export function createVectorClock(nodeId?: string, initialSeq = 1): VectorClock {
	const clock: VectorClock = {};
	if (nodeId && typeof nodeId === "string" && nodeId.trim()) {
		const safeNodeId = nodeId.trim();
		if (safeNodeId !== "__proto__" && safeNodeId !== "constructor" && safeNodeId !== "prototype") {
			const seq = typeof initialSeq === "number" && Number.isFinite(initialSeq) ? Math.max(0, Math.floor(initialSeq)) : 1;
			clock[safeNodeId] = seq;
		}
	}
	return clock;
}

/**
 * Increments the vector clock counter for a specific node ID monotonically.
 */
export function incrementVectorClock(clock: VectorClock, nodeId: string): VectorClock {
	const safeNodeId = nodeId && typeof nodeId === "string" ? nodeId.trim() : "";
	if (!safeNodeId || safeNodeId === "__proto__" || safeNodeId === "constructor" || safeNodeId === "prototype") {
		return { ...clock };
	}
	const currentSeq = typeof clock[safeNodeId] === "number" && Number.isFinite(clock[safeNodeId])
		? Math.max(0, Math.floor(clock[safeNodeId]!))
		: 0;
	return {
		...clock,
		[safeNodeId]: currentSeq + 1,
	};
}

export type VectorClockComparison = "before" | "after" | "concurrent" | "identical";

/**
 * Compares two vector clocks to determine their causal relationship:
 * - "before": clockA happened strictly before clockB (clockA < clockB)
 * - "after": clockA happened strictly after clockB (clockA > clockB)
 * - "identical": clockA and clockB are identical
 * - "concurrent": clockA and clockB happened concurrently (conflict requires CRDT resolution)
 */
export function compareVectorClocks(
	clockA: VectorClock = {},
	clockB: VectorClock = {},
): VectorClockComparison {
	const safeKeysA = Object.keys(clockA || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
	const safeKeysB = Object.keys(clockB || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
	const allKeys = new Set([...safeKeysA, ...safeKeysB]);

	let hasGreater = false;
	let hasLesser = false;

	for (const key of allKeys) {
		const valA = typeof clockA[key] === "number" && Number.isFinite(clockA[key]) ? Math.max(0, Math.floor(clockA[key]!)) : 0;
		const valB = typeof clockB[key] === "number" && Number.isFinite(clockB[key]) ? Math.max(0, Math.floor(clockB[key]!)) : 0;

		if (valA > valB) {
			hasGreater = true;
		} else if (valA < valB) {
			hasLesser = true;
		}
	}

	if (!hasGreater && !hasLesser) {
		return "identical";
	}
	if (hasGreater && !hasLesser) {
		return "after";
	}
	if (hasLesser && !hasGreater) {
		return "before";
	}
	return "concurrent";
}

/**
 * Merges two vector clocks by taking the pairwise maximum for every node ID.
 */
export function mergeVectorClocks(
	clockA: VectorClock = {},
	clockB: VectorClock = {},
): VectorClock {
	const merged: VectorClock = {};
	const safeKeysA = Object.keys(clockA || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
	const safeKeysB = Object.keys(clockB || {}).filter((k) => k !== "__proto__" && k !== "constructor" && k !== "prototype");
	const allKeys = new Set([...safeKeysA, ...safeKeysB]);

	for (const key of allKeys) {
		const valA = typeof clockA[key] === "number" && Number.isFinite(clockA[key]) ? Math.max(0, Math.floor(clockA[key]!)) : 0;
		const valB = typeof clockB[key] === "number" && Number.isFinite(clockB[key]) ? Math.max(0, Math.floor(clockB[key]!)) : 0;
		merged[key] = Math.max(valA, valB);
	}
	return merged;
}

/**
 * Returns true if dominator vector clock causally dominates or equals dominated clock.
 */
export function dominatesVectorClock(
	dominator: VectorClock = {},
	dominated: VectorClock = {},
): boolean {
	const rel = compareVectorClocks(dominator, dominated);
	return rel === "after" || rel === "identical";
}

/**
 * Formats vector clock into human-readable compact string representation (e.g. "tablet-1:3,rec-1:5").
 */
export function vectorClockToString(clock: VectorClock): string {
	return Object.entries(clock || {})
		.filter(([k]) => k !== "__proto__" && k !== "constructor" && k !== "prototype")
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([k, v]) => `${k}:${typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0}`)
		.join(",");
}

/**
 * Parses compact string representation back into a VectorClock.
 */
export function parseVectorClock(str: string): VectorClock {
	const clock: VectorClock = {};
	if (!str || typeof str !== "string" || !str.trim()) return clock;
	const parts = str.split(",");
	for (const part of parts) {
		const [rawK, rawV] = part.split(":");
		if (rawK && rawV !== undefined) {
			const k = rawK.trim();
			if (!k || k === "__proto__" || k === "constructor" || k === "prototype") continue;
			const num = parseInt(rawV.trim(), 10);
			if (Number.isFinite(num) && num >= 0) {
				clock[k] = num;
			}
		}
	}
	return clock;
}

// ─────────────────────────────────────────────────────────────────────────────
