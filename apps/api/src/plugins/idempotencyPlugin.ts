/**
 * idempotencyPlugin.ts — Fastify Idempotency De-duplication Guard Plugin.
 *
 * Enforces exactly-once execution for mutating HTTP requests (POST, PUT, PATCH):
 *   1. Checks `X-Idempotency-Key` header.
 *   2. Computes canonical SHA-256 payload hash via computePayloadHash(@dental/shared).
 *   3. Queries `sync_idempotency_records` table in PostgreSQL under tenant RLS context.
 *   4. If key exists & completed: returns cached HTTP response code and body immediately
 *      without executing the route handler!
 *   5. If key is in-flight: returns 409 Conflict with `Retry-After: 1` header.
 *   6. If key is new: records in-flight state and payload hash, allows handler to execute,
 *      and saves the final response in `sync_idempotency_records` in onSend hook.
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
import { syncIdempotencyRecords } from "../db/schema.js";

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
	return null;
}

/**
 * Extracts idempotency key from request headers with case-insensitive normalization.
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
		request.headers["x-idempotence-key"];
	const str = Array.isArray(standardVal) ? standardVal[0] : standardVal;
	return typeof str === "string" && str.trim() ? str.trim() : null;
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

			if (useDatabase && tenantId) {
				// PostgreSQL Database Path under Tenant RLS
				let existingRecord:
					| typeof syncIdempotencyRecords.$inferSelect
					| undefined;

				try {
					await withTenantCtx(tenantId, async (tx) => {
						const [found] = await tx
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
						existingRecord = found;
					});
				} catch (dbReadErr) {
					request.log.warn(
						{ error: dbReadErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to read sync_idempotency_records, continuing to fallback",
					);
				}

				if (existingRecord) {
					// Check for hash mismatch on same idempotency key
					if (existingRecord.payloadHash !== payloadHash) {
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
						existingRecord.action === "in_flight" ||
						existingRecord.responseStatus === 0
					) {
						reply.header("Retry-After", String(retryAfter));
						reply.header("X-Idempotency-Key", idempotencyKey);
						reply.header("X-Idempotency-Status", "in-flight");
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"An identical request is currently in-flight. Please retry shortly.",
						});
					}

					// Return cached completed response
					reply.header("X-Idempotency-Key", idempotencyKey);
					reply.header("X-Idempotency-Status", "replayed");
					reply.header("X-Cache-Lookup", "HIT");
					reply.code(existingRecord.responseStatus);

					if (
						existingRecord.responseJson !== null &&
						existingRecord.responseJson !== undefined
					) {
						reply.type("application/json");
						return reply.send(existingRecord.responseJson);
					}
					return reply.send();
				}

				// Key is new: record in-flight row
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
				} catch (insertErr: unknown) {
					// Handle race condition: unique index violation ("organization_id", "idempotency_key")
					// biome-ignore lint/suspicious/noExplicitAny: error code probing
					const err = insertErr as any;
					if (err?.code === "23505") {
						reply.header("Retry-After", String(retryAfter));
						reply.header("X-Idempotency-Key", idempotencyKey);
						reply.header("X-Idempotency-Status", "in-flight");
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"An identical request is currently in-flight. Please retry shortly.",
						});
					}
					request.log.error(
						{ error: insertErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to write in-flight record to DB",
					);
				}
			} else {
				// In-memory fallback path
				const memKey = `${tenantId ?? "global"}:${idempotencyKey}`;
				const existing = inMemoryIdempotencyCache.get(memKey);

				if (existing) {
					if (existing.payloadHash !== payloadHash) {
						reply.header("X-Idempotency-Key", idempotencyKey);
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"Idempotency-Key collision: same key was previously processed with a different request payload.",
						});
					}

					if (existing.action === "in_flight") {
						reply.header("Retry-After", String(retryAfter));
						reply.header("X-Idempotency-Key", idempotencyKey);
						reply.header("X-Idempotency-Status", "in-flight");
						return reply.code(409).send({
							statusCode: 409,
							error: "Conflict",
							message:
								"An identical request is currently in-flight. Please retry shortly.",
						});
					}

					reply.header("X-Idempotency-Key", idempotencyKey);
					reply.header("X-Idempotency-Status", "replayed");
					reply.header("X-Cache-Lookup", "HIT");
					reply.code(existing.responseStatus);
					if (existing.responseJson) {
						reply.type("application/json");
						return reply.send(existing.responseJson);
					}
					return reply.send();
				}

				// Record in-flight in memory
				inMemoryIdempotencyCache.set(memKey, {
					idempotencyKey,
					payloadHash,
					responseStatus: 0,
					responseJson: null,
					action: "in_flight",
					createdAt: Date.now(),
				});
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

			if (useDatabase && organizationId) {
				try {
					if (statusCode >= 500) {
						// On server error, remove in-flight record so subsequent retries are allowed
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
					} else {
						// Normal response (< 500): record final HTTP status and response payload
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
					}
				} catch (updateErr) {
					request.log.error(
						{ error: updateErr, idempotencyKey },
						"[IdempotencyPlugin] Failed to save completed response to sync_idempotency_records",
					);
				}
			} else {
				// Update in-memory record
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
			if (useDatabase && organizationId) {
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
					// Ignore cleanup errors on error path
				}
			} else {
				const memKey = `${organizationId ?? "global"}:${idempotencyKey}`;
				inMemoryIdempotencyCache.delete(memKey);
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
