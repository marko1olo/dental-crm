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

declare module "fastify" {
	interface FastifyRequest {
		_idempotencyContext?: IdempotencyContext;
	}
}

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
	const enforceForPaths = options.enforceForPaths ?? [
		/^\/api\/documents(?:\/[^/]+\/(?:issue|void|signature|sign-ukep))?$/,
		/^\/api\/prescriptions(?:\/[^/]+\/sign-ukep)?$/,
		/^\/api\/(?:billing|finance|v1\/billing|v1\/finance)\/payments/,
		/^\/api\/invoices\/(?:generate-from-plan|validate-plan)/,
		/^\/api\/billing\/refunds\/partial/,
		/^\/api\/insurance\/split-invoice/,
		/^\/api\/clinical\/lab-orders/,
		/^\/api\/(?:v1\/)?visits\/[^/]+\/complete/,
		/^\/api\/(?:v1\/)?visits\/[^/]+\/(?:complete-work-order|work-order\/complete)/,
		/^\/api\/(?:v1\/)?visits\/[^/]+\/consumables/,
		/^\/api\/(?:v1\/)?visits\/[^/]+\/apply-plan-items/,
		/^\/api\/finance\/family\/[^/]+\/deposit/,
		/^\/api\/cash\/(?:cash-introduction|cash-withdrawal|transfer)/,
		/^\/api\/cashbox\/transfers/,
		/^\/api\/installments\/tranches\/[^/]+\/pay/,
		/^\/api\/installment-payments\/[^/]+\/pay/,
		/^\/api\/lab\/orders\/[^/]+\/pay/,
		/^\/api\/portal\/appointments/,
		/^\/api\/portal\/payments/,
		/^\/api\/public\/booking\/(?:[^/]+\/)?book/,
		/^\/api\/public\/booking\/create/,
		/^\/api\/sanpin\/sterilization\/(?:quick-norm|shift-batch|cycles)/,
		/^\/api\/sanpin\/shift-autofill/,
		/^\/api\/registers\/(?:autofill-shift|autofill-month|sanpin\/shift-close)/,
		/^\/api\/registers\/(?:bactericidal\/(?:shift-autopilot|open-morning-shift|close-evening-shift)|medical-waste\/quick-shift-bundle|cleaning\/autopilot-month)/,
		/^\/api\/(?:v1\/payroll|payroll|doctor)\/(?:close-settlement|close-settlement-period)/,
		/^\/api\/telephony(?:\/[^/]+)?\/calls\/end$/,
		/^\/api\/telephony(?:\/[^/]+)?\/outbound-call$/,
		/^\/api\/telephony\/sip\/transfer$/,
		/^\/api\/(?:periodontogram|perio)(?:\/.*)?$/,
		/^\/api\/inventory(?:\/[^/]+)?\/(?:acceptance-waybill|waybills|invoices|shift-batch-deduct|shift-deduct|quick-carpule-disposal)$/,
		/^\/api\/treatment-plans(?:\/.*)?$/,
		/^\/api\/patients\/[^/]+\/treatment-plans(?:\/.*)?$/,
		/^\/api\/orthodontics(?:\/.*)?$/,
		/^\/api\/agent\/(?:action|confirm)/,
	];

	// 1. PRE-HANDLER HOOK
	fastify.addHook(
		"preHandler",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!allowedMethods.has(request.method.toUpperCase())) {
				return;
			}

			const url = request.url.split("?")[0] || request.url;
			const isEnforced = enforceForPaths.some((p) =>
				typeof p === "string" ? url.startsWith(p) : p.test(url),
			);

			const idempotencyKey = extractIdempotencyKey(request, headerName);
			if (!idempotencyKey) {
				if (isEnforced) {
					if (process.env.NODE_ENV === "test" && process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1") {
						return;
					}
					reply.code(400);
					return reply.send({
						error: "IdempotencyKeyRequired",
						message:
							"Для финансовых и складских операций обязателен заголовок Idempotency-Key (UUIDv7).",
					});
				}
				return;
			}

			if (isEnforced && !isValidUuid(idempotencyKey)) {
				reply.code(400);
				return reply.send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
				});
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
			request._idempotencyContext = {
				idempotencyKey,
				organizationId: tenantId,
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
