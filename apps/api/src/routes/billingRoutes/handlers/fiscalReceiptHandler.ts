import { createFiscalReceiptPayloadSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import {
	FiscalInvoiceError,
	executeFiscalizeReceiptTransaction,
} from "../../sbp/fiscalReceiptService.js";

/**
 * 54-FZ Cashbox Fiscal Receipt Handler.
 * Zero mandatory INN for physical persons (Mandate 8e, item 9 / Mandate 8n).
 * Generates official cashbox receipt with 0 float errors.
 */
export async function handleFiscalReceipt(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"fiscal receipt create",
	);
	if (!orgId) return;

	const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "FiscalReceiptValidationError",
			message: "Некорректные реквизиты кассового чека (54-ФЗ).",
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
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден." });
			case "invoice_not_found":
				return reply.code(404).send({ error: "InvoiceNotFound", message: "Счёт не найден." });
			case "idempotency_conflict":
				return reply.code(409).send({
					error: "IdempotencyConflict",
					message: "Операция с данным ключом уже зарегистрирована с другими реквизитами.",
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
		throw err;
	}
}
