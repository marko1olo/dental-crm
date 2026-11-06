import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	VisitWorkOrderError,
	VisitWorkOrderService,
} from "../../services/clinical/VisitWorkOrderService.js";
import { executeVisitCompletionSideEffects } from "./visitCompletionEffects.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleCompleteVisitWorkOrder(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"visit work order complete",
	);
	if (!context) return;

	const { visitId } = request.params as { visitId: string };
	if (!visitId || !UUID_PATTERN.test(visitId.trim())) {
		reply.code(400);
		return {
			error: "ValidationError",
			message: "Некорректный идентификатор приёма (ожидается UUID).",
		};
	}
	const body =
		(request.body as
			| { status?: "signed" | "draft" | "voided" | "completed" | "in_progress" }
			| undefined) ?? {};

	try {
		const identity = getRequestIdentity(request);
		const result = await VisitWorkOrderService.completeVisitWorkOrder({
			organizationId: context.organizationId,
			visitId,
			actorUserId: identity.userId ?? null,
			status: body.status ?? "signed",
		});

		const [completedVisit] = await database
			.select({
				id: visits.id,
				organizationId: visits.organizationId,
				patientId: visits.patientId,
				appointmentId: visits.appointmentId,
				diagnosis: visits.diagnosis,
				treatmentPlan: visits.treatmentPlan,
				complaint: visits.complaint,
				objectiveStatus: visits.objectiveStatus,
				doctorSummary: visits.doctorSummary,
			})
			.from(visits)
			.where(
				and(
					eq(visits.id, visitId),
					eq(visits.organizationId, context.organizationId),
				),
			)
			.limit(1);

		if (completedVisit) {
			await executeVisitCompletionSideEffects({
				orgId: context.organizationId,
				visit: completedVisit,
				doctorId: identity.userId ?? null,
				log: request.log,
			});
		}

		return result;
	} catch (error) {
		if (error instanceof VisitWorkOrderError) {
			reply.code(error.statusCode);
			return { error: error.code, message: error.message };
		}
		request.log.error(
			error,
			"Непредвиденная ошибка завершения наряда приёма и списания материалов",
		);
		reply.code(500);
		return {
			error: "InternalServerError",
			message: "Не удалось завершить наряд приёма и списать материалы.",
		};
	}
}
