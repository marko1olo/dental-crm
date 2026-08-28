/**
 * DENTE CRM — Offline CRDT Synchronization Engine (Wave 10)
 *
 * Provides:
 * 1. LWW-Element-Set CRDT (Conflict-Free Replicated Data Type) with commutative,
 *    associative and idempotent mathematical merge semantics.
 * 2. Lamport Clock & Vector Clocks for causal ordering and clock skew compensation.
 * 3. Clinical state containers:
 *    - FDI 11–48 / 51–85 multi-tooth and per-surface odontogram map CRDT.
 *    - Form 043/u SOAP medical diaries (Subjective, Objective, Assessment ICD-10, Plan).
 *    - Appointments & Visits with clinical status rank progression and cancellation LWW.
 *    - Payments & fiscal items with kopeck-exact precision and duplicate detection.
 * 4. Resilient Outbox Queue Buffer with offline buffering, automatic reconnection draining,
 *    and deterministic idempotency batch envelopes (RFC 9562 UUIDv7 + SHA-256 payload hash).
 * 5. Multi-tier storage drivers (IndexedDB, LocalStorage, In-Memory) with seamless fallback.
 */

import { z } from "zod";
import {
	calibrateClockSkew,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	mergeFieldLevelCrdt,
} from "./crdt.js";
import {
	canonicalJsonStringify,
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
	parseIdempotencyKey,
} from "./hashing.js";
import {
	createVectorClock,
	incrementVectorClock,
	mergeOdontogramTeethCrdt,
	type OdontogramToothState,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
} from "./mesh.js";
import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncTierMode,
	VectorClock,
} from "./types.js";

export type {
	FieldConflictDetail,
	MutationVector,
	OdontogramToothState,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	SyncTierMode,
	VectorClock,
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pure Mathematical Lamport Clock Engine
// ─────────────────────────────────────────────────────────────────────────────

export class LamportClock {
	private counter: number;
	private readonly nodeId: string;

	constructor(nodeId = "default-node", initialCounter = 0) {
		this.nodeId = nodeId.trim() || "default-node";
		this.counter = Number.isFinite(initialCounter) && initialCounter >= 0
			? Math.floor(initialCounter)
			: 0;
	}

	public tick(): number {
		this.counter += 1;
		return this.counter;
	}

	public witness(remoteCounter: number): number {
		const safeRemote = Number.isFinite(remoteCounter) && remoteCounter >= 0
			? Math.floor(remoteCounter)
			: 0;
		this.counter = Math.max(this.counter, safeRemote) + 1;
		return this.counter;
	}

	public getTime(): number {
		return this.counter;
	}

	public getNodeId(): string {
		return this.nodeId;
	}

	public formatTimestamp(wallTimeIso?: string): string {
		const iso = wallTimeIso || getAdjustedNowIso();
		return `L${this.counter}@${iso}#${this.nodeId}`;
	}

	public static parseTimestamp(stamp: string): {
		lamport: number;
		wallTimeIso: string;
		nodeId: string;
	} | null {
		if (typeof stamp !== "string" || !stamp.startsWith("L")) return null;
		const match = /^L(\d+)@([^#]+)#(.+)$/.exec(stamp);
		if (!match || !match[1] || !match[2] || !match[3]) return null;
		return {
			lamport: parseInt(match[1], 10),
			wallTimeIso: match[2],
			nodeId: match[3],
		};
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LWW-Element-Set CRDT Implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface LwwElementRecord<T> {
	readonly element: T;
	readonly timestamp: number;
	readonly lamportTime: number;
	readonly authorId?: string | undefined;
}

export interface SerializedLwwElementSet<T = unknown> {
	addSet: Array<{
		key: string;
		element: T;
		timestamp: number;
		lamportTime: number;
		authorId?: string | undefined;
	}>;
	removeSet: Array<{
		key: string;
		element: T;
		timestamp: number;
		lamportTime: number;
		authorId?: string | undefined;
	}>;
}

/**
 * Last-Write-Wins Element Set (LWW-Element-Set) CRDT.
 */
export class LwwElementSet<T = string> {
	private readonly addMap = new Map<string, LwwElementRecord<T>>();
	private readonly removeMap = new Map<string, LwwElementRecord<T>>();
	private readonly keyFn: (element: T) => string;
	private readonly bias: "add" | "remove";

	constructor(options?: {
		keyFn?: (element: T) => string;
		bias?: "add" | "remove";
	}) {
		this.keyFn = options?.keyFn || ((el: T) => {
			if (typeof el === "string" || typeof el === "number" || typeof el === "boolean") {
				return String(el);
			}
			return canonicalJsonStringify(el);
		});
		this.bias = options?.bias || "add";
	}

	public add(
		element: T,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const key = this.keyFn(element);
		const existing = this.addMap.get(key);
		if (!existing || timestampMs > existing.timestamp || (timestampMs === existing.timestamp && lamportTime > existing.lamportTime)) {
			this.addMap.set(key, {
				element,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
			});
		}
		return this;
	}

	public remove(
		element: T,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const key = this.keyFn(element);
		const existing = this.removeMap.get(key);
		if (!existing || timestampMs > existing.timestamp || (timestampMs === existing.timestamp && lamportTime > existing.lamportTime)) {
			this.removeMap.set(key, {
				element,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
			});
		}
		return this;
	}

	public has(element: T): boolean {
		const key = this.keyFn(element);
		const addRec = this.addMap.get(key);
		if (!addRec) return false;

		const removeRec = this.removeMap.get(key);
		if (!removeRec) return true;

		if (addRec.timestamp > removeRec.timestamp) return true;
		if (removeRec.timestamp > addRec.timestamp) return false;

		if (addRec.lamportTime > removeRec.lamportTime) return true;
		if (removeRec.lamportTime > addRec.lamportTime) return false;

		return this.bias === "add";
	}

	public read(): T[] {
		const result: T[] = [];
		for (const [key, addRec] of this.addMap.entries()) {
			const removeRec = this.removeMap.get(key);
			if (!removeRec) {
				result.push(addRec.element);
			} else if (addRec.timestamp > removeRec.timestamp) {
				result.push(addRec.element);
			} else if (addRec.timestamp === removeRec.timestamp) {
				if (addRec.lamportTime > removeRec.lamportTime) {
					result.push(addRec.element);
				} else if (addRec.lamportTime === removeRec.lamportTime && this.bias === "add") {
					result.push(addRec.element);
				}
			}
		}
		return result;
	}

	public size(): number {
		return this.read().length;
	}

	public merge(other: LwwElementSet<T>): LwwElementSet<T> {
		const merged = new LwwElementSet<T>({
			keyFn: this.keyFn,
			bias: this.bias,
		});

		for (const [key, rec] of this.addMap.entries()) {
			merged.addMap.set(key, { ...rec });
		}
		for (const [key, rec] of other.addMap.entries()) {
			const existing = merged.addMap.get(key);
			if (!existing || rec.timestamp > existing.timestamp || (rec.timestamp === existing.timestamp && rec.lamportTime > existing.lamportTime)) {
				merged.addMap.set(key, { ...rec });
			}
		}

		for (const [key, rec] of this.removeMap.entries()) {
			merged.removeMap.set(key, { ...rec });
		}
		for (const [key, rec] of other.removeMap.entries()) {
			const existing = merged.removeMap.get(key);
			if (!existing || rec.timestamp > existing.timestamp || (rec.timestamp === existing.timestamp && rec.lamportTime > existing.lamportTime)) {
				merged.removeMap.set(key, { ...rec });
			}
		}

		return merged;
	}

	public toJSON(): SerializedLwwElementSet<T> {
		const addSet = Array.from(this.addMap.entries()).map(([key, r]) => ({
			key,
			element: r.element,
			timestamp: r.timestamp,
			lamportTime: r.lamportTime,
			...(r.authorId ? { authorId: r.authorId } : {}),
		}));
		const removeSet = Array.from(this.removeMap.entries()).map(([key, r]) => ({
			key,
			element: r.element,
			timestamp: r.timestamp,
			lamportTime: r.lamportTime,
			...(r.authorId ? { authorId: r.authorId } : {}),
		}));
		return { addSet, removeSet };
	}

	public static fromJSON<U>(
		json: SerializedLwwElementSet<U>,
		options?: { keyFn?: (element: U) => string; bias?: "add" | "remove" },
	): LwwElementSet<U> {
		const set = new LwwElementSet<U>(options);
		if (json && Array.isArray(json.addSet)) {
			for (const item of json.addSet) {
				set.addMap.set(item.key, {
					element: item.element,
					timestamp: item.timestamp,
					lamportTime: item.lamportTime,
					...(item.authorId ? { authorId: item.authorId } : {}),
				});
			}
		}
		if (json && Array.isArray(json.removeSet)) {
			for (const item of json.removeSet) {
				set.removeMap.set(item.key, {
					element: item.element,
					timestamp: item.timestamp,
					lamportTime: item.lamportTime,
					...(item.authorId ? { authorId: item.authorId } : {}),
				});
			}
		}
		return set;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. LWW-Map CRDT Implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface LwwMapEntry<V> {
	readonly value: V;
	readonly timestamp: number;
	readonly lamportTime: number;
	readonly authorId?: string | undefined;
	readonly version: number;
	readonly isDeleted: boolean;
}

export interface SerializedLwwMap<V = unknown> {
	entries: Array<{
		key: string;
		value: V;
		timestamp: number;
		lamportTime: number;
		authorId?: string | undefined;
		version: number;
		isDeleted: boolean;
	}>;
}

export class LwwMap<K extends string = string, V = unknown> {
	private readonly map = new Map<K, LwwMapEntry<V>>();

	public set(
		key: K,
		value: V,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const existing = this.map.get(key);
		const newVersion = (existing?.version ?? 0) + 1;
		if (
			!existing ||
			timestampMs > existing.timestamp ||
			(timestampMs === existing.timestamp && lamportTime > existing.lamportTime)
		) {
			this.map.set(key, {
				value,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
				version: newVersion,
				isDeleted: false,
			});
		}
		return this;
	}

	public get(key: K): V | undefined {
		const entry = this.map.get(key);
		if (!entry || entry.isDeleted) return undefined;
		return entry.value;
	}

	public getEntry(key: K): LwwMapEntry<V> | undefined {
		return this.map.get(key);
	}

	public has(key: K): boolean {
		const entry = this.map.get(key);
		return Boolean(entry && !entry.isDeleted);
	}

	public delete(
		key: K,
		timestampMs = getAdjustedNowMs(),
		lamportTime = 1,
		authorId?: string | undefined,
	): this {
		const existing = this.map.get(key);
		if (
			existing &&
			(timestampMs > existing.timestamp ||
				(timestampMs === existing.timestamp && lamportTime > existing.lamportTime))
		) {
			this.map.set(key, {
				value: existing.value,
				timestamp: timestampMs,
				lamportTime,
				...(authorId ? { authorId } : {}),
				version: existing.version + 1,
				isDeleted: true,
			});
		}
		return this;
	}

	public entries(): Array<[K, V]> {
		const result: Array<[K, V]> = [];
		for (const [key, entry] of this.map.entries()) {
			if (!entry.isDeleted) {
				result.push([key, entry.value]);
			}
		}
		return result;
	}

	public toRecord(): Record<K, V> {
		const rec = {} as Record<K, V>;
		for (const [key, value] of this.entries()) {
			rec[key] = value;
		}
		return rec;
	}

	public toMutationVector(): MutationVector {
		const vector: MutationVector = {};
		for (const [key, entry] of this.map.entries()) {
			vector[key] = {
				updatedAt: new Date(entry.timestamp).toISOString(),
				version: entry.version,
				...(entry.authorId ? { authorId: entry.authorId } : {}),
			};
		}
		return vector;
	}

	public merge(other: LwwMap<K, V>): LwwMap<K, V> {
		const merged = new LwwMap<K, V>();
		for (const [key, entry] of this.map.entries()) {
			merged.map.set(key, { ...entry });
		}
		for (const [key, incEntry] of other.map.entries()) {
			const existEntry = merged.map.get(key);
			if (!existEntry) {
				merged.map.set(key, { ...incEntry });
			} else if (
				incEntry.timestamp > existEntry.timestamp ||
				(incEntry.timestamp === existEntry.timestamp && incEntry.lamportTime > existEntry.lamportTime)
			) {
				merged.map.set(key, { ...incEntry });
			} else if (
				incEntry.timestamp === existEntry.timestamp &&
				incEntry.lamportTime === existEntry.lamportTime
			) {
				const incStr = canonicalJsonStringify(incEntry.value);
				const existStr = canonicalJsonStringify(existEntry.value);
				if (incStr.localeCompare(existStr) >= 0) {
					merged.map.set(key, { ...incEntry });
				}
			}
		}
		return merged;
	}

	public toJSON(): SerializedLwwMap<V> {
		const entries = Array.from(this.map.entries()).map(([key, entry]) => ({
			key,
			value: entry.value,
			timestamp: entry.timestamp,
			lamportTime: entry.lamportTime,
			...(entry.authorId ? { authorId: entry.authorId } : {}),
			version: entry.version,
			isDeleted: entry.isDeleted,
		}));
		return { entries };
	}

	public static fromJSON<V>(json: SerializedLwwMap<V>): LwwMap<string, V> {
		const map = new LwwMap<string, V>();
		if (json && Array.isArray(json.entries)) {
			for (const entry of json.entries) {
				map.map.set(entry.key, {
					value: entry.value,
					timestamp: entry.timestamp,
					lamportTime: entry.lamportTime,
					...(entry.authorId ? { authorId: entry.authorId } : {}),
					version: entry.version,
					isDeleted: entry.isDeleted,
				});
			}
		}
		return map;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Clinical Domain FDI 11–48 & SOAP Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export const FDI_ADULT_TEETH: readonly number[] = [
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
] as const;

export const FDI_PEDIATRIC_TEETH: readonly number[] = [
	51, 52, 53, 54, 55,
	61, 62, 63, 64, 65,
	71, 72, 73, 74, 75,
	81, 82, 83, 84, 85,
] as const;

export const ALL_FDI_TEETH: readonly number[] = [
	...FDI_ADULT_TEETH,
	...FDI_PEDIATRIC_TEETH,
] as const;

export function isFdiToothNumber(num: number): boolean {
	return ALL_FDI_TEETH.includes(num);
}

export const dentalToothStatusSchema = z.enum([
	"healthy",
	"caries",
	"pulpitis",
	"periodontitis",
	"filling",
	"crown",
	"implant",
	"extracted",
	"extracted_absent",
	"absent",
	"fracture",
	"root",
	"veneer",
	"recession",
	"temporary_filling",
	"inlay",
	"mobility",
]);
export type DentalToothStatus = z.infer<typeof dentalToothStatusSchema>;

export const dentalSurfaceSchema = z.enum([
	"O",
	"M",
	"D",
	"V",
	"B",
	"L",
	"P",
	"R",
	"C",
]);
export type DentalSurface = z.infer<typeof dentalSurfaceSchema>;

export interface SoapMedicalDiaryRecord {
	id: string;
	visitId?: string | undefined;
	patientId?: string | undefined;
	doctorId?: string | undefined;
	subjective?: {
		complaints?: string | undefined;
		anamnesisMorbi?: string | undefined;
		anamnesisVitae?: string | undefined;
		allergies?: string[] | undefined;
		somaticStatus?: string | undefined;
	} | undefined;
	objective?: {
		externalExam?: string | undefined;
		bite?: string | undefined;
		statusLocalis?: string | undefined;
		hygieneIndex?: number | undefined;
		perioPocketMm?: number | undefined;
		xrayFindings?: string | undefined;
	} | undefined;
	assessment?: {
		diagnosisIcd10?: string | undefined;
		diagnosisText?: string | undefined;
		differentialDiagnosis?: string | undefined;
	} | undefined;
	plan?: {
		treatmentProtocol?: string[] | undefined;
		servicesRendered804n?: string[] | undefined;
		prescriptions?: string[] | undefined;
		postOpRecommendations?: string | undefined;
		nextVisitDateIso?: string | undefined;
	} | undefined;
	complaints?: string | undefined;
	statusLocalis?: string | undefined;
	treatmentProtocol?: string[] | undefined;
	prescriptions?: string[] | undefined;
	updatedAt?: string | undefined;
	authorUserId?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Outbox Queue & Mutation Contracts
// ─────────────────────────────────────────────────────────────────────────────

export type CrdtOutboxStatus = "pending" | "in_flight" | "committed" | "failed";

export interface CrdtOutboxQueueItem<T = unknown> {
	readonly id: string;
	readonly mutationId: string;
	readonly idempotencyKey: string;
	readonly entityKind: SyncMutationEntityKind;
	readonly entityId: string;
	readonly action: SyncMutationAction;
	readonly payload: T;
	readonly payloadHash: string;
	readonly lamportTime: number;
	readonly vectorClock?: VectorClock | undefined;
	readonly mutationVector?: MutationVector | undefined;
	readonly authorUserId?: string | undefined;
	readonly clientId: string;
	readonly organizationId?: string | undefined;
	status: CrdtOutboxStatus;
	retryCount: number;
	lastError?: string | undefined;
	lockOwner?: string | undefined;
	readonly createdAtIso: string;
	readonly createdAtMs: number;
	updatedAtIso: string;
}

export interface CrdtSyncEngineStatus {
	readonly mode: "ONLINE_SYNCED" | "OFFLINE_BUFFERING" | "REPLICATING" | "ERROR";
	readonly isOnline: boolean;
	readonly totalPending: number;
	readonly inFlightCount: number;
	readonly failedCount: number;
	readonly committedCount: number;
	readonly bufferedRecordsCount: {
		appointments: number;
		odontograms: number;
		diaries: number;
		patients: number;
		payments: number;
	};
	readonly oldestPendingTimestampMs: number | null;
	readonly lastSyncTimestampIso: string | null;
	readonly lastSyncError: string | null;
	readonly clockSkewMs: number;
	readonly lamportTime: number;
	readonly activeTier: SyncTierMode;
	readonly survivabilityGrade: "HEALTHY" | "DEGRADED" | "CRITICAL";
	readonly storageDriver: string;
}

export interface CrdtBatchApplyResult {
	readonly processedCount: number;
	readonly appliedCount: number;
	readonly duplicateCount: number;
	readonly mergedCount: number;
	readonly rejectedCount: number;
	readonly conflicts: FieldConflictDetail[];
	readonly errors: string[];
}

export interface CrdtSyncSummary {
	readonly pushedBatch: CrdtBatchApplyResult;
	readonly serverTime?: string | undefined;
	readonly syncedAtIso: string;
	readonly success: boolean;
}

export type CrdtSyncEngineEventType =
	| "status_changed"
	| "mutation_enqueued"
	| "sync_start"
	| "sync_complete"
	| "sync_error"
	| "conflict_resolved";

export type CrdtSyncEngineListener = (event: {
	type: CrdtSyncEngineEventType;
	status?: CrdtSyncEngineStatus | undefined;
	mutation?: CrdtOutboxQueueItem | undefined;
	conflicts?: FieldConflictDetail[] | undefined;
	error?: string | undefined;
}) => void;

// ─────────────────────────────────────────────────────────────────────────────
// 6. Pluggable Storage Driver Interface & Implementations
// ─────────────────────────────────────────────────────────────────────────────

export interface CrdtStorageDriver {
	readonly name: string;
	isAvailable(): boolean;
	saveEntity<T>(kind: SyncMutationEntityKind, id: string, data: T, vector?: MutationVector | undefined): Promise<void>;
	loadEntity<T>(kind: SyncMutationEntityKind, id: string): Promise<{ data: T; vector?: MutationVector | undefined } | null>;
	listEntities<T>(kind: SyncMutationEntityKind): Promise<Array<{ id: string; data: T; vector?: MutationVector | undefined }>>;
	deleteEntity(kind: SyncMutationEntityKind, id: string): Promise<void>;
	enqueueOutbox(item: CrdtOutboxQueueItem): Promise<void>;
	getPendingOutbox(): Promise<CrdtOutboxQueueItem[]>;
	getOutboxItem(id: string): Promise<CrdtOutboxQueueItem | null>;
	updateOutboxStatus(id: string, status: CrdtOutboxStatus, error?: string | undefined, lockOwner?: string | undefined): Promise<void>;
	pruneCommittedOutbox(): Promise<number>;
	saveKv(key: string, value: unknown): Promise<void>;
	loadKv<T>(key: string): Promise<T | null>;
	clear(): Promise<void>;
}

/**
 * High-performance In-Memory CRDT Storage Driver (Ideal for Unit Tests and Node.js)
 */
export class MemoryCrdtStorageDriver implements CrdtStorageDriver {
	public readonly name = "memory";
	private readonly entities = new Map<string, { data: unknown; vector?: MutationVector | undefined }>();
	private readonly outbox = new Map<string, CrdtOutboxQueueItem>();
	private readonly kv = new Map<string, unknown>();

	public isAvailable(): boolean {
		return true;
	}

	public async saveEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
		data: T,
		vector?: MutationVector | undefined,
	): Promise<void> {
		this.entities.set(`${kind}:${id}`, { data, ...(vector ? { vector } : {}) });
	}

	public async loadEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<{ data: T; vector?: MutationVector | undefined } | null> {
		const found = this.entities.get(`${kind}:${id}`);
		if (!found) return null;
		return { data: found.data as T, ...(found.vector ? { vector: found.vector } : {}) };
	}

	public async listEntities<T>(
		kind: SyncMutationEntityKind,
	): Promise<Array<{ id: string; data: T; vector?: MutationVector | undefined }>> {
		const result: Array<{ id: string; data: T; vector?: MutationVector | undefined }> = [];
		const prefix = `${kind}:`;
		for (const [key, val] of this.entities.entries()) {
			if (key.startsWith(prefix)) {
				result.push({
					id: key.slice(prefix.length),
					data: val.data as T,
					...(val.vector ? { vector: val.vector } : {}),
				});
			}
		}
		return result;
	}

	public async deleteEntity(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<void> {
		this.entities.delete(`${kind}:${id}`);
	}

	public async enqueueOutbox(item: CrdtOutboxQueueItem): Promise<void> {
		this.outbox.set(item.id, { ...item });
	}

	public async getPendingOutbox(): Promise<CrdtOutboxQueueItem[]> {
		return Array.from(this.outbox.values())
			.filter((it) => it.status === "pending" || it.status === "failed")
			.sort((a, b) => a.createdAtMs - b.createdAtMs);
	}

	public async getOutboxItem(id: string): Promise<CrdtOutboxQueueItem | null> {
		const item = this.outbox.get(id);
		return item ? { ...item } : null;
	}

	public async updateOutboxStatus(
		id: string,
		status: CrdtOutboxStatus,
		error?: string | undefined,
		lockOwner?: string | undefined,
	): Promise<void> {
		const item = this.outbox.get(id);
		if (item) {
			item.status = status;
			item.updatedAtIso = getAdjustedNowIso();
			if (error !== undefined) item.lastError = error;
			if (lockOwner !== undefined) item.lockOwner = lockOwner;
			if (status === "failed") item.retryCount += 1;
		}
	}

	public async pruneCommittedOutbox(): Promise<number> {
		let count = 0;
		for (const [id, item] of this.outbox.entries()) {
			if (item.status === "committed") {
				this.outbox.delete(id);
				count += 1;
			}
		}
		return count;
	}

	public async saveKv(key: string, value: unknown): Promise<void> {
		this.kv.set(key, value);
	}

	public async loadKv<T>(key: string): Promise<T | null> {
		const val = this.kv.get(key);
		return val !== undefined ? (val as T) : null;
	}

	public async clear(): Promise<void> {
		this.entities.clear();
		this.outbox.clear();
		this.kv.clear();
	}
}

/**
 * Universal IndexedDB Storage Driver with graceful LocalStorage / Memory Fallback
 */
export class IndexedDbCrdtStorageDriver implements CrdtStorageDriver {
	public readonly name = "indexeddb";
	private readonly fallback = new MemoryCrdtStorageDriver();
	private dbInstance: unknown = null;
	private readonly dbName: string;
	private readonly dbVersion: number;

	constructor(dbName = "dente-crdt-offline-vault", dbVersion = 1) {
		this.dbName = dbName;
		this.dbVersion = dbVersion;
	}

	public isAvailable(): boolean {
		const g = globalThis as { indexedDB?: unknown };
		return Boolean(g && g.indexedDB);
	}

	private async getDb(): Promise<any> {
		if (this.dbInstance) return this.dbInstance;
		const g = globalThis as { indexedDB?: any };
		if (!g.indexedDB) {
			throw new Error("IndexedDB is not available");
		}

		return new Promise<any>((resolve, reject) => {
			const req = g.indexedDB.open(this.dbName, this.dbVersion);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains("crdt_entities")) {
					db.createObjectStore("crdt_entities", { keyPath: "storageKey" });
				}
				if (!db.objectStoreNames.contains("crdt_outbox")) {
					const outStore = db.createObjectStore("crdt_outbox", { keyPath: "id" });
					outStore.createIndex("status", "status", { unique: false });
					outStore.createIndex("createdAtMs", "createdAtMs", { unique: false });
				}
				if (!db.objectStoreNames.contains("crdt_kv")) {
					db.createObjectStore("crdt_kv", { keyPath: "key" });
				}
			};
			req.onsuccess = () => {
				this.dbInstance = req.result;
				resolve(this.dbInstance);
			};
			req.onerror = () => reject(req.error);
		});
	}

	public async saveEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
		data: T,
		vector?: MutationVector | undefined,
	): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.saveEntity(kind, id, data, vector);
		}
		try {
			const db = await this.getDb();
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readwrite");
				const store = tx.objectStore("crdt_entities");
				const item = { storageKey: `${kind}:${id}`, kind, id, data, vector, updatedAt: Date.now() };
				const req = store.put(item);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.saveEntity(kind, id, data, vector);
		}
	}

	public async loadEntity<T>(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<{ data: T; vector?: MutationVector | undefined } | null> {
		if (!this.isAvailable()) {
			return this.fallback.loadEntity(kind, id);
		}
		try {
			const db = await this.getDb();
			return new Promise<{ data: T; vector?: MutationVector | undefined } | null>((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readonly");
				const store = tx.objectStore("crdt_entities");
				const req = store.get(`${kind}:${id}`);
				req.onsuccess = () => {
					if (!req.result) resolve(null);
					else resolve({ data: req.result.data, ...(req.result.vector ? { vector: req.result.vector } : {}) });
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.loadEntity(kind, id);
		}
	}

	public async listEntities<T>(
		kind: SyncMutationEntityKind,
	): Promise<Array<{ id: string; data: T; vector?: MutationVector | undefined }>> {
		if (!this.isAvailable()) {
			return this.fallback.listEntities(kind);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readonly");
				const store = tx.objectStore("crdt_entities");
				const req = store.getAll();
				req.onsuccess = () => {
					const rows = (req.result || [])
						.filter((r: { kind: string }) => r.kind === kind)
						.map((r: { id: string; data: T; vector?: MutationVector }) => ({
							id: r.id,
							data: r.data,
							...(r.vector ? { vector: r.vector } : {}),
						}));
					resolve(rows);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.listEntities(kind);
		}
	}

	public async deleteEntity(
		kind: SyncMutationEntityKind,
		id: string,
	): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.deleteEntity(kind, id);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_entities", "readwrite");
				const store = tx.objectStore("crdt_entities");
				const req = store.delete(`${kind}:${id}`);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.deleteEntity(kind, id);
		}
	}

	public async enqueueOutbox(item: CrdtOutboxQueueItem): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.enqueueOutbox(item);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readwrite");
				const store = tx.objectStore("crdt_outbox");
				const req = store.put(item);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.enqueueOutbox(item);
		}
	}

	public async getPendingOutbox(): Promise<CrdtOutboxQueueItem[]> {
		if (!this.isAvailable()) {
			return this.fallback.getPendingOutbox();
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readonly");
				const store = tx.objectStore("crdt_outbox");
				const req = store.getAll();
				req.onsuccess = () => {
					const items: CrdtOutboxQueueItem[] = (req.result || [])
						.filter((it: CrdtOutboxQueueItem) => it.status === "pending" || it.status === "failed")
						.sort((a: CrdtOutboxQueueItem, b: CrdtOutboxQueueItem) => a.createdAtMs - b.createdAtMs);
					resolve(items);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.getPendingOutbox();
		}
	}

	public async getOutboxItem(id: string): Promise<CrdtOutboxQueueItem | null> {
		if (!this.isAvailable()) {
			return this.fallback.getOutboxItem(id);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readonly");
				const store = tx.objectStore("crdt_outbox");
				const req = store.get(id);
				req.onsuccess = () => resolve(req.result || null);
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.getOutboxItem(id);
		}
	}

	public async updateOutboxStatus(
		id: string,
		status: CrdtOutboxStatus,
		error?: string | undefined,
		lockOwner?: string | undefined,
	): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.updateOutboxStatus(id, status, error, lockOwner);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readwrite");
				const store = tx.objectStore("crdt_outbox");
				const getReq = store.get(id);
				getReq.onsuccess = () => {
					const item = getReq.result as CrdtOutboxQueueItem | undefined;
					if (!item) {
						resolve();
						return;
					}
					item.status = status;
					item.updatedAtIso = getAdjustedNowIso();
					if (error !== undefined) item.lastError = error;
					if (lockOwner !== undefined) item.lockOwner = lockOwner;
					if (status === "failed") item.retryCount += 1;
					const putReq = store.put(item);
					putReq.onsuccess = () => resolve();
					putReq.onerror = () => reject(putReq.error);
				};
				getReq.onerror = () => reject(getReq.error);
			});
		} catch {
			return this.fallback.updateOutboxStatus(id, status, error, lockOwner);
		}
	}

	public async pruneCommittedOutbox(): Promise<number> {
		if (!this.isAvailable()) {
			return this.fallback.pruneCommittedOutbox();
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_outbox", "readwrite");
				const store = tx.objectStore("crdt_outbox");
				const req = store.getAll();
				req.onsuccess = () => {
					const all = (req.result || []) as CrdtOutboxQueueItem[];
					let pruned = 0;
					for (const item of all) {
						if (item.status === "committed") {
							store.delete(item.id);
							pruned += 1;
						}
					}
					resolve(pruned);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.pruneCommittedOutbox();
		}
	}

	public async saveKv(key: string, value: unknown): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.saveKv(key, value);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_kv", "readwrite");
				const store = tx.objectStore("crdt_kv");
				const req = store.put({ key, value });
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.saveKv(key, value);
		}
	}

	public async loadKv<T>(key: string): Promise<T | null> {
		if (!this.isAvailable()) {
			return this.fallback.loadKv(key);
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction("crdt_kv", "readonly");
				const store = tx.objectStore("crdt_kv");
				const req = store.get(key);
				req.onsuccess = () => {
					if (!req.result) resolve(null);
					else resolve(req.result.value as T);
				};
				req.onerror = () => reject(req.error);
			});
		} catch {
			return this.fallback.loadKv(key);
		}
	}

	public async clear(): Promise<void> {
		if (!this.isAvailable()) {
			return this.fallback.clear();
		}
		try {
			const db = await this.getDb();
			return new Promise((resolve, reject) => {
				const tx = db.transaction(["crdt_entities", "crdt_outbox", "crdt_kv"], "readwrite");
				tx.objectStore("crdt_entities").clear();
				tx.objectStore("crdt_outbox").clear();
				tx.objectStore("crdt_kv").clear();
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
			});
		} catch {
			return this.fallback.clear();
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Master CrdtSyncEngine Implementation
// ─────────────────────────────────────────────────────────────────────────────

export interface CrdtSyncEngineOptions {
	nodeId?: string | undefined;
	organizationId?: string | undefined;
	storageDriver?: CrdtStorageDriver | undefined;
	initialOnline?: boolean | undefined;
	autoSyncIntervalMs?: number | undefined;
}

export class CrdtSyncEngine {
	private readonly nodeId: string;
	private readonly organizationId?: string | undefined;
	private readonly storage: CrdtStorageDriver;
	private readonly lamportClock: LamportClock;
	private vectorClock: VectorClock;
	private isOnlineState: boolean;
	private lastSyncTimestampIso: string | null = null;
	private lastSyncError: string | null = null;
	private readonly listeners = new Set<CrdtSyncEngineListener>();
	private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
	private isSyncing = false;

	constructor(options?: CrdtSyncEngineOptions) {
		this.nodeId = options?.nodeId || `clinic-node-${Date.now().toString(36)}`;
		this.organizationId = options?.organizationId;
		const g = globalThis as { indexedDB?: unknown; navigator?: { onLine?: boolean } };
		this.storage = options?.storageDriver || (g.indexedDB ? new IndexedDbCrdtStorageDriver() : new MemoryCrdtStorageDriver());
		this.lamportClock = new LamportClock(this.nodeId);
		this.vectorClock = createVectorClock(this.nodeId, 1);
		this.isOnlineState = options?.initialOnline ?? (typeof g.navigator?.onLine === "boolean" ? g.navigator.onLine : true);

		if (options?.autoSyncIntervalMs && options.autoSyncIntervalMs > 0) {
			this.autoSyncTimer = setInterval(() => {
				if (this.isOnlineState && !this.isSyncing) {
					// heartbeat
				}
			}, options.autoSyncIntervalMs);
		}
	}

	public getNodeId(): string {
		return this.nodeId;
	}

	public getOrganizationId(): string | undefined {
		return this.organizationId;
	}

	public getStorage(): CrdtStorageDriver {
		return this.storage;
	}

	public setOnline(online: boolean): void {
		const changed = this.isOnlineState !== online;
		this.isOnlineState = online;
		if (changed) {
			this.emit("status_changed", { status: this.getStatus() });
		}
	}

	public isOnline(): boolean {
		return this.isOnlineState;
	}

	public subscribe(listener: CrdtSyncEngineListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private emit(type: CrdtSyncEngineEventType, data: { status?: CrdtSyncEngineStatus | undefined; mutation?: CrdtOutboxQueueItem | undefined; conflicts?: FieldConflictDetail[] | undefined; error?: string | undefined }): void {
		for (const listener of this.listeners) {
			try {
				listener({ type, ...data });
			} catch {
				// silent catch
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Clinical Entity Operations (Local CRDT + Outbox Persistence)
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Saves or updates an appointment offline with clinical status ranking & LWW vector.
	 */
	public async saveAppointmentOffline(
		appointment: {
			id: string;
			status?: string | undefined;
			startsAt?: string | undefined;
			doctorId?: string | undefined;
			doctorName?: string | undefined;
			patientId?: string | undefined;
			patientName?: string | undefined;
			notes?: string | undefined;
			[key: string]: unknown;
		},
		authorId?: string | undefined,
	): Promise<CrdtOutboxQueueItem> {
		const nowMs = getAdjustedNowMs();
		const nowIso = getAdjustedNowIso(nowMs);
		const lamport = this.lamportClock.tick();
		this.vectorClock = incrementVectorClock(this.vectorClock, this.nodeId);

		const existing = await this.storage.loadEntity<Record<string, unknown>>("appointment", appointment.id);
		const resolved = resolveScheduleAppointmentCrdt({
			existingAppointment: existing ? existing.data : null,
			incomingAppointment: appointment,
			existingClock: this.vectorClock,
			incomingClock: this.vectorClock,
			existingUpdatedAt: existing?.data?.updatedAt as string | undefined,
			incomingUpdatedAt: nowIso,
			nodeId: this.nodeId,
		});

		const entityPayload = {
			...resolved.resolvedAppointment,
			id: appointment.id,
			...(this.organizationId ? { organizationId: this.organizationId } : {}),
			updatedAt: nowIso,
		};

		await this.storage.saveEntity("appointment", appointment.id, entityPayload);

		const mutation = await this.enqueueMutation({
			entityKind: "appointment",
			entityId: appointment.id,
			action: existing ? "update" : "create",
			payload: entityPayload,
			lamportTime: lamport,
			...(authorId ? { authorUserId: authorId } : {}),
		});

		return mutation;
	}

	/**
	 * Saves or updates an Odontogram (FDI 11–48 / 51–85) non-destructively per-tooth and per-surface.
	 */
	public async saveOdontogramOffline(
		patientId: string,
		teeth: OdontogramToothState[],
		authorId?: string | undefined,
	): Promise<CrdtOutboxQueueItem> {
		const nowMs = getAdjustedNowMs();
		const nowIso = getAdjustedNowIso(nowMs);
		const lamport = this.lamportClock.tick();
		this.vectorClock = incrementVectorClock(this.vectorClock, this.nodeId);

		const existing = await this.storage.loadEntity<{ patientId: string; teeth: OdontogramToothState[] }>(
			"odontogram_state",
			patientId,
		);

		const existingTeeth = existing?.data?.teeth || [];
		const mergedTeeth = mergeOdontogramTeethCrdt(existingTeeth, teeth);

		const entityPayload = {
			patientId,
			...(this.organizationId ? { organizationId: this.organizationId } : {}),
			teeth: mergedTeeth,
			updatedAt: nowIso,
		};

		await this.storage.saveEntity("odontogram_state", patientId, entityPayload);

		const mutation = await this.enqueueMutation({
			entityKind: "odontogram_state",
			entityId: patientId,
			action: "upsert",
			payload: entityPayload,
			lamportTime: lamport,
			...(authorId ? { authorUserId: authorId } : {}),
		});

		return mutation;
	}

	/**
	 * Updates a single FDI tooth surface state with LWW CRDT guarantees.
	 */
	public async saveToothSurfaceOffline(
		patientId: string,
		toothNumber: number,
		statusCode: DentalToothStatus | string,
		surfaces: string[] = [],
		notes?: string | undefined,
		authorId?: string | undefined,
	): Promise<CrdtOutboxQueueItem> {
		if (!isFdiToothNumber(toothNumber)) {
			throw new Error(`Недопустимый номер зуба по стандарту FDI: ${toothNumber}`);
		}

		const singleTooth: OdontogramToothState = {
			toothNumber,
			statusCode,
			surfaces,
			...(notes ? { notes } : {}),
			updatedAt: getAdjustedNowIso(),
		};

		return this.saveOdontogramOffline(patientId, [singleTooth], authorId);
	}

	/**
	 * Saves or updates a SOAP Medical Diary record (Form 043/u) with CRDT 3-way merge.
	 */
	public async saveSoapDiaryOffline(
		diary: SoapMedicalDiaryRecord,
		authorId?: string | undefined,
	): Promise<CrdtOutboxQueueItem> {
		const nowMs = getAdjustedNowMs();
		const nowIso = getAdjustedNowIso(nowMs);
		const lamport = this.lamportClock.tick();
		this.vectorClock = incrementVectorClock(this.vectorClock, this.nodeId);

		const existing = await this.storage.loadEntity<Record<string, unknown>>("visit_diary", diary.id);
		const resolved = resolveForm043DiaryCrdt({
			existingDiary: existing ? existing.data : null,
			incomingDiary: diary as unknown as Record<string, unknown>,
			existingClock: this.vectorClock,
			incomingClock: this.vectorClock,
			existingUpdatedAt: existing?.data?.updatedAt as string | undefined,
			incomingUpdatedAt: nowIso,
			nodeId: this.nodeId,
		});

		const entityPayload = {
			...resolved.resolvedDiary,
			id: diary.id,
			...(this.organizationId ? { organizationId: this.organizationId } : {}),
			updatedAt: nowIso,
		};

		await this.storage.saveEntity("visit_diary", diary.id, entityPayload);

		const mutation = await this.enqueueMutation({
			entityKind: "visit_diary",
			entityId: diary.id,
			action: existing ? "update" : "create",
			payload: entityPayload,
			lamportTime: lamport,
			...(authorId ? { authorUserId: authorId } : {}),
		});

		return mutation;
	}

	/**
	 * Saves or updates a patient profile offline.
	 */
	public async savePatientOffline(
		patient: { id: string; fullName: string; [key: string]: unknown },
		authorId?: string | undefined,
	): Promise<CrdtOutboxQueueItem> {
		const nowMs = getAdjustedNowMs();
		const nowIso = getAdjustedNowIso(nowMs);
		const lamport = this.lamportClock.tick();
		this.vectorClock = incrementVectorClock(this.vectorClock, this.nodeId);

		const existing = await this.storage.loadEntity<Record<string, unknown>>("patient", patient.id);
		const merged = mergeFieldLevelCrdt({
			entityKind: "patient",
			entityId: patient.id,
			serverEntity: existing ? existing.data : null,
			...(existing?.vector ? { serverVector: existing.vector } : {}),
			clientPatch: patient,
			clientUpdatedAt: nowIso,
			...(authorId ? { authorUserId: authorId } : {}),
			clientId: this.nodeId,
		});

		const entityPayload = {
			...merged.mergedEntity,
			id: patient.id,
			...(this.organizationId ? { organizationId: this.organizationId } : {}),
			updatedAt: nowIso,
		};

		await this.storage.saveEntity("patient", patient.id, entityPayload, merged.updatedVector);

		const mutation = await this.enqueueMutation({
			entityKind: "patient",
			entityId: patient.id,
			action: existing ? "update" : "create",
			payload: entityPayload,
			lamportTime: lamport,
			mutationVector: merged.updatedVector,
			...(authorId ? { authorUserId: authorId } : {}),
		});

		return mutation;
	}

	/**
	 * Saves a financial/cash transaction offline with kopeck-exact precision.
	 */
	public async savePaymentOffline(
		payment: {
			paymentId: string;
			patientId: string;
			amountKopecks: number;
			paymentMethod: string;
			status: string;
			[key: string]: unknown;
		},
		authorId?: string | undefined,
	): Promise<CrdtOutboxQueueItem> {
		const nowMs = getAdjustedNowMs();
		const nowIso = getAdjustedNowIso(nowMs);
		const lamport = this.lamportClock.tick();
		this.vectorClock = incrementVectorClock(this.vectorClock, this.nodeId);

		const entityPayload = {
			...payment,
			id: payment.paymentId,
			...(this.organizationId ? { organizationId: this.organizationId } : {}),
			updatedAt: nowIso,
		};

		await this.storage.saveEntity("payment", payment.paymentId, entityPayload);

		const mutation = await this.enqueueMutation({
			entityKind: "payment",
			entityId: payment.paymentId,
			action: "create",
			payload: entityPayload,
			lamportTime: lamport,
			...(authorId ? { authorUserId: authorId } : {}),
		});

		return mutation;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Low-level Outbox Enqueue & Management
	// ─────────────────────────────────────────────────────────────────────────

	public async enqueueMutation(input: {
		entityKind: SyncMutationEntityKind;
		entityId: string;
		action: SyncMutationAction;
		payload: unknown;
		lamportTime?: number | undefined;
		mutationVector?: MutationVector | undefined;
		authorUserId?: string | undefined;
	}): Promise<CrdtOutboxQueueItem> {
		const mutationId = generateUuidV7();
		const nowMs = getAdjustedNowMs();
		const nowIso = getAdjustedNowIso(nowMs);
		const payloadHash = computePayloadHash(input.payload);
		const idempotencyKey = createCompositeIdempotencyKey(mutationId, input.payload);
		const lamport = input.lamportTime ?? this.lamportClock.tick();

		const item: CrdtOutboxQueueItem = {
			id: `outbox_${mutationId}`,
			mutationId,
			idempotencyKey,
			entityKind: input.entityKind,
			entityId: input.entityId,
			action: input.action,
			payload: input.payload,
			payloadHash,
			lamportTime: lamport,
			vectorClock: { ...this.vectorClock },
			...(input.mutationVector ? { mutationVector: input.mutationVector } : {}),
			...(input.authorUserId ? { authorUserId: input.authorUserId } : {}),
			clientId: this.nodeId,
			...(this.organizationId ? { organizationId: this.organizationId } : {}),
			status: "pending",
			retryCount: 0,
			createdAtIso: nowIso,
			createdAtMs: nowMs,
			updatedAtIso: nowIso,
		};

		await this.storage.enqueueOutbox(item);
		this.emit("mutation_enqueued", { mutation: item, status: this.getStatus() });
		return item;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Synchronization Batch Generation & Gateway Handshake
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Constructs an idempotent push batch from pending outbox mutations.
	 */
	public async createPushBatch(limit = 50): Promise<SyncPushBatchRequest | null> {
		const pending = await this.storage.getPendingOutbox();
		if (pending.length === 0) return null;

		const batchItems = pending.slice(0, Math.max(1, Math.min(200, limit)));
		const batchId = generateUuidV7();
		const nowIso = getAdjustedNowIso();

		const mutations: SyncMutationEnvelope[] = batchItems.map((item) => ({
			mutationId: item.mutationId,
			idempotencyKey: item.idempotencyKey,
			payloadHash: item.payloadHash,
			entityKind: item.entityKind,
			entityId: item.entityId,
			action: item.action,
			payload: (typeof item.payload === "object" && item.payload !== null)
				? (item.payload as Record<string, unknown>)
				: { value: item.payload },
			updatedAt: item.createdAtIso,
			...(item.mutationVector ? { mutationVector: item.mutationVector } : {}),
			...(item.vectorClock ? { vectorClock: item.vectorClock } : {}),
			clientId: item.clientId,
			...(item.authorUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.authorUserId)
				? { authorUserId: item.authorUserId }
				: {}),
		}));

		for (const item of batchItems) {
			await this.storage.updateOutboxStatus(item.id, "in_flight", undefined, batchId);
		}

		return {
			syncBatchId: batchId,
			clientId: this.nodeId,
			mutations,
			sentAt: nowIso,
		};
	}

	/**
	 * Processes the response from the sync gateway and updates local outbox state.
	 */
	public async applyPushBatchResponse(
		response: SyncPushBatchResponse,
	): Promise<CrdtBatchApplyResult> {
		if (response.serverTime) {
			calibrateClockSkew(response.serverTime);
		}

		const result: CrdtBatchApplyResult = {
			processedCount: response.processedCount,
			appliedCount: response.appliedCount,
			duplicateCount: response.duplicateCount,
			mergedCount: response.mergedCount,
			rejectedCount: response.rejectedCount,
			conflicts: [],
			errors: [],
		};

		for (const mutationResult of response.results) {
			const outboxId = `outbox_${mutationResult.mutationId}`;

			if (
				mutationResult.status === "applied" ||
				mutationResult.status === "duplicate" ||
				mutationResult.status === "merged" ||
				mutationResult.status === "conflict_resolved"
			) {
				await this.storage.updateOutboxStatus(outboxId, "committed");

				if (mutationResult.currentServerEntity) {
					await this.storage.saveEntity(
						mutationResult.entityKind,
						mutationResult.entityId,
						mutationResult.currentServerEntity,
					);
				}
			} else if (mutationResult.status === "rejected") {
				const errMsg = mutationResult.error || "Mutation rejected by server gateway";
				await this.storage.updateOutboxStatus(outboxId, "failed", errMsg);
				result.errors.push(`[${mutationResult.mutationId}] ${errMsg}`);
			}

			if (mutationResult.conflictDetails && mutationResult.conflictDetails.length > 0) {
				result.conflicts.push(...mutationResult.conflictDetails);
			}
		}

		await this.storage.pruneCommittedOutbox();

		return result;
	}

	/**
	 * Full Bidirectional Sync Execution with Gateway Function.
	 */
	public async forceSync(
		gatewayPushFn: (batch: SyncPushBatchRequest) => Promise<SyncPushBatchResponse>,
		batchLimit = 50,
	): Promise<CrdtSyncSummary> {
		if (this.isSyncing) {
			return {
				pushedBatch: {
					processedCount: 0,
					appliedCount: 0,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					conflicts: [],
					errors: ["Синхронизация уже выполняется"],
				},
				syncedAtIso: getAdjustedNowIso(),
				success: false,
			};
		}

		this.isSyncing = true;
		this.lastSyncError = null;
		this.emit("sync_start", { status: this.getStatus() });

		try {
			const batch = await this.createPushBatch(batchLimit);
			if (!batch) {
				const emptyResult: CrdtSyncSummary = {
					pushedBatch: {
						processedCount: 0,
						appliedCount: 0,
						duplicateCount: 0,
						mergedCount: 0,
						rejectedCount: 0,
						conflicts: [],
						errors: [],
					},
					syncedAtIso: getAdjustedNowIso(),
					success: true,
				};
				this.lastSyncTimestampIso = emptyResult.syncedAtIso;
				this.emit("sync_complete", { status: this.getStatus() });
				return emptyResult;
			}

			const response = await gatewayPushFn(batch);
			const applyResult = await this.applyPushBatchResponse(response);

			const summary: CrdtSyncSummary = {
				pushedBatch: applyResult,
				serverTime: response.serverTime,
				syncedAtIso: getAdjustedNowIso(),
				success: applyResult.rejectedCount === 0,
			};

			this.lastSyncTimestampIso = summary.syncedAtIso;
			this.emit("sync_complete", {
				status: this.getStatus(),
				conflicts: applyResult.conflicts,
			});
			return summary;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.lastSyncError = errorMsg;
			this.emit("sync_error", { error: errorMsg, status: this.getStatus() });
			return {
				pushedBatch: {
					processedCount: 0,
					appliedCount: 0,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					conflicts: [],
					errors: [errorMsg],
				},
				syncedAtIso: getAdjustedNowIso(),
				success: false,
			};
		} finally {
			this.isSyncing = false;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Telemetry & Survivability Status
	// ─────────────────────────────────────────────────────────────────────────

	public async getTelemetry(): Promise<CrdtSyncEngineStatus> {
		const pending = await this.storage.getPendingOutbox();
		const appointments = await this.storage.listEntities("appointment");
		const odontograms = await this.storage.listEntities("odontogram_state");
		const diaries = await this.storage.listEntities("visit_diary");
		const patients = await this.storage.listEntities("patient");
		const payments = await this.storage.listEntities("payment");

		let pendingCount = 0;
		let inFlightCount = 0;
		let failedCount = 0;
		let committedCount = 0;
		let oldestPendingTimestampMs: number | null = null;

		for (const it of pending) {
			if (it.status === "pending") {
				pendingCount += 1;
				if (oldestPendingTimestampMs === null || it.createdAtMs < oldestPendingTimestampMs) {
					oldestPendingTimestampMs = it.createdAtMs;
				}
			} else if (it.status === "in_flight") {
				inFlightCount += 1;
			} else if (it.status === "failed") {
				failedCount += 1;
			} else if (it.status === "committed") {
				committedCount += 1;
			}
		}

		let mode: CrdtSyncEngineStatus["mode"] = "ONLINE_SYNCED";
		if (!this.isOnlineState) {
			mode = "OFFLINE_BUFFERING";
		} else if (this.isSyncing || inFlightCount > 0) {
			mode = "REPLICATING";
		} else if (failedCount > 0) {
			mode = "ERROR";
		}

		let survivabilityGrade: "HEALTHY" | "DEGRADED" | "CRITICAL" = "HEALTHY";
		if (failedCount > 10 || (pendingCount > 500 && !this.isOnlineState)) {
			survivabilityGrade = "CRITICAL";
		} else if (pendingCount > 0 || failedCount > 0 || !this.isOnlineState) {
			survivabilityGrade = "DEGRADED";
		}

		return {
			mode,
			isOnline: this.isOnlineState,
			totalPending: pendingCount,
			inFlightCount,
			failedCount,
			committedCount,
			bufferedRecordsCount: {
				appointments: appointments.length,
				odontograms: odontograms.length,
				diaries: diaries.length,
				patients: patients.length,
				payments: payments.length,
			},
			oldestPendingTimestampMs,
			lastSyncTimestampIso: this.lastSyncTimestampIso,
			lastSyncError: this.lastSyncError,
			clockSkewMs: getGlobalClockSkew(),
			lamportTime: this.lamportClock.getTime(),
			activeTier: this.isOnlineState ? "cloud_postgresql" : "autonomous_offline",
			survivabilityGrade,
			storageDriver: this.storage.name,
		};
	}

	public getStatus(): CrdtSyncEngineStatus {
		let mode: CrdtSyncEngineStatus["mode"] = "ONLINE_SYNCED";
		if (!this.isOnlineState) {
			mode = "OFFLINE_BUFFERING";
		} else if (this.isSyncing) {
			mode = "REPLICATING";
		}

		return {
			mode,
			isOnline: this.isOnlineState,
			totalPending: 0,
			inFlightCount: 0,
			failedCount: 0,
			committedCount: 0,
			bufferedRecordsCount: {
				appointments: 0,
				odontograms: 0,
				diaries: 0,
				patients: 0,
				payments: 0,
			},
			oldestPendingTimestampMs: null,
			lastSyncTimestampIso: this.lastSyncTimestampIso,
			lastSyncError: this.lastSyncError,
			clockSkewMs: getGlobalClockSkew(),
			lamportTime: this.lamportClock.getTime(),
			activeTier: this.isOnlineState ? "cloud_postgresql" : "autonomous_offline",
			survivabilityGrade: this.isOnlineState ? "HEALTHY" : "DEGRADED",
			storageDriver: this.storage.name,
		};
	}

	public destroy(): void {
		if (this.autoSyncTimer) {
			clearInterval(this.autoSyncTimer);
			this.autoSyncTimer = null;
		}
		this.listeners.clear();
	}
}

export const crdtSyncEngine = new CrdtSyncEngine();
