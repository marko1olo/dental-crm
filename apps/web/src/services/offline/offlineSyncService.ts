/**
 * DENTE CRM — Offline-First Seamless Batch Sync Engine
 *
 * Сервис бесшовного дренажа очереди мутаций при восстановлении связи:
 * - Пакетная отправка (Batching) на шлюз синхронизации /api/sync/gateway
 * - Идемпотентность (RFC4122 UUID + детерминированный SHA-256 хэш полезной нагрузки)
 * - Экспоненциальный бэкофф с рандомизированным джиттером (Jitter) при сбоях сети / 5xx ответах
 * - Разрешение конфликтов по схеме Field-Level Last-Write-Wins (LWW) и CRDT
 * - Защита от состояния гонки (in-flight drain mutex)
 * - Реактивные события прогресса, разрешения конфликтов и ошибок
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
import { flushOfflinePatientBookings } from "../../pwa/patientOfflineStorage";
import { logger } from "../../utils/logger";
import {
	clearSyncedOfflineMutations,
	generateMutationUuid,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	nowIsoWithMs,
	updateOfflineMutationStatus,
} from "./offlineStorage";
import type {
	MutationAction,
	MutationEntityType,
	OfflineMutation,
	SyncBatchDrainOptions,
	SyncBatchDrainResult,
	SyncConflictEvent,
	SyncEventListener,
} from "./types";

const CLIENT_ID_STORAGE_KEY = "dente_client_instance_id_v1";

/**
 * Получение стабильного идентификатора инстанса клиента
 */
export function getOrCreateClientId(): string {
	if (typeof window === "undefined" || !window.localStorage) {
		return "node-offline-client-0";
	}
	try {
		let id = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
		if (!id) {
			id = `client-${generateMutationUuid()}`;
			window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, id);
		}
		return id;
	} catch {
		return "browser-fallback-client";
	}
}

/**
 * Расчет задержки экспоненциального бэкоффа с джиттером
 */
export function calculateBackoffDelay(
	attempt: number,
	baseMs = 500,
	maxMs = 10000,
	jitter = true,
): number {
	const exponential = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
	if (!jitter) return Math.round(exponential);
	// Full Jitter: множитель от 0.5 до 1.0 для исключения одновременного всплеска запросов
	const factor = 0.5 + Math.random() * 0.5;
	return Math.max(50, Math.round(exponential * factor));
}

/**
 * Преобразование типа сущности UI к каноническому контракту SyncMutationEntityKind
 */
export function mapToSyncEntityKind(
	entityType: MutationEntityType,
): SyncMutationEntityKind {
	switch (entityType) {
		case "DIARY_043_DRAFT":
			return "visit_diary";
		case "ODONTOGRAM_STATUS":
			return "odontogram_state";
		case "PRESCRIPTION_107_DRAFT":
			return "clinical_task";
		case "DOCUMENT_DRAFT":
			return "visit";
		case "CASH_RECEIPT_DRAFT":
			return "payment";
		case "APPOINTMENT_BOOKING_DRAFT":
			return "appointment";
		case "TREATMENT_PLAN_DRAFT":
			return "treatment_item";
		case "PATIENT_DRAFT":
		case "GENERIC":
			return "patient";
		case "patient":
		case "visit":
		case "visit_diary":
		case "payment":
		case "patient_invoice":
		case "appointment":
		case "treatment_item":
		case "clinical_task":
		case "odontogram_state":
		case "patient_administrative_profile":
			return entityType;
		default:
			return "patient";
	}
}


/**
 * Преобразование действия мутации к SyncMutationAction
 */
export function mapToSyncAction(action: MutationAction): SyncMutationAction {
	if (action === "sync") return "update";
	return action;
}

export class OfflineSyncService {
	private static instance: OfflineSyncService | null = null;
	private isDraining = false;
	private listeners = new Set<SyncEventListener>();
	private isLifecycleListening = false;
	private cleanupLifecycleListeners: (() => void) | null = null;

	constructor() {
		this.initBrowserLifecycleListeners();
	}

	public static getInstance(): OfflineSyncService {
		if (!OfflineSyncService.instance) {
			OfflineSyncService.instance = new OfflineSyncService();
		}
		return OfflineSyncService.instance;
	}

	/**
	 * Инициализация слушателей жизненного цикла браузера (visibilitychange, focus, online)
	 * для автоматического мгновенного возобновления синхронизации при возврате во вкладку.
	 */
	public initBrowserLifecycleListeners(): () => void {
		if (this.isLifecycleListening || typeof window === "undefined") {
			return () => {};
		}

		this.isLifecycleListening = true;

		const triggerAutoDrain = () => {
			if (typeof navigator !== "undefined" && navigator.onLine === false) {
				return;
			}
			if (this.isDraining) {
				return;
			}
			void (async () => {
				try {
					const pending = await getPendingOfflineMutations();
					if (pending.length > 0 && !this.isDraining) {
						logger.info(
							`[OfflineSyncService] Auto-draining ${pending.length} pending mutations on tab focus/visibility restore`,
						);
						await this.drainOutbox();
					}
					// Drain PWA patient bookings queue (Subway Mode)
					try {
						await flushOfflinePatientBookings();
					} catch (pwaErr) {
						logger.warn(
							"[OfflineSyncService] Auto-drain PWA patient bookings failed",
							pwaErr,
						);
					}
				} catch (err) {
					logger.warn(
						"[OfflineSyncService] Auto-drain on visibility restore failed",
						err,
					);
				}
			})();
		};

		const onVisibilityChange = () => {
			if (
				typeof document !== "undefined" &&
				document.visibilityState === "visible"
			) {
				triggerAutoDrain();
			}
		};

		const onFocus = () => {
			triggerAutoDrain();
		};

		const onOnline = () => {
			triggerAutoDrain();
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", onVisibilityChange);
		}
		if (typeof window !== "undefined") {
			window.addEventListener("focus", onFocus);
			window.addEventListener("online", onOnline);
		}

		this.cleanupLifecycleListeners = () => {
			this.isLifecycleListening = false;
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", onVisibilityChange);
			}
			if (typeof window !== "undefined") {
				window.removeEventListener("focus", onFocus);
				window.removeEventListener("online", onOnline);
			}
		};

		return this.cleanupLifecycleListeners;
	}

	/**
	 * Очистка слушателей жизненного цикла браузера
	 */
	public cleanupBrowserLifecycleListeners(): void {
		if (this.cleanupLifecycleListeners) {
			this.cleanupLifecycleListeners();
			this.cleanupLifecycleListeners = null;
		}
	}

	/**
	 * Проверка статуса энергосбережения (низкий заряд батареи <= 15% и discharging)
	 */
	public async isBatterySaverActive(): Promise<boolean> {
		if (
			typeof navigator === "undefined" ||
			typeof (navigator as unknown as { getBattery?: () => Promise<unknown> }).getBattery !== "function"
		) {
			return false;
		}
		try {
			const battery = await (navigator as unknown as {
				getBattery: () => Promise<{ level?: number; charging?: boolean }>;
			}).getBattery();
			const level = typeof battery?.level === "number" ? battery.level : 1.0;
			const charging = typeof battery?.charging === "boolean" ? battery.charging : true;
			return !charging && level <= 0.15;
		} catch {
			return false;
		}
	}

	/**
	 * Подписка на события синхронизации
	 */
	public subscribe(listener: SyncEventListener): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private emit(
		type: "progress" | "complete" | "conflict" | "error" | "slow_drain",
		data: unknown,
	): void {
		for (const listener of this.listeners) {
			try {
				listener({ type, data });
			} catch (err) {
				logger.error("[OfflineSyncService] Listener error", err);
			}
		}
	}

	/**
	 * Проверка, идет ли сейчас активный дренаж очереди
	 */
	public isDrainActive(): boolean {
		return this.isDraining;
	}

	/**
	 * Главная функция бесшовного дренажа очереди мутаций
	 */
	public async drainOutbox(
		options: SyncBatchDrainOptions = {},
	): Promise<SyncBatchDrainResult> {
		if (this.isDraining) {
			logger.warn("[OfflineSyncService] Drain is already in progress, skipping concurrent trigger");
			return {
				processedCount: 0,
				appliedCount: 0,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: 0,
				failedCount: 0,
				conflicts: [],
				errors: [],
			};
		}

		this.isDraining = true;
		const {
			batchSize = 25,
			maxRetries = 3,
			baseBackoffMs = 400,
			maxBackoffMs = 8000,
			jitter = true,
			organizationId,
			gatewayUrl = "/api/sync/gateway",
			headers = {},
			fetchImpl = typeof fetch !== "undefined" ? fetch : undefined,
		} = options;

		const totalResult: SyncBatchDrainResult = {
			processedCount: 0,
			appliedCount: 0,
			duplicateCount: 0,
			mergedCount: 0,
			rejectedCount: 0,
			failedCount: 0,
			conflicts: [],
			errors: [],
		};

		try {
			const pending = await getPendingOfflineMutations({ organizationId });
			if (pending.length === 0) {
				this.isDraining = false;
				return totalResult;
			}

			const clientId = getOrCreateClientId();

			// Разбиваем очередь на батчи
			for (let i = 0; i < pending.length; i += batchSize) {
				const batch = pending.slice(i, i + batchSize);
				const batchResult = await this.processBatchWithRetry({
					batch,
					clientId,
					gatewayUrl,
					headers,
					maxRetries,
					baseBackoffMs,
					maxBackoffMs,
					jitter,
					fetchImpl,
				});

				totalResult.processedCount += batchResult.processedCount;
				totalResult.appliedCount += batchResult.appliedCount;
				totalResult.duplicateCount += batchResult.duplicateCount;
				totalResult.mergedCount += batchResult.mergedCount;
				totalResult.rejectedCount += batchResult.rejectedCount;
				totalResult.failedCount += batchResult.failedCount;
				totalResult.conflicts.push(...batchResult.conflicts);
				totalResult.errors.push(...batchResult.errors);
				if (batchResult.serverTime) {
					totalResult.serverTime = batchResult.serverTime;
				}

				this.emit("progress", {
					processed: totalResult.processedCount,
					total: pending.length,
					batchResult,
				});
			}

			// Очищаем успешно синхронизированные мутации
			await clearSyncedOfflineMutations();

			this.emit("complete", totalResult);
			return totalResult;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			logger.error("[OfflineSyncService] Critical drain error", err);
			this.emit("error", { error: errorMsg });
			return totalResult;
		} finally {
			this.isDraining = false;
		}
	}

	/**
	 * Обработка одного пакета мутаций с экспоненциальным бэкоффом и ретраями
	 */
	private async processBatchWithRetry(params: {
		batch: OfflineMutation[];
		clientId: string;
		gatewayUrl: string;
		headers: Record<string, string>;
		maxRetries: number;
		baseBackoffMs: number;
		maxBackoffMs: number;
		jitter: boolean;
		fetchImpl?: typeof fetch | undefined;
	}): Promise<SyncBatchDrainResult> {
		const {
			batch,
			clientId,
			gatewayUrl,
			headers,
			maxRetries,
			baseBackoffMs,
			maxBackoffMs,
			jitter,
			fetchImpl,
		} = params;

		const result: SyncBatchDrainResult = {
			processedCount: batch.length,
			appliedCount: 0,
			duplicateCount: 0,
			mergedCount: 0,
			rejectedCount: 0,
			failedCount: 0,
			conflicts: [],
			errors: [],
		};

		// 1. Помечаем мутации батча как syncing
		for (const mut of batch) {
			await updateOfflineMutationStatus(mut.mutationId, "syncing");
		}

		// 2. Формируем конверты мутаций с детерминированным хешированием и ключами идемпотентности
		const envelopes: SyncMutationEnvelope[] = batch.map((mut) => {
			const payload = (mut.payload && typeof mut.payload === "object"
				? (mut.payload as Record<string, unknown>)
				: { value: mut.payload }) as Record<string, unknown>;

			const calculatedHash = mut.payloadHash || computePayloadHash(payload);
			const idempotencyKey =
				mut.idempotencyKey ||
				createCompositeIdempotencyKey(mut.mutationId, payload);

			return {
				mutationId: mut.mutationId,
				idempotencyKey,
				payloadHash: calculatedHash,
				entityKind: mapToSyncEntityKind(mut.entityType),
				entityId: mut.entityId,
				action: mapToSyncAction(mut.action),
				payload,
				updatedAt: mut.timestamp || nowIsoWithMs(),
				mutationVector: mut.mutationVector,
				clientId,
				authorUserId: mut.authorUserId,
			};
		});

		const batchRequest: SyncPushBatchRequest = {
			syncBatchId: generateMutationUuid(),
			clientId,
			sentAt: nowIsoWithMs(),
			mutations: envelopes,
		};

		// 3. Выполняем сетевой запрос с экспоненциальным бэкоффом
		let lastError: Error | null = null;
		let serverResponse: SyncPushBatchResponse | null = null;

		let slowTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
			this.emit("slow_drain", {
				elapsedMs: 3000,
				batchSize: batch.length,
				message:
					"Идет сохранение... (3 сек) — продолжайте работу, система завершит отправку в фоне",
			});
		}, 3000);

		try {
			for (let attempt = 0; attempt <= maxRetries; attempt++) {
				try {
					if (!fetchImpl) {
						throw new Error("Fetch implementation is not available in environment");
					}

					const res = await fetchImpl(gatewayUrl, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"x-dente-sync-client": clientId,
							...headers,
						},
						body: JSON.stringify(batchRequest),
					});

					if (!res.ok) {
						const errorText = await res.text().catch(() => "");
						// 4xx ошибки валидации не имеют смысла к повтору — сразу фейлим
						if (res.status >= 400 && res.status < 500 && res.status !== 429) {
							throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
						}
						// 5xx или 429 Rate-Limit — выбрасываем ошибку для ретрая
						throw new Error(`Server error HTTP ${res.status}: ${errorText || res.statusText}`);
					}

					const contentType = res.headers?.get ? res.headers.get("content-type") || "" : "";
					if (!contentType.includes("application/json")) {
						const textBody = await res.text().catch(() => "");
						throw new Error(
							`Invalid gateway response (expected JSON, got ${contentType || "unknown"}): ${textBody.substring(0, 120)}`,
						);
					}

					const data = (await res.json()) as SyncPushBatchResponse;
					serverResponse = data;
					break; // Успешно, выходим из цикла ретраев
				} catch (err) {
					lastError = err instanceof Error ? err : new Error(String(err));
					logger.warn(
						`[OfflineSyncService] Batch push attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}`,
					);

					if (attempt < maxRetries) {
						const delay = calculateBackoffDelay(
							attempt,
							baseBackoffMs,
							maxBackoffMs,
							jitter,
						);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
			}
		} finally {
			if (slowTimer) {
				clearTimeout(slowTimer);
				slowTimer = null;
			}
		}

		// 4. Разбор ответа сервера или обработка полного сбоя отправки
		if (serverResponse && Array.isArray(serverResponse.results)) {
			result.serverTime = serverResponse.serverTime;
			if (serverResponse.serverTime) {
				calibrateClockSkew(serverResponse.serverTime);
			}
			const resultsMap = new Map(
				serverResponse.results.map((r) => [r.mutationId, r]),
			);

			for (const mut of batch) {
				const mutRes = resultsMap.get(mut.mutationId);
				if (!mutRes) {
					// Мутация не была обработана сервером
					await updateOfflineMutationStatus(
						mut.mutationId,
						"failed",
						"No result received for mutation from sync gateway",
					);
					result.failedCount++;
					result.errors.push({
						mutationId: mut.mutationId,
						error: "No result in sync response",
					});
					continue;
				}

				if (mutRes.status === "applied") {
					await updateOfflineMutationStatus(mut.mutationId, "synced");
					result.appliedCount++;
				} else if (mutRes.status === "duplicate") {
					await updateOfflineMutationStatus(mut.mutationId, "synced");
					result.duplicateCount++;
				} else if (
					mutRes.status === "merged" ||
					mutRes.status === "conflict_resolved"
				) {
					await updateOfflineMutationStatus(mut.mutationId, "synced");
					result.mergedCount++;
					if (mutRes.conflictDetails && mutRes.conflictDetails.length > 0) {
						result.conflicts.push(...mutRes.conflictDetails);
						const conflictEvent: SyncConflictEvent = {
							mutationId: mut.mutationId,
							entityKind: mutRes.entityKind,
							entityId: mutRes.entityId,
							conflicts: mutRes.conflictDetails,
							appliedAt: mutRes.appliedAt,
						};
						this.emit("conflict", conflictEvent);
					}
				} else if (mutRes.status === "rejected") {
					const errText = mutRes.error || "Mutation rejected by server";
					await updateOfflineMutationStatus(mut.mutationId, "failed", errText);
					result.rejectedCount++;
					result.errors.push({
						mutationId: mut.mutationId,
						error: errText,
					});
				}
			}
		} else {
			// Все попытки исчерпаны, помечаем батч как failed
			const failReason =
				lastError?.message || "Failed to reach sync gateway after retries";
			for (const mut of batch) {
				await updateOfflineMutationStatus(mut.mutationId, "failed", failReason);
				result.failedCount++;
				result.errors.push({
					mutationId: mut.mutationId,
					error: failReason,
				});
			}
		}

		return result;
	}
}

export const offlineSyncService = OfflineSyncService.getInstance();
