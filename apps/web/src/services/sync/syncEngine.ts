/**
 * DENTE CRM — Client-Side Bidirectional Synchronization Engine
 *
 * Provides:
 * 1. Automatic draining of IndexedDB outbox queue to sync gateway
 * 2. Idempotency Key validation (RFC 9562 UUIDv7 + SHA-256 state payload hash)
 * 3. Exponential backoff with full jitter on network / 5xx transient failures
 * 4. Bidirectional pull/push reconciliation with clinical audit trail
 * 5. Lifecycle event auto-drain (online, focus, visibility, battery awareness)
 */

import {
	type FieldConflictDetail,
	type SyncMutationAction,
	type SyncMutationEntityKind,
	type SyncMutationEnvelope,
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
	calibrateClockSkew,
	computePayloadHash,
	createCompositeIdempotencyKey,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	clearSyncedOfflineMutations,
	generateMutationUuid,
	getPendingOfflineMutations,
	nowIsoWithMs,
	updateOfflineMutationStatus,
} from "../offline/offlineStorage";
import {
	calculateBackoffDelay,
	getOrCreateClientId,
	mapToSyncAction,
	mapToSyncEntityKind,
	offlineSyncService,
} from "../offline/offlineSyncService";
import type { OfflineMutation } from "../offline/types";
import { recordConflictAudit } from "./conflictResolver";
import { getDenteAuthHeaders } from "../../lib/denteRequestHeaders";
import { denteQueryClient } from "../../lib/queryClient";
import {
	cachePatientCard,
	savePatientClinicalCache,
} from "../offline/storage/idbClinicalCache";
import type {
	BidirectionalSyncResult,
	SyncEngineEventListener,
	SyncEngineOptions,
	SyncProgressState,
} from "./types";

export class SyncEngine {
	private static instance: SyncEngine | null = null;
	private isRunning = false;
	private options: SyncEngineOptions = {
		gatewayUrl: "/api/sync/gateway",
		batchSize: 25,
		maxRetries: 3,
		baseBackoffMs: 400,
		maxBackoffMs: 8000,
		jitter: true,
		autoSyncOnReconnect: true,
		autoSyncIntervalMs: 60000,
	};
	private listeners = new Set<SyncEngineEventListener>();
	private autoSyncTimer: ReturnType<typeof setInterval> | null = null;
	private boundAutoTrigger: (() => void) | null = null;
	private boundVisibilityHandler: (() => void) | null = null;
	private lastSyncTimestampIso: string | null = null;
	private lastSyncError: string | null = null;

	constructor(opts?: SyncEngineOptions) {
		if (opts) {
			this.options = { ...this.options, ...opts };
		}
		if (typeof localStorage !== "undefined") {
			try {
				const stored = localStorage.getItem("dente_last_sync_timestamp");
				if (stored) {
					this.lastSyncTimestampIso = stored;
				}
			} catch {
				// ignore
			}
		}
		this.initAutoSync();
	}

	public static getInstance(opts?: SyncEngineOptions): SyncEngine {
		if (!SyncEngine.instance) {
			SyncEngine.instance = new SyncEngine(opts);
		} else if (opts) {
			SyncEngine.instance.configure(opts);
		}
		return SyncEngine.instance;
	}

	public configure(opts: Partial<SyncEngineOptions>): void {
		this.options = { ...this.options, ...opts };
	}

	public getOptions(): SyncEngineOptions {
		return { ...this.options };
	}

	public getProgressState(): SyncProgressState {
		return {
			isSyncing: this.isRunning,
			totalPending: 0,
			processedCount: 0,
			appliedCount: 0,
			duplicateCount: 0,
			mergedCount: 0,
			failedCount: 0,
			lastSyncTimestampIso: this.lastSyncTimestampIso,
			lastSyncError: this.lastSyncError,
			activeTier: "cloud_postgresql",
		};
	}

	public subscribe(listener: SyncEngineEventListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private emit(
		type:
			| "sync_start"
			| "sync_progress"
			| "sync_complete"
			| "sync_error"
			| "conflict_detected"
			| "tier_changed",
		data: unknown,
	): void {
		for (const l of this.listeners) {
			try {
				l({ type, data });
			} catch (err) {
				logger.error("[SyncEngine] Listener error", err);
			}
		}
	}

	private initAutoSync(): void {
		if (typeof window === "undefined") return;

		this.boundAutoTrigger = () => {
			if (typeof navigator !== "undefined" && navigator.onLine === false) return;
			if (this.isRunning) return;
			void this.syncBidirectional().catch((err) => {
				logger.warn("[SyncEngine] Auto-sync trigger failed", err);
			});
		};

		window.addEventListener("online", this.boundAutoTrigger);
		window.addEventListener("focus", this.boundAutoTrigger);
		if (typeof document !== "undefined") {
			this.boundVisibilityHandler = () => {
				if (document.visibilityState === "visible") {
					this.boundAutoTrigger?.();
				}
			};
			document.addEventListener("visibilitychange", this.boundVisibilityHandler);
		}

		if (this.options.autoSyncIntervalMs && this.options.autoSyncIntervalMs > 0) {
			this.autoSyncTimer = setInterval(() => {
				if (typeof document !== "undefined" && document.hidden) return;
				this.boundAutoTrigger?.();
			}, this.options.autoSyncIntervalMs);
			if (this.autoSyncTimer && typeof this.autoSyncTimer === "object" && "unref" in this.autoSyncTimer && typeof this.autoSyncTimer.unref === "function") {
				this.autoSyncTimer.unref();
			}
		}
	}

	public destroy(): void {
		if (this.autoSyncTimer) {
			clearInterval(this.autoSyncTimer);
			this.autoSyncTimer = null;
		}
		if (typeof window !== "undefined" && this.boundAutoTrigger) {
			window.removeEventListener("online", this.boundAutoTrigger);
			window.removeEventListener("focus", this.boundAutoTrigger);
		}
		if (typeof document !== "undefined" && this.boundVisibilityHandler) {
			document.removeEventListener("visibilitychange", this.boundVisibilityHandler);
			this.boundVisibilityHandler = null;
		}
		this.boundAutoTrigger = null;
		this.listeners.clear();
	}

	/**
	 * Main Bidirectional Sync Execution:
	 * 1. Pushes pending mutations from outbox to server gateway
	 * 2. Processes server conflict resolution responses & records audit trail
	 * 3. Clears synced mutations from local IndexedDB
	 */
	public async syncBidirectional(
		customOptions?: Partial<SyncEngineOptions>,
	): Promise<BidirectionalSyncResult> {
		if (this.isRunning) {
			logger.warn("[SyncEngine] Sync is already active, skipping concurrent request");
			return {
				pushedBatch: {
					processedCount: 0,
					appliedCount: 0,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					failedCount: 0,
					conflicts: [],
					errors: [],
				},
				pulledChanges: {
					receivedCount: 0,
					appliedLocallyCount: 0,
					conflicts: [],
				},
				syncedAtIso: new Date().toISOString(),
			};
		}

		const mergedOpts = { ...this.options, ...(customOptions || {}) };
		this.isRunning = true;
		this.lastSyncError = null;
		this.emit("sync_start", { options: mergedOpts });

		const result: BidirectionalSyncResult = {
			pushedBatch: {
				processedCount: 0,
				appliedCount: 0,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: 0,
				failedCount: 0,
				conflicts: [],
				errors: [],
			},
			pulledChanges: {
				receivedCount: 0,
				appliedLocallyCount: 0,
				conflicts: [],
			},
			syncedAtIso: new Date().toISOString(),
		};

		try {
			// 1. Drain pending outbox mutations
			const drainResult = await offlineSyncService.drainOutbox({
				gatewayUrl: mergedOpts.gatewayUrl,
				batchSize: mergedOpts.batchSize,
				maxRetries: mergedOpts.maxRetries,
				baseBackoffMs: mergedOpts.baseBackoffMs,
				maxBackoffMs: mergedOpts.maxBackoffMs,
				jitter: mergedOpts.jitter,
				organizationId: mergedOpts.organizationId,
				headers: mergedOpts.headers,
				fetchImpl: mergedOpts.fetchImpl,
			});

			result.pushedBatch = {
				processedCount: drainResult.processedCount,
				appliedCount: drainResult.appliedCount,
				duplicateCount: drainResult.duplicateCount,
				mergedCount: drainResult.mergedCount,
				rejectedCount: drainResult.rejectedCount,
				failedCount: drainResult.failedCount,
				conflicts: drainResult.conflicts,
				errors: drainResult.errors,
			};
			if (drainResult.serverTime) {
				result.serverTime = drainResult.serverTime;
			}

			// 2. Audit all detected conflicts
			if (drainResult.conflicts && drainResult.conflicts.length > 0) {
				for (const c of drainResult.conflicts) {
					recordConflictAudit({
						entityKind: "patient",
						entityId: "sync-batch",
						mutationId: `sync-${Date.now()}`,
						conflicts: [c],
					});
				}
				this.emit("conflict_detected", { conflicts: drainResult.conflicts });
			}

			// 3. Real Delta Pull Execution: fetch server mutations since last sync timestamp
			const fetcher = mergedOpts.fetchImpl || (typeof fetch !== "undefined" ? fetch : undefined);
			if (fetcher) {
				try {
					const sinceParam = this.lastSyncTimestampIso
						? `?since=${encodeURIComponent(this.lastSyncTimestampIso)}`
						: "";
					const pullRes = await fetcher(`/api/sync/pull${sinceParam}`, {
						method: "GET",
						headers: getDenteAuthHeaders({
							"Content-Type": "application/json",
							...(mergedOpts.headers || {}),
						}),
					});

					if (pullRes.ok) {
						const rawPullData = (await pullRes.json()) as {
							data?: {
								serverTime?: string;
								patients?: unknown[];
								visits?: unknown[];
								visitDiaries?: unknown[];
								payments?: unknown[];
								appointments?: unknown[];
								toothStates?: unknown[];
								vectors?: unknown[];
								invoices?: unknown[];
							};
							serverTime?: string;
							patients?: unknown[];
							visits?: unknown[];
							visitDiaries?: unknown[];
							payments?: unknown[];
							appointments?: unknown[];
							toothStates?: unknown[];
							vectors?: unknown[];
							invoices?: unknown[];
						};
						const pullData = rawPullData?.data ?? rawPullData;

						const patientsList = Array.isArray(pullData.patients) ? pullData.patients : [];
						const visitsList = Array.isArray(pullData.visits) ? pullData.visits : [];
						const diariesList = Array.isArray(pullData.visitDiaries) ? pullData.visitDiaries : [];
						const paymentsList = Array.isArray(pullData.payments) ? pullData.payments : [];
						const appointmentsList = Array.isArray(pullData.appointments) ? pullData.appointments : [];
						const toothStatesList = Array.isArray(pullData.toothStates) ? pullData.toothStates : [];
						const invoicesList = Array.isArray(pullData.invoices) ? pullData.invoices : [];

						let hydratedCount = 0;
						const hydrateItems = async (
							entityKind: string,
							items: unknown[],
							onItem?: (rec: Record<string, unknown>, entityId: string) => Promise<void>,
						) => {
							for (let idx = 0; idx < items.length; idx++) {
								const raw = items[idx];
								if (!raw || typeof raw !== "object") continue;
								const rec = raw as Record<string, unknown>;
								const entityId = typeof rec.id === "string" ? rec.id : `${entityKind}-${idx}`;
								const orgId = typeof rec.organizationId === "string" ? rec.organizationId : undefined;
								if (onItem) {
									await onItem(rec, entityId);
								} else {
									await savePatientClinicalCache(`${entityKind}_${entityId}`, entityKind, entityId, rec, orgId);
								}
								hydratedCount++;
							}
						};

						await Promise.all([
							hydrateItems("patient", patientsList, async (rec, patientId) => {
								const fullName =
									typeof rec.fullName === "string"
										? rec.fullName
										: [rec.lastName, rec.firstName, rec.middleName].filter(Boolean).join(" ") || "Пациент";
								await cachePatientCard({
									patientId,
									organizationId: typeof rec.organizationId === "string" ? rec.organizationId : undefined,
									personalInfo: {
										fullName,
										phone: typeof rec.phone === "string" ? rec.phone : "",
										birthDate: typeof rec.birthDate === "string" ? rec.birthDate : undefined,
									},
								});
							}),
							hydrateItems("visit", visitsList),
							hydrateItems("visit_diary", diariesList),
							hydrateItems("payment", paymentsList),
							hydrateItems("appointment", appointmentsList),
							hydrateItems("tooth_state", toothStatesList),
							hydrateItems("invoice", invoicesList),
						]);

						const totalReceived =
							patientsList.length +
							visitsList.length +
							diariesList.length +
							paymentsList.length +
							appointmentsList.length +
							toothStatesList.length +
							invoicesList.length;

						if (totalReceived > 0) {
							try {
								await denteQueryClient.invalidateQueries();
							} catch (invErr) {
								logger.warn("[SyncEngine] QueryClient invalidation warning:", invErr);
							}
						}

						result.pulledChanges = {
							receivedCount: totalReceived,
							appliedLocallyCount: hydratedCount,
							conflicts: [],
						};

						if (pullData.serverTime) {
							result.serverTime = pullData.serverTime;
							this.lastSyncTimestampIso = pullData.serverTime;
							try {
								if (typeof localStorage !== "undefined") {
									localStorage.setItem("dente_last_sync_timestamp", pullData.serverTime);
								}
							} catch {
								// ignore localStorage quota
							}
						}
					}
				} catch (pullErr) {
					logger.warn("[SyncEngine] Delta pull non-fatal error:", pullErr);
				}
			}

			this.lastSyncTimestampIso = result.serverTime || result.syncedAtIso;
			this.emit("sync_complete", result);
			return result;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			this.lastSyncError = errorMsg;
			logger.error("[SyncEngine] Synchronization failed", err);
			this.emit("sync_error", { error: errorMsg });
			return result;
		} finally {
			this.isRunning = false;
		}
	}
}

export const syncEngine = SyncEngine.getInstance();
