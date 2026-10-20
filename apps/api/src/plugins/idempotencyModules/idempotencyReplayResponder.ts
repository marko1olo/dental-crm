/**
 * idempotencyReplayResponder.ts — HTTP Replay & Conflict Response Handler (Layer 3).
 *
 * Formats exactly-once idempotent replay replies and handles 409 Conflict/In-Flight negotiations.
 */

import type { FastifyReply } from "fastify";

/**
 * Sends 409 Conflict for either payload hash collision or in-flight processing.
 */
export function sendConflict(
	reply: FastifyReply,
	idempotencyKey: string,
	reason: "collision" | "in_flight",
	retryAfter = 1,
): FastifyReply {
	reply.header("X-Idempotency-Key", idempotencyKey);

	if (reason === "in_flight") {
		reply.header("Retry-After", String(retryAfter));
		reply.header("X-Idempotency-Status", "in-flight");
		return reply.code(409).send({
			statusCode: 409,
			error: "Conflict",
			message:
				"Запрос уже обрабатывается (in-flight). Пожалуйста, повторите попытку через секунду.",
		});
	}

	return reply.code(409).send({
		statusCode: 409,
		error: "Conflict",
		message:
			"Idempotency-Key collision: same key was previously processed with a different request payload.",
	});
}

/**
 * Replays previously saved completed HTTP response with canonical headers.
 */
export function sendReplay(
	reply: FastifyReply,
	idempotencyKey: string,
	statusCode: number,
	responseBody: unknown,
): FastifyReply {
	reply.header("X-Idempotency-Key", idempotencyKey);
	reply.header("X-Idempotency-Status", "replayed");
	reply.header("X-Cache-Lookup", "HIT");

	let replayedStatus = statusCode || 200;
	let replayedBody: unknown = responseBody;

	if (
		responseBody &&
		typeof responseBody === "object" &&
		"replayed" in (responseBody as Record<string, unknown>)
	) {
		replayedBody = {
			...(responseBody as Record<string, unknown>),
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

export interface GenericIdempotencyRecord {
	payloadHash: string | null;
	status?: string;
	action?: string;
	responseCode?: number;
	responseStatus?: number;
	responseBody?: unknown;
	responseJson?: unknown;
}

/**
 * Handles cached record verification, hash collision check, in-flight check, and replay.
 */
export function handleCachedRecord(
	reply: FastifyReply,
	idempotencyKey: string,
	expectedHash: string,
	record: GenericIdempotencyRecord,
	retryAfter = 1,
	onHashMismatch?: () => void,
	onCompleted?: (status: number, body: unknown) => void,
): FastifyReply {
	if (record.payloadHash && record.payloadHash !== expectedHash) {
		if (onHashMismatch) onHashMismatch();
		return sendConflict(reply, idempotencyKey, "collision");
	}

	const isInFlight =
		record.status === "in_flight" ||
		record.action === "in_flight" ||
		record.responseCode === 0 ||
		record.responseStatus === 0;

	if (isInFlight) {
		return sendConflict(reply, idempotencyKey, "in_flight", retryAfter);
	}

	const status = record.responseCode ?? record.responseStatus ?? 200;
	const body = record.responseBody ?? record.responseJson ?? null;
	if (onCompleted) {
		onCompleted(status, body);
	}
	return sendReplay(reply, idempotencyKey, status, body);
}
