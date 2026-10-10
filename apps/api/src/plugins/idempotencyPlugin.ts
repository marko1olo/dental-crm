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
import { and, eq, sql } from "drizzle-orm";
import type {
	FastifyInstance,
	FastifyPluginAsync,
	FastifyReply,
	FastifyRequest,
} from "fastify";
import fp from "fastify-plugin";
import { withTenantCtx } from "../db/rls.js";
import { idempotencyKeys, syncIdempotencyRecords } from "../db/schema.js";

export interface IdempotencyPluginOptions {
	/** Header name to check for idempotency key. Defaults to 'x-idempotency-key'. */
	headerName?: string;
	/** Mutating HTTP methods to guard. Defaults to ['POST', 'PUT', 'PATCH']. */
	methods?: string[];
	/** Value for Retry-After header in seconds for in-flight requests. Defaults to 1. */
	retryAfterSeconds?: number;
	/** Global disable switch. */
	disabled?: boolean;
}

interface IdempotencyContext {
	idempotencyKey: string;
	organizationId: string | null;
	payloadHash: string;
	useDatabase: boolean;
}

interface InMemoryRecord {
	idempotencyKey: string;
	payloadHash: string;
	responseStatus: number;
	responseJson: Record<string, unknown> | null;
	action: "in_flight" | "completed";
	createdAt: number;
}

// In-memory fallback map for unauthenticated or non-database contexts
const inMemoryIdempotencyCache = new Map<string, InMemoryRecord>();

function isValidUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		id,
	);
}

/**
 * Extracts organization/tenant ID from Fastify request identity.
 */
export function extractTenantId(request: FastifyRequest): string | null {
	// biome-ignore lint/suspicious/noExplicitAny: request decorations
	const req = request as any;
	if (typeof req.tenantId === "string" && req.tenantId.trim()) {
		return req.tenantId.trim();
	}
	if (typeof req.user?.organizationId === "string" && req.user.organizationId.trim()) {
		return req.user.organizationId.trim();
	}
	const headerOrg = request.headers["x-organization-id"];
	const orgStr = Array.isArray(headerOrg) ? headerOrg[0] : headerOrg;
	if (typeof orgStr === "string" && orgStr.trim()) {
		return orgStr.trim();
	}
	if (req.params && typeof req.params.organizationId === "string" && req.params.organizationId.trim()) {
		return req.params.organizationId.trim();
	}
	if (req.body && typeof req.body === "object") {
		if (typeof req.body.organizationId === "string" && req.body.organizationId.trim()) {
			return req.body.organizationId.trim();
		}
		if (typeof req.body.clinicId === "string" && req.body.clinicId.trim()) {
			return req.body.clinicId.trim();
		}
	}
	return null;
}

/**
 * Extracts idempotency key from request headers or body with case-insensitive normalization.
 */
export function extractIdempotencyKey(
	request: FastifyRequest,
	customHeader?: string,
): string | null {
	if (customHeader) {
		const customVal = request.headers[customHeader.toLowerCase()];
		const valStr = Array.isArray(customVal) ? customVal[0] : customVal;
		if (typeof valStr === "string" && valStr.trim()) {
			return valStr.trim();
		}
	}
	const standardVal =
		request.headers["x-idempotency-key"] ||
		request.headers["idempotency-key"] ||
		request.headers["x-idempotence-key"];
	const str = Array.isArray(standardVal) ? standardVal[0] : standardVal;
	if (typeof str === "string" && str.trim()) {
		return str.trim();
	}

	// Fallback to request body fields (idempotencyKey or clientMutationId)
	if (request.body && typeof request.body === "object") {
		const b = request.body as Record<string, unknown>;
		if (typeof b.idempotencyKey === "string" && b.idempotencyKey.trim()) {
			return b.idempotencyKey.trim();
		}
		if (typeof b.clientMutationId === "string" && b.clientMutationId.trim()) {
			return b.clientMutationId.trim();
		}
	}

	return null;
}

export function extractPgErrorCode(error: unknown): string | null {
	if (!error || typeof error !== "object") return null;
	const candidate = error as { code?: unknown; cause?: unknown };
	if (typeof candidate.code === "string") return candidate.code;
	if (candidate.cause) return extractPgErrorCode(candidate.cause);
	return null;
}

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
			const existingMem = inMemoryIdempotencyCache.get(memKey);

			if (existingMem) {
				if (existingMem.payloadHash !== payloadHash) {
					reply.header("X-Idempotency-Key", idempotencyKey);
					return reply.code(409).send({
						statusCode: 409,
						error: "Conflict",
						message:
							"Idempotency-Key collision: same key was previously processed with a different request payload.",
					});
				}

				if (existingMem.action === "in_flight") {
					reply.header("Retry-After", String(retryAfter));
					reply.header("X-Idempotency-Key", idempotencyKey);
					reply.header("X-Idempotency-Status", "in-flight");
					return reply.code(409).send({
						statusCode: 409,
						error: "Conflict",
						message:
							"Запрос уже обрабатывается (in-flight). Пожалуйста, повторите попытку через секунду.",
					});
				}

				// Completed response in memory
				reply.header("X-Idempotency-Key", idempotencyKey);
				reply.header("X-Idempotency-Status", "replayed");
				reply.header("X-Cache-Lookup", "HIT");

				let replayedStatus = existingMem.responseStatus;
				let replayedBody: unknown = existingMem.responseJson;

				if (
					existingMem.responseJson &&
					typeof existingMem.responseJson === "object" &&
					"replayed" in existingMem.responseJson
				) {
					replayedBody = {
						...existingMem.responseJson,
						replayed: true,
					};
					if (replayedStatus === 201) {
						replayedStatus = 200;
					}
				}

				reply.code(replayedStatus);
				if (replayedBody !== null && replayedBody !== undefined) {
					reply.type("application/json");
					return reply.send(replayedBody);
				}
				return reply.send();
			}

			// Optimistically set in-flight in memory to prevent concurrent intra-process double execution
			inMemoryIdempotencyCache.set(memKey, {
				idempotencyKey,
				payloadHash,
				responseStatus: 0,
				responseJson: null,
				action: "in_flight",
				createdAt: Date.now(),
			});

			if (useDatabase && tenantId) {
				// PostgreSQL Database Path under Tenant RLS
				let existingIdemKey:
					| typeof idempotencyKeys.$inferSelect
					| undefined;
				let existingSyncRecord:
					| typeof syncIdempotencyRecords.$inferSelect
					| undefined;

				try {
					await withTenantCtx(tenantId, async (tx) => {
						const [foundKey] = await tx
							.select()
							.from(idempotencyKeys)
							.where(
								and(
									eq(idempotencyKeys.clinicId, tenantId),
									eq(idempotencyKeys.key, idempotencyKey),
								),
							)
							.limit(1);
						existingIdemKey = foundKey;

						if (!existingIdemKey) {
							const [foundSync] = await tx
								.select()
								.from(syncIdempotencyRecords)
								.where(
									and(
										eq(syncIdempotencyRecords.organizationId, tenantId),
										eq(
											syncIdempotencyRecords.idempotencyKey,
											idempotencyKey,
										),
									),
								)
								.limit(1);
							existingSyncRecord = foundSync;
						}
					});
				} catch (dbReadErr) {
					request.log.warn(
						{ error: dbReadErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to read idempotency records from DB, continuing to fallback",
					);
				}

				if (existingIdemKey) {
					// Check for hash mismatch on same idempotency key
					if (existingIdemKey.payloadHash && existingIdemKey.payloadHash !== payloadHash) {
						inMemoryIdempotencyCache.delete(memKey);
						reply.header("X-Idempotency-Key", idempotencyKey);
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"Idempotency-Key collision: same key was previously processed with a different request payload.",
						});
					}

					// Check in-flight
					if (
						existingIdemKey.status === "in_flight" ||
						existingIdemKey.responseCode === 0
					) {
						reply.header("Retry-After", String(retryAfter));
						reply.header("X-Idempotency-Key", idempotencyKey);
						reply.header("X-Idempotency-Status", "in-flight");
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"Запрос уже обрабатывается (in-flight). Пожалуйста, повторите попытку через секунду.",
						});
					}

					// Sync in-memory cache with DB completed response
					inMemoryIdempotencyCache.set(memKey, {
						idempotencyKey,
						payloadHash,
						responseStatus: existingIdemKey.responseCode || 200,
						responseJson: existingIdemKey.responseBody as Record<string, unknown> | null,
						action: "completed",
						createdAt: Date.now(),
					});

					// Return cached completed response
					reply.header("X-Idempotency-Key", idempotencyKey);
					reply.header("X-Idempotency-Status", "replayed");
					reply.header("X-Cache-Lookup", "HIT");
					reply.code(existingIdemKey.responseCode || 200);

					if (
						existingIdemKey.responseBody !== null &&
						existingIdemKey.responseBody !== undefined
					) {
						reply.type("application/json");
						return reply.send(existingIdemKey.responseBody);
					}
					return reply.send();
				}

				if (existingSyncRecord) {
					if (existingSyncRecord.payloadHash !== payloadHash) {
						inMemoryIdempotencyCache.delete(memKey);
						reply.header("X-Idempotency-Key", idempotencyKey);
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"Idempotency-Key collision: same key was previously processed with a different request payload.",
						});
					}

					if (
						existingSyncRecord.action === "in_flight" ||
						existingSyncRecord.responseStatus === 0
					) {
						reply.header("Retry-After", String(retryAfter));
						reply.header("X-Idempotency-Key", idempotencyKey);
						reply.header("X-Idempotency-Status", "in-flight");
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"Запрос уже обрабатывается (in-flight). Пожалуйста, повторите попытку через секунду.",
						});
					}

					inMemoryIdempotencyCache.set(memKey, {
						idempotencyKey,
						payloadHash,
						responseStatus: existingSyncRecord.responseStatus,
						responseJson: existingSyncRecord.responseJson,
						action: "completed",
						createdAt: Date.now(),
					});

					reply.header("X-Idempotency-Key", idempotencyKey);
					reply.header("X-Idempotency-Status", "replayed");
					reply.header("X-Cache-Lookup", "HIT");

					let replayedStatus = existingSyncRecord.responseStatus;
					let replayedBody: unknown = existingSyncRecord.responseJson;

					if (
						existingSyncRecord.responseJson &&
						typeof existingSyncRecord.responseJson === "object" &&
						"replayed" in (existingSyncRecord.responseJson as Record<string, unknown>)
					) {
						replayedBody = {
							...(existingSyncRecord.responseJson as Record<string, unknown>),
							replayed: true,
						};
						if (replayedStatus === 201) {
							replayedStatus = 200;
						}
					}

					reply.code(replayedStatus);

					if (replayedBody !== null && replayedBody !== undefined) {
						reply.type("application/json");
						return reply.send(replayedBody);
					}
					return reply.send();
				}

				// Key is new: record in-flight row in PostgreSQL idempotency_keys
				try {
					await withTenantCtx(tenantId, async (tx) => {
						await tx.insert(idempotencyKeys).values({
							clinicId: tenantId,
							key: idempotencyKey,
							status: "in_flight",
							payloadHash,
							responseCode: 0,
							responseBody: null,
							lockedAt: new Date(),
						});
					});
				} catch (insertErr: unknown) {
					// Handle race condition: unique index violation ("clinic_id", "key")
					const pgCode = extractPgErrorCode(insertErr);
					const errStr = String(insertErr);
					if (
						pgCode === "23505" ||
						errStr.includes("23505") ||
						errStr.includes("unique constraint") ||
						errStr.includes("idempotency_keys_clinic_key_idx")
					) {
						reply.header("Retry-After", String(retryAfter));
						reply.header("X-Idempotency-Key", idempotencyKey);
						reply.header("X-Idempotency-Status", "in-flight");
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"Запрос уже обрабатывается (in-flight). Пожалуйста, повторите попытку через секунду.",
						});
					}
					request.log.error(
						{ error: insertErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to write in-flight record to DB",
					);
				}

				// Dual-persist to syncIdempotencyRecords for sync compatibility in independent transaction
				try {
					await withTenantCtx(tenantId, async (tx) => {
						await tx.insert(syncIdempotencyRecords).values({
							organizationId: tenantId,
							idempotencyKey,
							payloadHash,
							entityKind: "payment" as const,
							entityId: idempotencyKey,
							action: "in_flight",
							responseStatus: 0,
							responseJson: null,
						});
					});
				} catch {
					// Ignored if sync table fails or duplicates
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

			const { idempotencyKey, organizationId, useDatabase } = ctx;
			const statusCode = reply.statusCode;

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

			// Always maintain in-memory record regardless of DB persistence
			const memKey = `${organizationId ?? "global"}:${idempotencyKey}`;
			if (statusCode >= 500) {
				inMemoryIdempotencyCache.delete(memKey);
			} else {
				inMemoryIdempotencyCache.set(memKey, {
					idempotencyKey,
					payloadHash: ctx.payloadHash,
					responseStatus: statusCode,
					responseJson: parsedJson,
					action: "completed",
					createdAt: Date.now(),
				});
			}

			if (useDatabase && organizationId) {
				try {
					if (statusCode >= 500) {
						// On server error, remove in-flight record so subsequent retries are allowed
						await withTenantCtx(organizationId, async (tx) => {
							await tx
								.delete(idempotencyKeys)
								.where(
									and(
										eq(idempotencyKeys.clinicId, organizationId),
										eq(idempotencyKeys.key, idempotencyKey),
									),
								);
						});

						try {
							await withTenantCtx(organizationId, async (tx) => {
								await tx
									.delete(syncIdempotencyRecords)
									.where(
										and(
											eq(
												syncIdempotencyRecords.organizationId,
												organizationId,
											),
											eq(
												syncIdempotencyRecords.idempotencyKey,
												idempotencyKey,
											),
										),
									);
							});
						} catch {
							// Ignored
						}
					} else {
						// Normal response (< 500): record final HTTP status and response payload
						await withTenantCtx(organizationId, async (tx) => {
							await tx
								.update(idempotencyKeys)
								.set({
									responseCode: statusCode,
									responseBody: parsedJson,
									status: "completed",
									lockedAt: new Date(),
								})
								.where(
									and(
										eq(idempotencyKeys.clinicId, organizationId),
										eq(idempotencyKeys.key, idempotencyKey),
									),
								);
						});

						try {
							await withTenantCtx(organizationId, async (tx) => {
								await tx
									.update(syncIdempotencyRecords)
									.set({
										responseStatus: statusCode,
										responseJson: parsedJson,
										action: "completed",
										updatedAt: new Date(),
									})
									.where(
										and(
											eq(
												syncIdempotencyRecords.organizationId,
												organizationId,
											),
											eq(
												syncIdempotencyRecords.idempotencyKey,
												idempotencyKey,
											),
										),
									);
							});
						} catch {
							// Ignored
						}
					}
				} catch (updateErr) {
					request.log.error(
						{ error: updateErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to save completed response to idempotency_keys",
					);
				}
			}

			reply.header("X-Idempotency-Key", idempotencyKey);
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

			const { idempotencyKey, organizationId, useDatabase } = ctx;
			const memKey = `${organizationId ?? "global"}:${idempotencyKey}`;
			inMemoryIdempotencyCache.delete(memKey);

			if (useDatabase && organizationId) {
				try {
					await withTenantCtx(organizationId, async (tx) => {
						await tx
							.delete(idempotencyKeys)
							.where(
								and(
									eq(idempotencyKeys.clinicId, organizationId),
									eq(idempotencyKeys.key, idempotencyKey),
								),
							);
					});

					try {
						await withTenantCtx(organizationId, async (tx) => {
							await tx
								.delete(syncIdempotencyRecords)
								.where(
									and(
										eq(
											syncIdempotencyRecords.organizationId,
											organizationId,
										),
										eq(
											syncIdempotencyRecords.idempotencyKey,
											idempotencyKey,
										),
									),
								);
						});
					} catch {
						// Ignored
					}
				} catch {
					// Ignore cleanup errors on error path
				}
			}
		},
	);
};

export const idempotencyPlugin = fp(idempotencyPluginAsync, {
	name: "dente-idempotency-plugin",
	fastify: "5.x",
});

export function clearInMemoryIdempotencyCache(): void {
	inMemoryIdempotencyCache.clear();
}
