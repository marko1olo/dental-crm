import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEntityKind,
	VectorClock,
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
	strategy: "created" | "field_merge" | "lww" | "identical_noop" | "somatic_safety_union";
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

// ─────────────────────────────────────────────────────────────────────────────
// Somatic Safety & Medical Alerts Invariants (Allergies, Risks, Contraindications)
// ─────────────────────────────────────────────────────────────────────────────

export const SOMATIC_SAFETY_FIELDS = new Set([
	"allergies",
	"somaticAllergies",
	"somatic_allergies",
	"contraindications",
	"emergencyAlerts",
	"emergency_alerts",
	"chronicDiseases",
	"chronic_diseases",
	"somaticAlerts",
	"somatic_alerts",
	"medicalAlerts",
	"medical_alerts",
]);

export const ANESTHESIA_RISK_RANK: Record<string, number> = {
	critical: 5,
	high: 4,
	moderate: 3,
	low: 2,
	normal: 1,
};

export function isSomaticSafetyFieldOrRisk(field: string): boolean {
	return (
		SOMATIC_SAFETY_FIELDS.has(field) ||
		field === "anesthesiaRisk" ||
		field === "anesthesia_risk"
	);
}

export function isSomaticEmpty(val: unknown): boolean {
	if (val === undefined || val === null) return true;
	if (typeof val === "string") return val.trim() === "";
	if (Array.isArray(val)) {
		return (
			val.length === 0 ||
			val.every((item) => (typeof item === "string" ? item.trim() === "" : !item))
		);
	}
	if (typeof val === "object") {
		return Object.keys(val as Record<string, unknown>).length === 0;
	}
	return false;
}

export interface SomaticSafetyMergeResult {
	resolvedValue: unknown;
	winner: "client" | "server" | "merged";
	reason: string;
}

export function mergeSomaticSafetyField(
	field: string,
	clientVal: unknown,
	serverVal: unknown,
): SomaticSafetyMergeResult {
	// Anesthesia risk ranking progression: highest rating strictly wins
	if (field === "anesthesiaRisk" || field === "anesthesia_risk") {
		const clientRank =
			typeof clientVal === "string"
				? ANESTHESIA_RISK_RANK[clientVal.toLowerCase().trim()] ?? 0
				: 0;
		const serverRank =
			typeof serverVal === "string"
				? ANESTHESIA_RISK_RANK[serverVal.toLowerCase().trim()] ?? 0
				: 0;

		if (clientRank > serverRank) {
			return {
				resolvedValue: clientVal,
				winner: "client",
				reason: `Upgraded anesthesia risk to higher clinical alert level (${String(clientVal)} [${clientRank}] > ${String(serverVal)} [${serverRank}])`,
			};
		}
		if (serverRank > clientRank) {
			return {
				resolvedValue: serverVal,
				winner: "server",
				reason: `Preserved higher anesthesia risk alert level (${String(serverVal)} [${serverRank}] >= ${String(clientVal)} [${clientRank}])`,
			};
		}
		return {
			resolvedValue:
				clientVal !== undefined && clientVal !== "" ? clientVal : serverVal,
			winner: "client",
			reason: "Identical or equal rank anesthesia risk level",
		};
	}

	const clientEmpty = isSomaticEmpty(clientVal);
	const serverEmpty = isSomaticEmpty(serverVal);

	if (clientEmpty && !serverEmpty) {
		return {
			resolvedValue: serverVal,
			winner: "server",
			reason:
				"Preserved non-empty somatic safety data against empty/cleared client update",
		};
	}

	if (!clientEmpty && serverEmpty) {
		return {
			resolvedValue: clientVal,
			winner: "client",
			reason: "Adopted new non-empty somatic safety data over empty server value",
		};
	}

	if (clientEmpty && serverEmpty) {
		return {
			resolvedValue: serverVal !== undefined ? serverVal : clientVal,
			winner: "server",
			reason: "Both somatic safety values are empty",
		};
	}

	// Both are non-empty: non-destructively merge arrays or join strings
	const toItems = (val: unknown): string[] => {
		if (Array.isArray(val)) {
			return val.map((x) => String(x).trim()).filter(Boolean);
		}
		if (typeof val === "string") {
			return val
				.split(";")
				.map((s) => s.trim())
				.filter(Boolean);
		}
		return [];
	};

	const clientItems = toItems(clientVal);
	const serverItems = toItems(serverVal);

	const unionItems: string[] = [];
	const seen = new Set<string>();

	for (const item of [...serverItems, ...clientItems]) {
		const lower = item.toLowerCase();
		if (!seen.has(lower)) {
			seen.add(lower);
			unionItems.push(item);
		}
	}

	// If either input was an array, return array
	if (Array.isArray(clientVal) || Array.isArray(serverVal)) {
		return {
			resolvedValue: unionItems,
			winner: "merged",
			reason:
				"Union-merged somatic safety alert entries from both client and server",
		};
	}

	// Otherwise both were strings: join with semicolon
	const mergedString = unionItems.join("; ");
	return {
		resolvedValue: mergedString,
		winner: "merged",
		reason:
			"Combined distinct somatic safety notes from client and server with semicolon",
	};
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
 * 4. Somatic safety alerts (allergies, contraindications, anesthesia risk) are never wiped or downgraded.
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

		// Clinical Somatic Safety & Medical Alerts Invariant:
		// Never wipe allergies or contraindications via blind LWW, union-merge entries,
		// and upgrade to highest anesthesia risk.
		if (isSomaticSafetyFieldOrRisk(field)) {
			const somatic = mergeSomaticSafetyField(field, clientVal, serverVal);
			const resolvedValJson = JSON.stringify(somatic.resolvedValue);

			if (resolvedValJson !== serverValJson) {
				merged[field] = somatic.resolvedValue;
				changedFields.push(field);
				mergedVector[field] = {
					updatedAt: clientFieldEntry?.updatedAt || clientUpdatedAt || nowIso,
					version: (serverFieldEntry?.version ?? 0) + 1,
					authorId: authorUserId,
					clientId,
				};
			}

			conflicts.push({
				field,
				clientValue: clientVal,
				serverValue: serverVal,
				resolvedValue: somatic.resolvedValue,
				strategy: "somatic_safety_union",
				winner: somatic.winner,
				reason: somatic.reason,
			});
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
	const hasSomaticConflicts = conflicts.some(
		(c) => c.strategy === "somatic_safety_union",
	);
	return {
		mergedEntity: merged as unknown as T,
		updatedVector: mergedVector,
		changedFields,
		conflicts,
		hasConflicts: hasActualConflicts,
		strategy: hasSomaticConflicts
			? "somatic_safety_union"
			: hasActualConflicts
				? "lww"
				: changedFields.length > 0
					? "field_merge"
					: "identical_noop",
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Vector Clock Primitives (SSOT)
// ─────────────────────────────────────────────────────────────────────────────

export type VectorClockComparison = "before" | "after" | "concurrent" | "identical";

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
// Financial Cash Operation CRDT Primitives (SSOT)
// ─────────────────────────────────────────────────────────────────────────────

export interface CashPaymentRecord {
	paymentId: string;
	patientId: string;
	amountKopecks: number;
	paymentMethod: "cash" | "card" | "sbp" | "deposit" | "installment";
	status: "draft" | "fiscalized" | "refunded" | "voided";
	fiscalDocNumber?: string | undefined;
	idempotencyKey: string;
	createdAt: string;
}

export interface CashOperationConflictInput {
	existingPayment: CashPaymentRecord | null;
	incomingPayment: CashPaymentRecord;
	existingClock?: VectorClock | undefined;
	incomingClock?: VectorClock | undefined;
	nodeId: string;
}

export interface CashOperationConflictResult {
	resolvedPayment: CashPaymentRecord;
	updatedClock: VectorClock;
	status: "applied" | "duplicate" | "conflict_resolved";
	isDuplicate: boolean;
}

export function resolveCashOperationCrdt(
	input: CashOperationConflictInput,
): CashOperationConflictResult {
	const {
		existingPayment,
		incomingPayment,
		existingClock = {},
		incomingClock = {},
		nodeId,
	} = input;

	const mergedClock = incrementVectorClock(
		mergeVectorClocks(existingClock, incomingClock),
		nodeId,
	);

	if (!existingPayment) {
		return {
			resolvedPayment: { ...incomingPayment },
			updatedClock: mergedClock,
			status: "applied",
			isDuplicate: false,
		};
	}

	// Idempotency check: same idempotencyKey or same paymentId
	if (
		existingPayment.idempotencyKey === incomingPayment.idempotencyKey ||
		existingPayment.paymentId === incomingPayment.paymentId
	) {
		// Fiscal status progression: fiscalized > draft
		const resolvedStatus =
			existingPayment.status === "fiscalized" ||
			incomingPayment.status === "fiscalized"
				? "fiscalized"
				: existingPayment.status === "refunded" ||
						incomingPayment.status === "refunded"
					? "refunded"
					: incomingPayment.status;

		return {
			resolvedPayment: {
				...existingPayment,
				...incomingPayment,
				status: resolvedStatus,
				fiscalDocNumber:
					existingPayment.fiscalDocNumber || incomingPayment.fiscalDocNumber,
			},
			updatedClock: mergedClock,
			status: "duplicate",
			isDuplicate: true,
		};
	}

	return {
		resolvedPayment: { ...incomingPayment },
		updatedClock: mergedClock,
		status: "conflict_resolved",
		isDuplicate: false,
	};
}
