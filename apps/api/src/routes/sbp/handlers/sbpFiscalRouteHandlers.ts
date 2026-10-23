import { createFiscalReceiptPayloadSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { FiscalInvoiceError } from "../fiscalReceiptService.js";
import { executeFiscalizeReceiptTransaction } from "../sbpPaymentService.js";

/**
 * 3. POST /api/billing/fiscalize-receipt
 * Формирование фискального чека (54-ФЗ / ФФД 1.2) с тегами 1054, 1212, 1214, 1199 (Без НДС ст. 149 НК РФ)
 * и категоризацией для налогового вычета по НДФЛ (Код 1 vs Код 2).
 */
export async function handleFiscalizeReceipt(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"fiscalize receipt",
	);
	if (!orgId) return;

	const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "FiscalReceiptValidationError",
			message: "Некорректные реквизиты фискального чека (54-ФЗ / ФФД 1.2).",
			details: parsed.error.format(),
		});
	}

	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);

	try {
		const result = await executeFiscalizeReceiptTransaction({
			orgId,
			input: parsed.data,
			headerIdempotencyKey,
			logWarn: (obj, msg) => request.log.warn(obj, msg),
		});

		switch (result.kind) {
			case "patient_not_found":
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден.",
				});
			case "invoice_not_found":
				return reply.code(404).send({
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден в этой клинике.",
				});
			case "idempotency_conflict":
				return reply.code(409).send({
					error: "IdempotencyConflict",
					message:
						"Ключ операции (clientMutationId) уже зарегистрирован с другими реквизитами платежа.",
				});
			case "existing_payment":
				return reply.code(200).send({
					success: true,
					payment: result.payment,
					fiscalReceiptNumber: result.fiscalReceiptNumber,
					isExisting: true,
				});
			case "created":
				return reply.code(201).send({
					success: true,
					payment: result.payment,
					fiscalReceiptNumber: result.fiscalReceiptNumber,
					queueId: result.queueId,
					queueStatus: result.queueStatus,
					ffd12Tags: result.ffd12Tags,
				});
		}
	} catch (err: unknown) {
		if (err instanceof FiscalInvoiceError) {
			return reply.code(err.statusCode).send({
				error: err.errorCode || "FiscalizationError",
				message: err.message,
			});
		}
		if (
			typeof err === "object" &&
			err !== null &&
			"statusCode" in err &&
			typeof (err as { statusCode: unknown }).statusCode === "number"
		) {
			const errorObj = err as { statusCode: number; errorCode?: string; message?: string };
			return reply.code(errorObj.statusCode).send({
				error: errorObj.errorCode || "FiscalizationError",
				message: errorObj.message || "Ошибка фискализации",
			});
		}
		throw err;
	}
}
