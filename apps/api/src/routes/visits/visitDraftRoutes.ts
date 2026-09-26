import {
	acceptVisitDraftResponseSchema,
	acceptVisitDraftSchema,
	visitDraftAutosaveRequestSchema,
	visitDraftAutosaveResponseSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { appointments } from "../../db/schema.js";
import {
	acceptVisitDraftInDb,
	getVisitDraftAutosaveFromDb,
	upsertVisitDraftAutosaveInDb,
	VisitSignedResponseIncompleteError,
} from "../../db/visitsQuery.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	noActiveVisitId,
	parseVisitPayload,
	sendNoActiveVisitRefusal,
	sendVisitDraftMutationError,
	visitDraftAcceptClosedMessage,
	visitDraftAcceptResponseIncompleteMessage,
	visitDraftAcceptValidationMessage,
	visitDraftAutosaveClosedMessage,
	visitDraftAutosaveValidationMessage,
	visitDraftNotFoundMessage,
	visitDraftSignedNoDraftMessage,
	visitDraftVoidedNoDraftMessage,
	visitRequestBody,
} from "./visitErrors.js";

export function registerVisitDraftRoutes(app: FastifyInstance) {
	app.get("/api/visits/:visitId/draft/autosave", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"visit draft read",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { visitId } = request.params as { visitId: string };
		// Метка «открытого приёма нет» (см. noActiveVisitId): читать черновик не у
		// чего, и это не отказ — пустой ответ 200 без обращения к базе.
		if (!visitId || visitId === noActiveVisitId) {
			return visitDraftAutosaveResponseSchema.parse({ serverDraft: null });
		}
		const lookup = await getVisitDraftAutosaveFromDb(orgId, visitId);
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
	});

	app.put("/api/visits/:visitId/draft/autosave", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit draft autosave",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { visitId } = request.params as { visitId: string };
		if (visitId === noActiveVisitId)
			return sendNoActiveVisitRefusal(reply, "autosave");
		const outcome = parseVisitPayload(
			visitDraftAutosaveRequestSchema,
			{ ...visitRequestBody(request.body), visitId },
			visitDraftAutosaveValidationMessage,
			reply,
		);
		if (!outcome.ok) return outcome.refusal;
		const input = outcome.data;

		try {
			if (process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR) {
				throw new Error(process.env.DENTAL_MOCK_UPSERT_VISIT_DRAFT_AUTOSAVE_ERROR);
			}
			const serverDraft = await upsertVisitDraftAutosaveInDb(orgId, input);
			return visitDraftAutosaveResponseSchema.parse({ serverDraft });
		} catch (error) {
			return sendVisitDraftMutationError(error, reply, "autosave");
		}
	});

	app.post("/api/visits/:visitId/draft/accept", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"visit draft accept",
		);
		if (!context) return;
		const orgId = context.organizationId;

		const { visitId } = request.params as { visitId: string };
		if (visitId === noActiveVisitId)
			return sendNoActiveVisitRefusal(reply, "accept");
		const outcome = parseVisitPayload(
			acceptVisitDraftSchema,
			{ ...visitRequestBody(request.body), visitId },
			visitDraftAcceptValidationMessage,
			reply,
		);
		if (!outcome.ok) return outcome.refusal;
		const input = outcome.data;

		let result: Awaited<ReturnType<typeof acceptVisitDraftInDb>>;
		try {
			if (process.env.DENTAL_MOCK_ACCEPT_VISIT_DRAFT_ERROR) {
				throw new Error(process.env.DENTAL_MOCK_ACCEPT_VISIT_DRAFT_ERROR);
			}
			result = await acceptVisitDraftInDb(orgId, input);
			// Атомарно переводим статус связанной записи расписания в "completed" при подписании приёма в PostgreSQL
			if (result?.visit?.appointmentId) {
				await database
					.update(appointments)
					.set({
						status: "completed",
					})
					.where(
						and(
							eq(appointments.id, result.visit.appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);

				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: result.visit.appointmentId,
						visitId: result.visit.id,
						status: "completed",
					},
				});
			}
		} catch (error) {
			if (error instanceof VisitSignedResponseIncompleteError) {
				request.log.error(
					{
						visitId: error.acceptedVisitId,
						revision: error.newRevision,
						cause: error.cause,
					},
					"Прием подписан, но слой доступа не собрал ответ по контракту acceptVisitDraftResponseSchema",
				);
				reply.code(500);
				return {
					error: "VisitDraftAcceptResponseIncomplete",
					reason: "visit_signed_response_incomplete",
					visitId: error.acceptedVisitId,
					revision: error.newRevision,
					message: visitDraftAcceptResponseIncompleteMessage,
				};
			}
			return sendVisitDraftMutationError(error, reply, "accept");
		}

		const response = acceptVisitDraftResponseSchema.safeParse(result);
		if (!response.success) {
			request.log.error(
				{
					visitId: result.visit.id,
					revision: result.visit.revision,
					issues: response.error.issues,
				},
				"Прием подписан, но ответ маршрута не собран по контракту acceptVisitDraftResponseSchema",
			);
			reply.code(500);
			return {
				error: "VisitDraftAcceptResponseIncomplete",
				reason: "visit_signed_response_incomplete",
				visitId: result.visit.id,
				revision: result.visit.revision,
				message: visitDraftAcceptResponseIncompleteMessage,
			};
		}
		return response.data;
	});
}
