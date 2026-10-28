import {
	type SyncMutationEnvelope,
	type SyncPushBatchRequest,
	type SyncPushBatchResponse,
	calibrateClockSkew,
	computePayloadHash,
	createCompositeIdempotencyKey,
} from "@dental/shared";
import { logger } from "../../../utils/logger";
import { nowIsoWithMs, updateOfflineMutationStatus } from "./syncStorageBridge";
import { calculateBackoffDelay } from "./syncMetricsTracker";
import { mapToSyncAction, mapToSyncEntityKind } from "./syncConflictResolver";
import type { OfflineMutation, SyncBatchDrainResult, SyncConflictEvent } from "../types";

export interface BatchProcessOptions {
	batch: OfflineMutation[];
	clientId: string;
	gatewayUrl: string;
	headers: Record<string, string>;
	maxRetries: number;
	baseBackoffMs: number;
	maxBackoffMs: number;
	jitter: boolean;
	fetchImpl?: typeof fetch;
	emit: (type: "progress" | "complete" | "conflict" | "error" | "slow_drain", data: unknown) => void;
}

export async function processBatchWithRetry(params: BatchProcessOptions): Promise<SyncBatchDrainResult> {
	const { batch, clientId, gatewayUrl, headers, maxRetries, baseBackoffMs, maxBackoffMs, jitter, fetchImpl, emit } = params;
	const result: SyncBatchDrainResult = {
		processedCount: batch.length, appliedCount: 0, duplicateCount: 0, mergedCount: 0, rejectedCount: 0, failedCount: 0, conflicts: [], errors: [],
	};

	for (const mut of batch) await updateOfflineMutationStatus(mut.mutationId, "syncing");

	const envelopes: SyncMutationEnvelope[] = batch.map((mut) => {
		const payload = (mut.payload && typeof mut.payload === "object" ? mut.payload : { value: mut.payload }) as Record<string, unknown>;
		return {
			mutationId: mut.mutationId,
			idempotencyKey: mut.idempotencyKey || createCompositeIdempotencyKey(mut.mutationId, payload),
			payloadHash: mut.payloadHash || computePayloadHash(payload),
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

	let lastError: Error | null = null;
	let serverResponse: SyncPushBatchResponse | null = null;
	let slowTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
		emit("slow_drain", { elapsedMs: 3000, batchSize: batch.length, message: "Идет сохранение... (3 сек) — продолжайте работу" });
	}, 3000);

	try {
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				if (!fetchImpl) throw new Error("Fetch implementation is not available in environment");
				const res = await fetchImpl(gatewayUrl, {
					method: "POST", headers: { "Content-Type": "application/json", "x-dente-sync-client": clientId, ...headers },
					body: JSON.stringify({ syncBatchId: envelopes[0]?.mutationId, clientId, sentAt: nowIsoWithMs(), mutations: envelopes }),
				});
				if (!res.ok) {
					const errText = await res.text().catch(() => "");
					if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
					throw new Error(`Server error HTTP ${res.status}: ${errText || res.statusText}`);
				}
				serverResponse = (await res.json()) as SyncPushBatchResponse;
				break;
			} catch (err) {
				lastError = err instanceof Error ? err : new Error(String(err));
				logger.warn(`[OfflineSyncService] Batch push attempt ${attempt + 1}/${maxRetries + 1} failed: ${lastError.message}`);
				if (attempt < maxRetries) await new Promise((r) => setTimeout(r, calculateBackoffDelay(attempt, baseBackoffMs, maxBackoffMs, jitter)));
			}
		}
	} finally {
		if (slowTimer) { clearTimeout(slowTimer); slowTimer = null; }
	}

	await applyBatchResults({ batch, serverResponse, lastError, result, emit });
	return result;
}

async function applyBatchResults(p: { batch: OfflineMutation[]; serverResponse: SyncPushBatchResponse | null; lastError: Error | null; result: SyncBatchDrainResult; emit: (type: "conflict", data: unknown) => void }) {
	const { batch, serverResponse, lastError, result, emit } = p;
	if (serverResponse && Array.isArray(serverResponse.results)) {
		result.serverTime = serverResponse.serverTime;
		if (serverResponse.serverTime) calibrateClockSkew(serverResponse.serverTime);
		const map = new Map(serverResponse.results.map((r) => [r.mutationId, r]));

		for (const mut of batch) {
			const mutRes = map.get(mut.mutationId);
			if (!mutRes) {
				await updateOfflineMutationStatus(mut.mutationId, "failed", "No result received");
				result.failedCount++; result.errors.push({ mutationId: mut.mutationId, error: "No result in sync response" });
				continue;
			}
			if (mutRes.status === "applied" || mutRes.status === "duplicate") {
				await updateOfflineMutationStatus(mut.mutationId, "synced");
				if (mutRes.status === "applied") result.appliedCount++; else result.duplicateCount++;
			} else if (mutRes.status === "merged" || mutRes.status === "conflict_resolved") {
				await updateOfflineMutationStatus(mut.mutationId, "synced");
				result.mergedCount++;
				if (mutRes.conflictDetails?.length) {
					result.conflicts.push(...mutRes.conflictDetails);
					emit("conflict", { mutationId: mut.mutationId, entityKind: mutRes.entityKind, entityId: mutRes.entityId, conflicts: mutRes.conflictDetails, appliedAt: mutRes.appliedAt });
				}
			} else if (mutRes.status === "rejected") {
				const errText = mutRes.error || "Mutation rejected by server";
				await updateOfflineMutationStatus(mut.mutationId, "failed", errText);
				result.rejectedCount++; result.errors.push({ mutationId: mut.mutationId, error: errText });
			}
		}
	} else {
		const failReason = lastError?.message || "Failed to reach sync gateway after retries";
		for (const mut of batch) {
			await updateOfflineMutationStatus(mut.mutationId, "failed", failReason);
			result.failedCount++; result.errors.push({ mutationId: mut.mutationId, error: failReason });
		}
	}
}
