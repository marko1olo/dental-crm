import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { generateUuidV7 } from "@dental/shared";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
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

	const rawIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ??
		(request.headers["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined)
			: undefined);

	const idempotencyKey =
		typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
			? rawIdempotencyKey.trim()
			: generateUuidV7();

	reply.header("Idempotency-Key", idempotencyKey);

	const body =
		(request.body as
			| { status?: "signed" | "draft" | "voided" | "completed" | "in_progress" }
			| undefined) ?? {};

	try {
		const identity = getRequestIdentity(request);
		const result = await withTenantCtx(context.organizationId, async (tx) => {
			const workOrderResult = await VisitWorkOrderService.completeVisitWorkOrder({
				organizationId: context.organizationId,
				visitId,
				actorUserId: identity.userId ?? null,
				status: body.status ?? "signed",
				tx,
			});

			const [completedVisit] = await tx
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
					skipBomDeduction: true,
				});
			}

			return workOrderResult;
		});

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
