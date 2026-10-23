import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { recordAuditEventInDb } from "../../../db/auditQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { enforcePermissionWhenStaffKnown } from "../../../security/permissions.js";
import {
	PartialRefundService,
	PartialRefundValidationError,
} from "../../../services/billing/PartialRefundService.js";
import { partialRefundBodySchema } from "../types.js";

export async function handlePartialRefund(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalMutationAccess(
			request,
			reply,
			"billing partial refund create",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing partial refund create",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsed = partialRefundBodySchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "InvalidPartialRefundInput",
			message: "Некорректные параметры запроса частичного возврата.",
			details: parsed.error.issues,
		});
	}

	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const effectiveMutationId =
		parsed.data.clientMutationId?.trim() || headerIdempotencyKey?.trim();

	try {
		const result = await PartialRefundService.executePartialRefund({
			organizationId: orgId,
			...parsed.data,
			clientMutationId: effectiveMutationId,
		});

		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "payment_refund",
				entityId: result.paymentId,
				action: "payment_refund",
				reason: parsed.data.customReasonDetailsRu || parsed.data.reasonCategory || null,
				actorUserId: identity.userId ?? null,
			});
		} catch (auditErr) {
			request.log.warn(
				{ err: auditErr, orgId },
				"[billing] Не удалось записать событие частичного возврата в журнал аудита",
			);
		}

		return reply.code(200).send(result);
	} catch (err) {
		if (err instanceof PartialRefundValidationError) {
			if (err.code === "DuplicateRefundMutation") {
				return reply.code(200).send({
					success: true,
					paymentId: (err.details as any)?.paymentId,
					isIdempotentReplay: true,
					message: err.message,
				});
			}
			const statusCode = err.code === "OverRefundExceeded" ? 422 : 400;
			return reply.code(statusCode).send({
				error: err.code,
				message: err.message,
				details: err.details,
			});
		}
		request.log.error({ err }, "Partial refund failed");
		return reply.code(500).send({
			error: "PartialRefundInternalError",
			message:
				"Не удалось провести операцию частичного возврата. Обратитесь к администратору.",
		});
	}
}
