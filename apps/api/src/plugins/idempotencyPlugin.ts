/**
 * idempotencyPlugin.ts — Fastify Universal Idempotency & Tenant Shield Guard Plugin.
 *
 * Enforces exactly-once execution for ALL mutating HTTP requests (POST, PUT, PATCH, DELETE):
 *   1. Requires valid UUIDv7 Idempotency-Key (via X-Idempotency-Key/Idempotency-Key headers
 *      or body idempotencyKey/clientMutationId) for all mutating operations unless in exemptPaths.
 *   2. Rejects missing or non-UUIDv7 keys with 400 Bad Request ({ error: "IdempotencyKeyRequired" }).
 *   3. Computes canonical SHA-256 payload hash via computePayloadHash(@dental/shared).
 *   4. Queries `idempotency_keys` table in PostgreSQL 18 under tenant RLS context.
 *   5. If key exists & completed: returns cached HTTP response code and body immediately
 *      without executing the route handler!
 *   6. If key is in-flight: returns 409 Conflict with `Retry-After: 1` header.
 *   7. Auto-reclaims zombie in-flight locks (> 60 seconds) on node crashes.
 *   8. If key is new: records in-flight state and payload hash, allows handler to execute,
 *      and saves the final response in `idempotency_keys` in onSend hook.
 */

import { computePayloadHash } from "@dental/shared";
import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import type { IdempotencyKeyRecord } from "../db/schema/idempotency.js";
import type { SyncIdempotencyRecord } from "../db/schema/sync.js";
import {
	extractIdempotencyKey,
	extractPgErrorCode,
	extractTenantId,
	isValidUuid,
} from "./idempotencyModules/idempotencyHeaderParser.js";
import {
	buildIdempotencyMemKey,
	cleanupOnUncaughtError,
	clearInMemoryIdempotencyCache,
	deleteInMemoryIdempotencyRecord,
	getInMemoryIdempotencyRecord,
	isLockStale,
	persistResponseOrEvictOnFailure,
	queryDatabaseIdempotencyRecord,
	reclaimStaleLock,
	recordInFlightToDatabase,
	setInMemoryIdempotencyRecord,
	STALE_LOCK_THRESHOLD_MS,
} from "./idempotencyModules/idempotencyStorageEngine.js";
import {
	type GenericIdempotencyRecord,
	handleCachedRecord,
	sendConflict,
} from "./idempotencyModules/idempotencyReplayResponder.js";
import type {
	IdempotencyContext,
	InMemoryRecord,
} from "./idempotencyModules/idempotencyTypes.js";

declare module "fastify" {
	interface FastifyRequest {
		_idempotencyContext?: IdempotencyContext | undefined;
	}
}

export interface IdempotencyPluginOptions {
	/** Header name to check for idempotency key. Defaults to 'x-idempotency-key'. */
	headerName?: string | undefined;
	/** Mutating HTTP methods to guard. Defaults to ['POST', 'PUT', 'PATCH', 'DELETE']. */
	methods?: string[] | undefined;
	/** Value for Retry-After header in seconds for in-flight requests. Defaults to 1. */
	retryAfterSeconds?: number | undefined;
	/** Global disable switch. */
	disabled?: boolean | undefined;
	/** Paths or patterns exempt from Idempotency-Key requirement. */
	exemptPaths?: Array<string | RegExp> | undefined;
	/** Deprecated: previously used path enforcement list. */
	enforceForPaths?: Array<string | RegExp> | undefined;
}

/**
 * Standard exempt paths for authentication, healthchecks, and external third-party webhooks.
 */
export const DEFAULT_IDEMPOTENCY_EXEMPT_PATHS: RegExp[] = [
	/^\/api\/auth\/(?:login|refresh|logout|staff\/unlock)$/,
	/^\/api\/portal\/auth\/(?:send-code|verify-code|refresh)$/,
	/^\/(?:api\/)?(?:health|ping)$/,
	/^\/api\/telephony(?:\/.*)?\/webhook$/,
	/^\/api\/(?:v1\/webhooks\/whatsapp|whatsapp\/webhook)$/,
	/^\/api\/public\/[^/]+\/vk\/webhook$/,
	/^\/api\/integrations\/diagnocat\/webhook$/,
	/^\/api\/clinical-ai\/webhook$/,
	/^\/api\/integrations\/flexbe\/webhook$/,
	/^\/api\/integrations\/medflex\/[^/]+\/webhook\/booking$/,
	/^\/api\/payments\/sberbank\/webhook$/,
	/^\/api\/payments\/sberbank\/pos\/webhook$/,
	/^\/api\/payments\/sberbank\/qr\/webhook$/,
	/^\/api\/payments\/sberpos\/webhook$/,
	/^\/api\/sberbank\/webhook$/,
	/^\/api\/sbp\/webhook$/,
	/^\/api\/billing\/sbp\/webhook$/,
	/^\/api\/fiscal\/validate$/,
	/^\/api\/sync\/(?:gateway|push|pull|mesh\/exchange)$/,
];

export type { IdempotencyPluginOptions as PluginOptions };
export {
	extractTenantId,
	extractIdempotencyKey,
	extractPgErrorCode,
	clearInMemoryIdempotencyCache,
	reclaimStaleLock,
	isLockStale,
	STALE_LOCK_THRESHOLD_MS,
};

const idempotencyPluginAsync: FastifyPluginAsync<IdempotencyPluginOptions> = async (
	fastify: FastifyInstance,
	options: IdempotencyPluginOptions = {},
) => {
	if (options.disabled) return;

	const headerName = options.headerName?.toLowerCase();
	const allowedMethods = new Set(
		(options.methods ?? ["POST", "PUT", "PATCH", "DELETE"]).map((m) =>
			m.toUpperCase(),
		),
	);
	const retryAfter = options.retryAfterSeconds ?? 1;
	const exemptPaths = [
		...DEFAULT_IDEMPOTENCY_EXEMPT_PATHS,
		...(options.exemptPaths ?? []),
	];

	// 1. PRE-HANDLER HOOK
	fastify.addHook(
		"preHandler",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!allowedMethods.has(request.method.toUpperCase())) {
				return;
			}

			const url = request.url.split("?")[0] || request.url;
			const isExempt = exemptPaths.some((p) =>
				typeof p === "string" ? url === p || url.startsWith(p) : p.test(url),
			);

			if (isExempt) {
				return;
			}

			const idempotencyKey = extractIdempotencyKey(request, headerName);
			if (!idempotencyKey || !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return reply.send({
					error: "IdempotencyKeyRequired",
					message:
						"Idempotency-Key header (UUIDv7) is required for mutating requests",
				});
			}

			const payloadHash = computePayloadHash(request.body ?? {});
			const tenantId = extractTenantId(request);
			const useDatabase =
				process.env.DENTAL_STATE_PERSISTENCE !== "off" &&
				tenantId !== null &&
				isValidUuid(tenantId);

			// Step 1: In-Memory Fast-Path Lock & Deduplication
			const memScope = tenantId ?? `unscoped:${request.method.toUpperCase()}:${url}`;
			const memKey = buildIdempotencyMemKey(memScope, idempotencyKey);
			const existingMem = getInMemoryIdempotencyRecord(memKey);

			if (existingMem) {
				if (
					existingMem.action === "in_flight" &&
					Date.now() - existingMem.createdAt > STALE_LOCK_THRESHOLD_MS
				) {
					// In-memory lock is stale (> 60s), evict it and allow re-acquisition!
					deleteInMemoryIdempotencyRecord(memKey);
				} else {
					return handleCachedRecord(
						reply,
						idempotencyKey,
						payloadHash,
						existingMem,
						retryAfter,
					);
				}
			}

			// Optimistically set in-flight in memory to prevent concurrent intra-process double execution
			setInMemoryIdempotencyRecord(memKey, {
				idempotencyKey,
				payloadHash,
				responseStatus: 0,
				responseJson: null,
				action: "in_flight",
				createdAt: Date.now(),
			});

			if (useDatabase && tenantId) {
				// PostgreSQL Database Path under Tenant RLS
				let existingIdemKey: IdempotencyKeyRecord | undefined;
				let existingSyncRecord: SyncIdempotencyRecord | undefined;

				try {
					const dbRes = await queryDatabaseIdempotencyRecord(
						tenantId,
						idempotencyKey,
					);
					existingIdemKey = dbRes.existingIdemKey;
					existingSyncRecord = dbRes.existingSyncRecord;
				} catch (dbReadErr) {
					request.log.warn(
						{ error: dbReadErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to read idempotency records from DB, proceeding to transactional in-flight lock",
					);
				}

				// Check for zombie in-flight lock in DB (> 60 seconds) and auto-reclaim
				if (
					existingIdemKey &&
					existingIdemKey.status === "in_flight" &&
					isLockStale(existingIdemKey.lockedAt)
				) {
					const reclaimed = await reclaimStaleLock(
						tenantId,
						idempotencyKey,
						payloadHash,
					);
					if (reclaimed) {
						request.log.warn(
							{ tenantId, idempotencyKey },
							"[IdempotencyPlugin] Reclaimed zombie in-flight lock older than 60s",
						);
						request._idempotencyContext = {
							idempotencyKey,
							organizationId: tenantId,
							memScope,
							payloadHash,
							useDatabase,
						};
						return;
					}
				}

				const foundDbRecord = (existingIdemKey ?? existingSyncRecord) as
					| GenericIdempotencyRecord
					| undefined;

				if (foundDbRecord) {
					return handleCachedRecord(
						reply,
						idempotencyKey,
						payloadHash,
						foundDbRecord,
						retryAfter,
						() => deleteInMemoryIdempotencyRecord(memKey),
						(replayedStatus, replayedBody) => {
							setInMemoryIdempotencyRecord(memKey, {
								idempotencyKey,
								payloadHash,
								responseStatus: replayedStatus,
								responseJson: replayedBody as Record<string, unknown> | null,
								action: "completed",
								createdAt: Date.now(),
							});
						},
					);
				}

				// Key is new: record in-flight row in PostgreSQL (fail-closed if persistence unavailable)
				const inFlightRes = await recordInFlightToDatabase(
					tenantId,
					idempotencyKey,
					payloadHash,
				);
				if (!inFlightRes.success) {
					if (inFlightRes.isConflict) {
						return sendConflict(reply, idempotencyKey, "in_flight", retryAfter);
					}
					deleteInMemoryIdempotencyRecord(memKey);
					request.log.error(
						{ error: inFlightRes.error, idempotencyKey },
						"[IdempotencyPlugin] Failed to write in-flight record to DB",
					);
					const pgCode = extractPgErrorCode(inFlightRes.error);
					if (pgCode === "23503") {
						return reply.code(400).send({
							error: "InvalidOrganization",
							message: "Указанная организация не найдена для фиксации ключа идемпотентности.",
						});
					}
					return reply.code(503).send({
						error: "IdempotencyStoreUnavailable",
						message: "Хранилище идемпотентности временно недоступно. Повторите запрос позже.",
					});
				}
			}

			// Store idempotency context on request
			request._idempotencyContext = {
				idempotencyKey,
				organizationId: tenantId,
				memScope,
				payloadHash,
				useDatabase,
			};
		},
	);

	// 2. ON-SEND HOOK: Save completed response or clean up on failure
	fastify.addHook(
		"onSend",
		async (
			request: FastifyRequest,
			reply: FastifyReply,
			payload: unknown,
		) => {
			const ctx = request._idempotencyContext;

			if (!ctx) {
				return payload;
			}

			let parsedJson: Record<string, unknown> | null = null;
			if (typeof payload === "string" && payload.trim()) {
				try {
					parsedJson = JSON.parse(payload);
				} catch {
					parsedJson = { text: payload };
				}
			} else if (payload && typeof payload === "object") {
				parsedJson = payload as Record<string, unknown>;
			}

			await persistResponseOrEvictOnFailure(
				ctx,
				reply.statusCode,
				parsedJson,
				(details, msg) => request.log.error(details, msg),
			);

			reply.header("X-Idempotency-Key", ctx.idempotencyKey);
			return payload;
		},
	);

	// 3. ON-ERROR HOOK: Evict in-flight record on uncaught exception
	fastify.addHook(
		"onError",
		async (
			request: FastifyRequest,
			_reply: FastifyReply,
			_error: Error,
		) => {
			const ctx = request._idempotencyContext;

			if (!ctx) return;
			await cleanupOnUncaughtError(ctx);
		},
	);
};

export const idempotencyPlugin = fp(idempotencyPluginAsync, {
	name: "dente-idempotency-plugin",
	fastify: "5.x",
});
