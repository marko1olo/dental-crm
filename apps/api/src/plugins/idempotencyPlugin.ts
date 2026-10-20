/**
 * idempotencyPlugin.ts — Fastify Totipotency & Idempotency De-duplication Guard Plugin.
 *
 * Enforces exactly-once execution for mutating HTTP requests (POST, PUT, PATCH):
 *   1. Checks `X-Idempotency-Key` or `Idempotency-Key` headers (case-insensitive)
 *      or body `idempotencyKey` / `clientMutationId`.
 *   2. Computes canonical SHA-256 payload hash via computePayloadHash(@dental/shared).
 *   3. Queries `idempotency_keys` table in PostgreSQL 18 under tenant RLS context.
 *   4. If key exists & completed: returns cached HTTP response code and body immediately
 *      without executing the route handler!
 *   5. If key is in-flight: returns 409 Conflict with `Retry-After: 1` header.
 *   6. If key is new: records in-flight state and payload hash, allows handler to execute,
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
import {
	extractIdempotencyKey,
	extractPgErrorCode,
	extractTenantId,
	isValidUuid,
} from "./idempotencyModules/idempotencyHeaderParser.js";
import {
	cleanupOnUncaughtError,
	clearInMemoryIdempotencyCache,
	deleteInMemoryIdempotencyRecord,
	getInMemoryIdempotencyRecord,
	persistResponseOrEvictOnFailure,
	queryDatabaseIdempotencyRecord,
	recordInFlightToDatabase,
	setInMemoryIdempotencyRecord,
} from "./idempotencyModules/idempotencyStorageEngine.js";
import {
	type GenericIdempotencyRecord,
	handleCachedRecord,
	sendConflict,
} from "./idempotencyModules/idempotencyReplayResponder.js";
import type {
	IdempotencyContext,
	IdempotencyPluginOptions,
	InMemoryRecord,
} from "./idempotencyModules/idempotencyTypes.js";

export type { IdempotencyPluginOptions };
export {
	extractTenantId,
	extractIdempotencyKey,
	extractPgErrorCode,
	clearInMemoryIdempotencyCache,
};

const idempotencyPluginAsync: FastifyPluginAsync<IdempotencyPluginOptions> = async (
	fastify: FastifyInstance,
	options: IdempotencyPluginOptions = {},
) => {
	if (options.disabled) return;

	const headerName = options.headerName?.toLowerCase();
	const allowedMethods = new Set(
		(options.methods ?? ["POST", "PUT", "PATCH"]).map((m) => m.toUpperCase()),
	);
	const retryAfter = options.retryAfterSeconds ?? 1;

	// 1. PRE-HANDLER HOOK
	fastify.addHook(
		"preHandler",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!allowedMethods.has(request.method.toUpperCase())) {
				return;
			}

			const idempotencyKey = extractIdempotencyKey(request, headerName);
			if (!idempotencyKey) {
				return;
			}

			const payloadHash = computePayloadHash(request.body ?? {});
			const tenantId = extractTenantId(request);
			const useDatabase =
				process.env.DENTAL_STATE_PERSISTENCE !== "off" &&
				tenantId !== null &&
				isValidUuid(tenantId);

			// Step 1: In-Memory Fast-Path Lock & Deduplication
			const memKey = `${tenantId ?? "global"}:${idempotencyKey}`;
			const existingMem = getInMemoryIdempotencyRecord(memKey);

			if (existingMem) {
				return handleCachedRecord(
					reply,
					idempotencyKey,
					payloadHash,
					existingMem,
					retryAfter,
				);
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
				let existingIdemKey: unknown;
				let existingSyncRecord: unknown;

				try {
					const dbRes = await queryDatabaseIdempotencyRecord(tenantId, idempotencyKey);
					existingIdemKey = dbRes.existingIdemKey;
					existingSyncRecord = dbRes.existingSyncRecord;
				} catch (dbReadErr) {
					request.log.warn(
						{ error: dbReadErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to read idempotency records from DB, continuing to fallback",
					);
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

				// Key is new: record in-flight row in PostgreSQL
				const inFlightRes = await recordInFlightToDatabase(tenantId, idempotencyKey, payloadHash);
				if (!inFlightRes.success) {
					if (inFlightRes.isConflict) {
						return sendConflict(reply, idempotencyKey, "in_flight", retryAfter);
					}
					request.log.error(
						{ error: inFlightRes.error, idempotencyKey },
						"[IdempotencyPlugin] Failed to write in-flight record to DB",
					);
				}
			}

			// Store idempotency context on request
			// biome-ignore lint/suspicious/noExplicitAny: request decoration
			(request as any)._idempotencyContext = {
				idempotencyKey,
				organizationId: tenantId,
				payloadHash,
				useDatabase,
			} as IdempotencyContext;
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
			// biome-ignore lint/suspicious/noExplicitAny: request decoration
			const ctx = (request as any)._idempotencyContext as
				| IdempotencyContext
				| undefined;

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
				// biome-ignore lint/suspicious/noExplicitAny: payload inspection
				parsedJson = payload as any;
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
			// biome-ignore lint/suspicious/noExplicitAny: request decoration
			const ctx = (request as any)._idempotencyContext as
				| IdempotencyContext
				| undefined;

			if (!ctx) return;
			await cleanupOnUncaughtError(ctx);
		},
	);
};

export const idempotencyPlugin = fp(idempotencyPluginAsync, {
	name: "dente-idempotency-plugin",
	fastify: "5.x",
});
