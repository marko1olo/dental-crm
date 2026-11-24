import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { isValidUuid } from "@dental/shared";
import { z } from "zod";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { visits } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	VisitWorkOrderError,
	VisitWorkOrderService,
} from "../../services/clinical/VisitWorkOrderService.js";
import { extractIdempotencyKey } from "../../utils/httpIdempotency.js";
import { executeVisitCompletionSideEffects } from "./visitCompletionEffects.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const completeWorkOrderBodySchema = z
	.object({
		status: z
			.enum(["signed", "draft", "voided", "completed", "in_progress"])
			.optional(),
		idempotencyKey: z.string().optional(),
		clientMutationId: z.string().optional(),
	})
	.strict();

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

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey) {
		if (!isValidUuid(idempotencyKey)) {
			reply.code(400);
			return {
				error: "InvalidIdempotencyKey",
				message:
					"Заголовок Idempotency-Key / X-Idempotency-Key должен содержать валидный UUID (рекомендуется UUIDv7).",
			};
		}
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const parsedBody = completeWorkOrderBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		reply.code(400);
		return {
			error: "ValidationError",
			message: "Некорректные параметры завершения наряда приёма.",
			issues: parsedBody.error.issues,
		};
	}
	const body = parsedBody.data;

	try {
		const identity = getRequestIdentity(request);
		const { workOrderResult, completedVisit } = await withTenantCtx(
			context.organizationId,
			async (tx) => {
				const completedWorkOrder =
					await VisitWorkOrderService.completeVisitWorkOrder({
						organizationId: context.organizationId,
						visitId,
						actorUserId: identity.userId ?? null,
						status: body.status ?? "signed",
						tx,
					});

				const [visitRow] = await tx
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

				return {
					workOrderResult: completedWorkOrder,
					completedVisit: visitRow ?? null,
				};
			},
		);

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
