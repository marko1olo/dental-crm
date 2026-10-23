import {
	type CreatePaymentInput,
	createPaymentSchema,
	paymentSchema,
} from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { recordAuditEventInDb } from "../../../db/auditQuery.js";
import {
	createPaymentInDb,
	findPaymentByClientMutationIdInDb,
} from "../../../db/billingQuery.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { enforcePermissionWhenStaffKnown } from "../../../security/permissions.js";
import { paymentValidationDetail } from "../fiscalReceiptService.js";
import {
	paymentRetryMatchesExisting,
	sendBillingPaymentScopeError,
} from "../paymentProcessingService.js";
import { handlePaymentCreationError } from "./paymentErrorHandler.js";
import { preflightValidatePaymentEntities } from "./paymentPreflightHelper.js";

export async function handleCreatePayment(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "billing payment create"))) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}
	const parsedInput = createPaymentSchema.safeParse(request.body);
	if (!parsedInput.success) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message: paymentValidationDetail(parsedInput.error.issues),
		});
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "billing payment create");
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const rawInput: CreatePaymentInput = parsedInput.data;
	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const effectiveMutationId =
		rawInput.clientMutationId?.trim() || headerIdempotencyKey?.trim();

	if (!effectiveMutationId) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message: "Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения двойных списаний.",
		});
	}
	const input: CreatePaymentInput = { ...rawInput, clientMutationId: effectiveMutationId };
	const existingPayment = await findPaymentByClientMutationIdInDb(orgId, input.clientMutationId);
	if (existingPayment?.patientId) {
		if (!paymentRetryMatchesExisting(existingPayment, input)) {
			return sendBillingPaymentScopeError(
				reply,
				409,
				"Клиентская операция с данным ключом уже существует с другими параметрами платежа.",
			);
		}
		return reply.code(200).send(paymentSchema.parse(existingPayment));
	}

	const preflight = await preflightValidatePaymentEntities(orgId, input, reply);
	if (!preflight.ok) return reply;
	const paymentInput = preflight.paymentInput;

	try {
		const payment = await createPaymentInDb(orgId, paymentInput);
		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "payment",
				entityId: payment.id,
				action: "payment_receive",
				reason: paymentInput.note ?? null,
				actorUserId: identity.userId ?? null,
			});
		} catch (auditErr) {
			request.log.warn({ err: auditErr, paymentId: payment.id, orgId }, "[billing] Ошибка аудита оплаты");
		}
		return reply.code(201).send(paymentSchema.parse(payment));
	} catch (error) {
		return handlePaymentCreationError(error, orgId, paymentInput, reply);
	}
}
