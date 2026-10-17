import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { appointments, visits } from "../../db/schema.js";
import { acceptVisitDraftInDb } from "../../db/visitsQuery.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { buildEffectiveDraft } from "./buildEffectiveDraft.js";
import { executeVisitCompletionSideEffects } from "./visitCompletionEffects.js";
import {
	noActiveVisitId,
	sendVisitDraftMutationError,
	visitDraftNotFoundMessage,
} from "./visitErrors.js";

export async function handleCompleteVisit(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit complete",
	);
	if (!context) return;
	const orgId = context.organizationId;
	const { visitId } = request.params as { visitId: string };

	if (!visitId || visitId === noActiveVisitId) {
		return { ok: true, status: "completed", visitId: visitId || null };
	}

	try {
		const [existingVisit] = await database
			.select()
			.from(visits)
			.where(and(eq(visits.id, visitId), eq(visits.organizationId, orgId)))
			.limit(1);

		if (!existingVisit) {
			reply.code(404);
			return {
				error: "VisitNotFound",
				reason: "visit_not_found",
				message: visitDraftNotFoundMessage,
			};
		}

		if (existingVisit.status === "signed") {
			if (existingVisit.appointmentId) {
				await database
					.update(appointments)
					.set({ status: "completed" })
					.where(
						and(
							eq(appointments.id, existingVisit.appointmentId),
							eq(appointments.organizationId, orgId),
						),
					);
				wsBroker.broadcastToOrganization(orgId, {
					type: "APPOINTMENT_UPDATED",
					payload: {
						appointmentId: existingVisit.appointmentId,
						visitId,
						status: "completed",
					},
				});
			}
			return {
				ok: true,
				status: "completed",
				visit: existingVisit,
				alreadySigned: true,
			};
		}

		const body = (request.body as Record<string, any> | undefined) ?? {};
		const rawDraft = body.draft || body.diary || {};
		const effectiveDraft = buildEffectiveDraft(rawDraft, existingVisit);

		const acceptInput = {
			visitId,
			draft: effectiveDraft,
			doctorSummary: body.doctorSummary ?? existingVisit.doctorSummary ?? null,
			clientMutationId:
				body.clientMutationId ?? `complete-${visitId}-${Date.now()}`,
			baseRevision: existingVisit.revision,
			clientSavedAt: new Date().toISOString(),
		};

		const result = await acceptVisitDraftInDb(orgId, acceptInput);

		if (result?.visit) {
			await executeVisitCompletionSideEffects({
				orgId,
				visit: result.visit,
				doctorId: (request as { user?: { id?: string } }).user?.id ?? null,
				log: request.log,
			});
		}

		return {
			ok: true,
			status: "completed",
			visit: result.visit,
			saveReceipt: result.saveReceipt,
		};
	} catch (error) {
		request.log.error(error, "Ошибка в обработчике завершения приёма /complete");
		return sendVisitDraftMutationError(error, reply, "accept");
	}
}
