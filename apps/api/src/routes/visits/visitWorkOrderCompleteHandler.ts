import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { computePayloadHash, generateUuidV7 } from "@dental/shared";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db as database } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { visits } from "../../db/schema.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
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

	const existingRecord = await withTenantCtx(context.organizationId, async (tx) => {
		const [rec] = await tx
			.select()
			.from(idempotencyKeys)
			.where(
				and(
					eq(idempotencyKeys.clinicId, context.organizationId),
					eq(idempotencyKeys.key, idempotencyKey),
				),
			)
			.limit(1);
		return rec ?? null;
	});

	if (existingRecord) {
		if (existingRecord.status === "completed" && existingRecord.responseBody) {
			reply.header("idempotency-replayed", "true");
			return reply.code(existingRecord.responseCode || 200).send(existingRecord.responseBody);
		}
		if (existingRecord.status === "in_flight") {
			return reply.code(409).header("Retry-After", "1").send({
				error: "Conflict",
				message: "Операция завершения наряда с данным Idempotency-Key уже выполняется.",
			});
		}
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
				skipBomDeduction: true,
			});
		}

		await withTenantCtx(context.organizationId, async (tx) => {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: context.organizationId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody: { ...result } as Record<string, unknown>,
					responseCode: 200,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: { ...result } as Record<string, unknown>,
						responseCode: 200,
					},
				});
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
