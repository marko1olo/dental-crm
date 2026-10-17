import {
	acceptVisitDraftResponseSchema,
	acceptVisitDraftSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import {
	acceptVisitDraftInDb,
	VisitSignedResponseIncompleteError,
} from "../../db/visitsQuery.js";
import { executeVisitCompletionSideEffects } from "./visitCompletionEffects.js";
import {
	noActiveVisitId,
	parseVisitPayload,
	sendNoActiveVisitRefusal,
	sendVisitDraftMutationError,
	visitDraftAcceptResponseIncompleteMessage,
	visitDraftAcceptValidationMessage,
	visitRequestBody,
} from "./visitErrors.js";

export async function handleAcceptVisitDraft(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit draft accept",
	);
	if (!context) return;
	const orgId = context.organizationId;
	const { visitId } = request.params as { visitId: string };

	if (visitId === noActiveVisitId) {
		return sendNoActiveVisitRefusal(reply, "accept");
	}
	const outcome = parseVisitPayload(
		acceptVisitDraftSchema,
		{ ...visitRequestBody(request.body), visitId },
		visitDraftAcceptValidationMessage,
		reply,
	);
	if (!outcome.ok) return outcome.refusal;

	let result: Awaited<ReturnType<typeof acceptVisitDraftInDb>>;
	try {
		if (process.env.DENTAL_MOCK_ACCEPT_VISIT_DRAFT_ERROR) {
			throw new Error(process.env.DENTAL_MOCK_ACCEPT_VISIT_DRAFT_ERROR);
		}
		result = await acceptVisitDraftInDb(orgId, outcome.data);
		if (result?.visit) {
			await executeVisitCompletionSideEffects({
				orgId,
				visit: result.visit,
				doctorId: (request as { user?: { id?: string } }).user?.id ?? null,
				log: request.log,
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
}
