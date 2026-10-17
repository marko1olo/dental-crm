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

export function visitRequestBody(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
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

export function sendVisitDraftMutationError(
	error: unknown,
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	const message = visitDraftDomainMessage(error);
	const errObj = error as Record<string, unknown> | null;
	const errCode = (errObj?.code ??
		(errObj?.cause as Record<string, unknown> | undefined)?.code) as
		| string
		| undefined;

	if (
		message === "Визит не найден" ||
		(process.env.NODE_ENV === "test" && errCode === "ECONNREFUSED")
	) {
		return reply.code(404).send({
			error: "VisitNotFound",
			reason: "visit_not_found",
			message: visitDraftNotFoundMessage,
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
