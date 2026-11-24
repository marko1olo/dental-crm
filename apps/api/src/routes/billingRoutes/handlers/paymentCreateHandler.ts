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

function buildCashboxPaymentPayload(
	paymentInput: CreatePaymentInput,
	effectiveMutationId: string,
): Record<string, unknown> {
	const resolvedInvoiceId =
		paymentInput.documentId ?? paymentInput.invoiceId ?? undefined;
	const resolvedMethod =
		paymentInput.method === "mixed" ? "split" : paymentInput.method;

	const payload: Record<string, unknown> = {
		amountRub: paymentInput.amountRub,
		method: resolvedMethod,
		clientMutationId: effectiveMutationId,
		idempotencyKey: effectiveMutationId,
	};

	if (paymentInput.patientId !== undefined) payload.patientId = paymentInput.patientId;
	if (paymentInput.visitId !== undefined) payload.visitId = paymentInput.visitId;
	if (resolvedInvoiceId) payload.invoiceId = resolvedInvoiceId;
	if (typeof paymentInput.amountKopecks === "number") {
		payload.amountKopecks = paymentInput.amountKopecks;
	}
	if (typeof paymentInput.discountPercent === "number") {
		payload.discountPercent = paymentInput.discountPercent;
	}
	if (paymentInput.payerFullName) payload.payerFullName = paymentInput.payerFullName;
	if (paymentInput.payerInn !== undefined) payload.payerInn = paymentInput.payerInn;
	if (paymentInput.payerBirthDate !== undefined) {
		payload.payerBirthDate = paymentInput.payerBirthDate;
	}
	if (paymentInput.payerIdentityDocument !== undefined) {
		payload.payerIdentityDocument = paymentInput.payerIdentityDocument;
	}
	if (paymentInput.payerRelationship !== undefined) {
		payload.payerRelationship = paymentInput.payerRelationship;
	}
	if (paymentInput.guaranteeLetterId) {
		payload.guaranteeLetterId = paymentInput.guaranteeLetterId;
	}
	if (typeof paymentInput.allowOverdraft === "boolean") {
		payload.allowOverdraft = paymentInput.allowOverdraft;
	}
	if (typeof paymentInput.isUrgentCare === "boolean") {
		payload.isUrgentCare = paymentInput.isUrgentCare;
	}
	if (typeof paymentInput.isEmergency === "boolean") {
		payload.isEmergency = paymentInput.isEmergency;
	}
	if (typeof paymentInput.hasAcutePain === "boolean") {
		payload.hasAcutePain = paymentInput.hasAcutePain;
	}
	if (typeof paymentInput.cashAmountKopecks === "number") {
		payload.cashAmountKopecks = paymentInput.cashAmountKopecks;
	}
	if (typeof paymentInput.electronicAmountKopecks === "number") {
		payload.electronicAmountKopecks = paymentInput.electronicAmountKopecks;
	}
	if (typeof paymentInput.sbpAmountKopecks === "number") {
		payload.sbpAmountKopecks = paymentInput.sbpAmountKopecks;
	}
	if (typeof paymentInput.dmsAmountKopecks === "number") {
		payload.dmsAmountKopecks = paymentInput.dmsAmountKopecks;
	}
	if (typeof paymentInput.depositAmountKopecks === "number") {
		payload.depositAmountKopecks = paymentInput.depositAmountKopecks;
	}
	if (typeof paymentInput.familyDepositAmountKopecks === "number") {
		payload.familyDepositAmountKopecks = paymentInput.familyDepositAmountKopecks;
	}
	if (typeof paymentInput.certificateAmountKopecks === "number") {
		payload.certificateAmountKopecks = paymentInput.certificateAmountKopecks;
	}
	if (typeof paymentInput.bonusAmountKopecks === "number") {
		payload.bonusAmountKopecks = paymentInput.bonusAmountKopecks;
	}
	if (typeof paymentInput.cashAmountRub === "number") {
		payload.cashAmountRub = paymentInput.cashAmountRub;
	}
	if (typeof paymentInput.electronicAmountRub === "number") {
		payload.electronicAmountRub = paymentInput.electronicAmountRub;
	}
	if (typeof paymentInput.sbpAmountRub === "number") {
		payload.sbpAmountRub = paymentInput.sbpAmountRub;
	}
	if (typeof paymentInput.dmsAmountRub === "number") {
		payload.dmsAmountRub = paymentInput.dmsAmountRub;
	}
	if (typeof paymentInput.depositAmountRub === "number") {
		payload.depositAmountRub = paymentInput.depositAmountRub;
	}
	if (typeof paymentInput.familyDepositAmountRub === "number") {
		payload.familyDepositAmountRub = paymentInput.familyDepositAmountRub;
	}
	if (typeof paymentInput.certificateAmountRub === "number") {
		payload.certificateAmountRub = paymentInput.certificateAmountRub;
	}
	if (typeof paymentInput.bonusAmountRub === "number") {
		payload.bonusAmountRub = paymentInput.bonusAmountRub;
	} else if (typeof paymentInput.pointsToRedeem === "number") {
		payload.bonusAmountRub = paymentInput.pointsToRedeem;
	}
	if (paymentInput.taxDeductionCode) {
		payload.taxDeductionCode = paymentInput.taxDeductionCode;
	}
	if (paymentInput.note) payload.note = paymentInput.note;
	if (paymentInput.fiscalReceiptNumber !== undefined) {
		payload.fiscalReceiptNumber = paymentInput.fiscalReceiptNumber;
	}
	if (paymentInput.fiscalReceiptIssuedAt !== undefined) {
		payload.fiscalReceiptIssuedAt = paymentInput.fiscalReceiptIssuedAt;
	}
	return payload;
}

export async function handleCreatePayment(
	request: FastifyRequest,
	reply: FastifyReply,
	overrideBody?: Record<string, unknown>,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "billing payment create"))) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}
	const parsedInput = createPaymentSchema.safeParse(overrideBody ?? request.body);
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
		const cashboxResult = await processCashboxPayment(
			orgId,
			buildCashboxPaymentPayload(paymentInput, effectiveMutationId),
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
