import type { FastifyReply } from "fastify";
import {
	visitDraftAcceptClosedMessage,
	visitDraftAcceptNoActiveVisitMessage,
	visitDraftAutosaveClosedMessage,
	visitDraftAutosaveNoActiveVisitMessage,
	visitDraftMutationRejectedMessage,
	visitDraftNotFoundMessage,
} from "./visitErrorMessages.js";

export * from "./visitErrorMessages.js";
export * from "./visitOpenErrors.js";

export type VisitPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};
export type VisitDraftMutationOperation = "autosave" | "accept";

export function sendNoActiveVisitRefusal(
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	reply.code(409);
	return {
		error: "VisitDraftMutationRejected",
		reason: "no_active_visit",
		message:
			operation === "accept"
				? visitDraftAcceptNoActiveVisitMessage
				: visitDraftAutosaveNoActiveVisitMessage,
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function visitRequestBody(value: unknown): Record<string, unknown> {
	return isRecord(value) ? value : {};
}

export type VisitPayloadOutcome<T> =
	| { readonly ok: true; readonly data: T }
	| {
			readonly ok: false;
			readonly refusal: { readonly error: string; readonly message: string };
	  };

export function parseVisitPayload<T>(
	schema: VisitPayloadSchema<T>,
	value: unknown,
	message: string,
	reply: FastifyReply,
): VisitPayloadOutcome<T> {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		reply.code(400);
		return {
			ok: false,
			refusal: { error: "VisitDraftValidationError", message },
		};
	}
	return { ok: true, data: parsed.data };
}

export function visitDraftDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return error.message.trim();
}

function readVisitErrorCode(error: unknown): string | undefined {
	if (!isRecord(error)) return undefined;
	if (typeof error.code === "string") return error.code;
	if (isRecord(error.cause) && typeof error.cause.code === "string") {
		return error.cause.code;
	}
	return undefined;
}

export interface VisitDraftMutationErrorOptions {
	/**
	 * Explicit DI option for isolated unit tests without a running database.
	 * Production callers keep this `false` so ECONNREFUSED never masks DB outages as 404.
	 */
	readonly treatDbUnavailableAsNotFound?: boolean | undefined;
}

export function sendVisitDraftMutationError(
	error: unknown,
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
	options?: VisitDraftMutationErrorOptions,
) {
	const message = visitDraftDomainMessage(error);
	const errCode = readVisitErrorCode(error);

	if (
		message === "Визит не найден" ||
		(options?.treatDbUnavailableAsNotFound === true && errCode === "ECONNREFUSED")
	) {
		return reply.code(404).send({
			error: "VisitNotFound",
			reason: "visit_not_found",
			message: visitDraftNotFoundMessage,
		});
	}
	if (
		message === "VISIT_PROTOCOL_LOCKED" ||
		errCode === "VISIT_PROTOCOL_LOCKED" ||
		message === "Протокол приёма подписан и защищён от изменений." ||
		message.includes("подписан и защищён от изменений")
	) {
		return reply.code(422).send({
			error: "VISIT_PROTOCOL_LOCKED",
			reason: "visit_protocol_locked",
			message: "Протокол приёма подписан и защищён от изменений.",
		});
	}
	if (message === "Прием уже закрыт или аннулирован") {
		return reply.code(409).send({
			error: "VisitDraftMutationRejected",
			reason: "visit_closed",
			message:
				operation === "accept"
					? visitDraftAcceptClosedMessage
					: visitDraftAutosaveClosedMessage,
		});
	}
	return reply.code(409).send({
		error: "VisitDraftMutationRejected",
		reason: "visit_draft_rejected",
		message: visitDraftMutationRejectedMessage,
	});
}

export function sendVisitProtocolLockedError(reply: FastifyReply) {
	return reply.code(422).send({
		error: "VISIT_PROTOCOL_LOCKED",
		message: "Протокол приёма подписан и защищён от изменений.",
	});
}
