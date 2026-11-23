import { and, eq } from "drizzle-orm";
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
import { findPaymentByClientMutationIdInDb } from "../../../db/billingQuery.js";
import { narrowTaxDeductionCode } from "../../../db/billing/types.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import { payments } from "../../../db/schema.js";
import { processCashboxPayment } from "../../../routes/cashbox/cashboxPaymentProcessor.js";
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
			code: "IdempotencyKeyRequired",
			message: "Ключ операции (clientMutationId или заголовок Idempotency-Key) обязателен для предотвращения двойных списаний (Мандат 8bo / RFC 9562).",
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
		reply.header("idempotency-replayed", "true");
		reply.header("x-idempotency-replayed", "true");
		return reply.code(200).send(paymentSchema.parse(existingPayment));
	}

	const preflight = await preflightValidatePaymentEntities(orgId, input, reply);
	if (!preflight.ok) return reply;
	const paymentInput = preflight.paymentInput;

	try {
		const inputWithInvoice = paymentInput as typeof paymentInput & { invoiceId?: string };
		const cashboxResult = await processCashboxPayment(
			orgId,
			{
				...paymentInput,
				invoiceId: paymentInput.documentId ?? inputWithInvoice.invoiceId,
			},
			effectiveMutationId,
		);

		if (cashboxResult.statusCode !== 200) {
			return reply.code(cashboxResult.statusCode).send(cashboxResult.body);
		}

		const resultData = cashboxResult.body.data as Record<string, unknown>;
		const paymentId = typeof resultData.id === "string" ? resultData.id : "";
		const [paymentRow] = await withTenantCtx(orgId, async (tx) => {
			return await tx
				.select()
				.from(payments)
				.where(and(eq(payments.organizationId, orgId), eq(payments.id, paymentId)))
				.limit(1);
		});

		if (!paymentRow) {
			return reply.code(500).send({
				error: "PaymentNotFoundAfterCreation",
				message: `Платеж ${paymentId} не найден после проведения`,
			});
		}

		const isSplit =
			paymentInput.method === "split" ||
			paymentInput.method === "mixed" ||
			resultData.method === "split" ||
			paymentRow.method === "split";

		const formattedPayment = {
			id: paymentRow.id,
			organizationId: paymentRow.organizationId,
			patientId: paymentRow.patientId,
			visitId: paymentRow.visitId,
			documentId: paymentRow.documentId,
			amountRub: Number(resultData.amountRub ?? (paymentInput.amountRub ?? paymentRow.amountRub)),
			method: (isSplit ? "split" : paymentRow.method) as typeof paymentRow.method,
			status: paymentRow.status,
			paidAt: paymentRow.paidAt ? paymentRow.paidAt.toISOString() : null,
			createdAt: paymentRow.createdAt ? paymentRow.createdAt.toISOString() : new Date().toISOString(),
			fiscalReceiptNumber: paymentRow.fiscalReceiptNumber,
			fiscalReceiptIssuedAt: paymentRow.fiscalReceiptIssuedAt,
			fiscalReceiptUrl: paymentRow.fiscalReceiptUrl,
			fiscalReceipt: paymentRow.fiscalReceipt,
			clientMutationId: effectiveMutationId,
			payerFullName: paymentRow.payerFullName,
			payerInn: paymentRow.payerInn,
			payerBirthDate: paymentRow.payerBirthDate,
			payerIdentityDocument: paymentRow.payerIdentityDocument,
			payerRelationship: paymentRow.payerRelationship,
			taxDeductionCode: narrowTaxDeductionCode(paymentRow.taxDeductionCode),
			note: paymentRow.note,
		};

		if (resultData.isReplay) {
			reply.header("idempotency-replayed", "true");
			reply.header("x-idempotency-replayed", "true");
			return reply.code(200).send(paymentSchema.parse(formattedPayment));
		}
		try {
			const identity = getRequestIdentity(request);
			await recordAuditEventInDb(orgId, {
				entityType: "payment",
				entityId: formattedPayment.id,
				action: "payment_receive",
				reason: paymentInput.note ?? null,
				actorUserId: identity.userId ?? null,
			});
		} catch (auditErr) {
			request.log.warn({ err: auditErr, paymentId: formattedPayment.id, orgId }, "[billing] Ошибка аудита оплаты");
		}
		return reply.code(201).send(paymentSchema.parse(formattedPayment));
	} catch (error) {
		return handlePaymentCreationError(error, orgId, paymentInput, reply);
	}
}
