import { saveVisitSignatureInDb } from "../db/visitsQuery.js";
import {
	acceptVisitDraftResponseSchema,
	acceptVisitDraftSchema,
	visitDraftAutosaveRequestSchema,
	visitDraftAutosaveResponseSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";

type VisitPayloadSchema<T> = {
	safeParse: (
		value: unknown,
	) => { success: true; data: T } | { success: false };
};
type VisitDraftMutationOperation = "autosave" | "accept";

const visitDraftAutosaveValidationMessage =
	"Черновик приема не сохранен: передайте пациента, специальность, текст приема или заполненные поля черновика.";
const visitDraftAcceptValidationMessage =
	"Черновик приема не принят: передайте текст приема, заполненные поля черновика и данные сохранения врача.";
const visitDraftNotFoundMessage =
	"Прием не найден. Обновите рабочий экран и выберите актуальный прием.";
const visitDraftAutosaveClosedMessage =
	"Черновик приема не сохранен: этот прием уже недоступен для изменений.";
const visitDraftAcceptClosedMessage =
	"Черновик приема не принят: этот прием уже недоступен для изменений.";
const visitDraftMutationRejectedMessage =
	"Черновик приема не изменен: обновите прием и повторите действие.";

function visitRequestBody(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function parseVisitPayload<T>(
	schema: VisitPayloadSchema<T>,
	value: unknown,
	message: string,
	reply: FastifyReply,
): T | null {
	const parsed = schema.safeParse(value);
	if (!parsed.success) {
		reply.code(400).send({ error: "VisitDraftValidationError", message });
		return null;
	}
	return parsed.data;
}

function visitDraftDomainMessage(error: unknown): string {
	if (!(error instanceof Error)) return "";
	return error.message.trim();
}

function sendVisitDraftMutationError(
	error: unknown,
	reply: FastifyReply,
	operation: VisitDraftMutationOperation,
) {
	const message = visitDraftDomainMessage(error);
	if (message === "Визит не найден") {
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

import {
	acceptVisitDraftInDb,
	getVisitDraftAutosaveFromDb,
	upsertVisitDraftAutosaveInDb,
	getVisitGnathologyFromDb,
	upsertVisitGnathologyInDb,
} from "../db/visitsQuery.js";

export async function registerVisitRoutes(app: FastifyInstance) {
	app.get("/api/visits/:visitId/draft/autosave", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"visit draft autosave read",
		);
		if (!orgId) return;

		const { visitId } = request.params as { visitId: string };
		// Zero UUID = placeholder for "no active visit" — return empty 200, not 404
		if (!visitId || visitId === "00000000-0000-0000-0000-000000000000") {
			return visitDraftAutosaveResponseSchema.parse({ serverDraft: null });
		}
		const draft = await getVisitDraftAutosaveFromDb(orgId, visitId);
		if (!draft)
			return reply
				.code(404)
				.send({ error: "VisitNotFound", message: visitDraftNotFoundMessage });
		return visitDraftAutosaveResponseSchema.parse({ serverDraft: draft });
	});

	app.put("/api/visits/:visitId/draft/autosave", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"visit draft autosave update",
		);
		if (!orgId) return;

		const { visitId } = request.params as { visitId: string };
		const input = parseVisitPayload(
			visitDraftAutosaveRequestSchema,
			{ ...visitRequestBody(request.body), visitId },
			visitDraftAutosaveValidationMessage,
			reply,
		);
		if (!input) return;

		try {
			const serverDraft = await upsertVisitDraftAutosaveInDb(orgId, input);
			return visitDraftAutosaveResponseSchema.parse({ serverDraft });
		} catch (error) {
			return sendVisitDraftMutationError(error, reply, "autosave");
		}
	});

	app.post("/api/visits/:visitId/draft/accept", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"visit draft accept",
		);
		if (!orgId) return;

		const { visitId } = request.params as { visitId: string };
		const input = parseVisitPayload(
			acceptVisitDraftSchema,
			{ ...visitRequestBody(request.body), visitId },
			visitDraftAcceptValidationMessage,
			reply,
		);
		if (!input) return;

		try {
			const userContext = (request as any).user;
			const userId: string | null = userContext?.id ?? null;
			const result = await acceptVisitDraftInDb(orgId, userId, input);
			return acceptVisitDraftResponseSchema.parse(result);
		} catch (error) {
			return sendVisitDraftMutationError(error, reply, "accept");
		}
	});

	app.post("/api/visits/:visitId/draft/sign", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"visit sign"
		);
		if (!orgId) return;

		const { visitId } = request.params as { visitId: string };
		const payload = request.body as any;

		if (!payload.signatureBase64 || !payload.thumbprint || !payload.signatureProvider) {
			return reply.code(400).send({ error: "Missing signature payload data" });
		}

		try {
			const userContext = (request as any).user;
			const userId = userContext?.id ?? "00000000-0000-0000-0000-000000000000";

			await saveVisitSignatureInDb({
				visitId,
				doctorId: userId,
				patientId: payload.patientId, // Passed from frontend for linking
				signatureBase64: payload.signatureBase64,
				thumbprint: payload.thumbprint,
				signatureProvider: payload.signatureProvider
			});

			return reply.send({ success: true, message: "Signed successfully" });
		} catch (error) {
			return reply.code(500).send({ error: "Internal error saving signature" });
		}
	});
	app.get("/api/visits/:visitId/gnathology", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply, "read gnathology");
		if (!orgId) return;

		const { visitId } = request.params as { visitId: string };
		try {
			const gnathology = await getVisitGnathologyFromDb(visitId);
			return reply.send(gnathology || {});
		} catch (error) {
			return reply.code(500).send({ error: "Internal error reading gnathology" });
		}
	});

	app.put("/api/visits/:visitId/gnathology", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(request, reply, "update gnathology");
		if (!orgId) return;

		const { visitId } = request.params as { visitId: string };
		const payload = request.body as any;

		if (!payload.patientId) {
			return reply.code(400).send({ error: "Missing patientId" });
		}

		try {
			const data: any = {
				occlusionType: payload.occlusionType,
				jawShift: payload.jawShift,
				tmjState: payload.tmjState,
				osteopathicStatus: payload.osteopathicStatus,
			};
			if (payload.mouthOpeningMm) {
				data.mouthOpeningMm = Number(payload.mouthOpeningMm);
			}
			await upsertVisitGnathologyInDb(visitId, payload.patientId, data);
			return reply.send({ success: true });
		} catch (error) {
			return reply.code(500).send({ error: "Internal error saving gnathology" });
		}
	});

}