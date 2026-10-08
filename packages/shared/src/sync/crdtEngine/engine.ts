/**
 * DENTE CRM — Offline CRDT Synchronization Engine: Core Engine Class
 * Layer 3: CrdtSyncEngine coordinator class and crdtSyncEngine default singleton.
 */

import {
	calibrateClockSkew,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	mergeFieldLevelCrdt,
} from "../crdt.js";
import {
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
} from "../hashing.js";
import {
	createVectorClock,
	incrementVectorClock,
	mergeOdontogramTeethCrdt,
	type OdontogramToothState,
	resolveForm043DiaryCrdt,
	resolveScheduleAppointmentCrdt,
} from "../mesh.js";
import type {
	CrdtBatchApplyResult,
	CrdtOutboxQueueItem,
	CrdtStorageDriver,
	CrdtSyncEngineEventType,
	CrdtSyncEngineListener,
	CrdtSyncEngineOptions,
	CrdtSyncEngineStatus,
	CrdtSyncSummary,
	DentalToothStatus,
	FieldConflictDetail,
	MutationVector,
	SoapMedicalDiaryRecord,
	SyncMutationAction,
	SyncMutationEntityKind,
	SyncMutationEnvelope,
	SyncPushBatchRequest,
	SyncPushBatchResponse,
	VectorClock,
} from "./types.js";
import { LamportClock } from "./lamportClock.js";
import { MemoryCrdtStorageDriver, IndexedDbCrdtStorageDriver } from "./storageDrivers.js";
import { isFdiToothNumber } from "./fdiTeeth.js";

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
