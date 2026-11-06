import {
	visitDraftAutosaveRequestSchema,
	visitDraftAutosaveResponseSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import {
	getVisitDraftAutosaveFromDb,
	upsertVisitDraftAutosaveInDb,
} from "../../db/visitsQuery.js";
import {
	noActiveVisitId,
	parseVisitPayload,
	sendNoActiveVisitRefusal,
	sendVisitDraftMutationError,
	visitDraftAutosaveValidationMessage,
	visitDraftNotFoundMessage,
	visitDraftSignedNoDraftMessage,
	visitDraftVoidedNoDraftMessage,
	visitRequestBody,
} from "./visitErrors.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleGetVisitDraft(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalReadContext(
		request,
		reply,
		"visit draft read",
	);
	if (!context) return;
	const orgId = context.organizationId;
	const { visitId } = request.params as { visitId: string };

	const trimmedVisitId = typeof visitId === "string" ? visitId.trim() : "";
	if (!trimmedVisitId || trimmedVisitId === noActiveVisitId) {
		return visitDraftAutosaveResponseSchema.parse({ serverDraft: null });
	}

	if (!UUID_PATTERN.test(trimmedVisitId)) {
		reply.code(400);
		return {
			error: "VisitValidationError",
			reason: "invalid_uuid",
			message: "Некорректный идентификатор приёма (ожидается UUID).",
		};
	}

	try {
		const lookup = await getVisitDraftAutosaveFromDb(orgId, trimmedVisitId);
		if (lookup.outcome === "visit_absent") {
			reply.code(404);
			return {
				error: "VisitNotFound",
				reason: "visit_not_found",
				message: visitDraftNotFoundMessage,
			};
		}
		if (lookup.outcome === "no_draft") {
			reply.code(404);
			return {
				error: "VisitDraftAbsent",
				reason: lookup.status === "signed" ? "visit_signed" : "visit_voided",
				visitId: lookup.visitId,
				visitStatus: lookup.status,
				signedAt: lookup.signedAt,
				message:
					lookup.status === "signed"
						? visitDraftSignedNoDraftMessage
						: visitDraftVoidedNoDraftMessage,
			};
		}
		return visitDraftAutosaveResponseSchema.parse({
			serverDraft: lookup.serverDraft,
		});
	} catch (error) {
		request.log.error(error, "Ошибка получения черновика приёма");
		reply.code(500);
		return {
			error: "InternalServerError",
			message: "Не удалось загрузить черновик приёма.",
		};
	}
}

export async function handlePutVisitDraft(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit draft autosave",
	);
	if (!context) return;
	const orgId = context.organizationId;
	const { visitId } = request.params as { visitId: string };

	if (visitId === noActiveVisitId) {
		return sendNoActiveVisitRefusal(reply, "autosave");
	}
	const outcome = parseVisitPayload(
		visitDraftAutosaveRequestSchema,
		{ ...visitRequestBody(request.body), visitId },
		visitDraftAutosaveValidationMessage,
		reply,
	);
	if (!outcome.ok) return outcome.refusal;

	try {
		if (process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR) {
			throw new Error(process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR);
		}
		const serverDraft = await upsertVisitDraftAutosaveInDb(orgId, outcome.data);
		return visitDraftAutosaveResponseSchema.parse({ serverDraft });
	} catch (error) {
		return sendVisitDraftMutationError(error, reply, "autosave");
	}
}
