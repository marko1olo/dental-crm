import { createFiscalReceiptPayloadSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { FiscalInvoiceError } from "../fiscalReceiptService.js";
import { executeFiscalizeReceiptTransaction } from "../sbpPaymentService.js";

/**
 * Normalizes incoming fiscal receipt DTO to eliminate client/queue schema discrepancies.
 * Gracefully extracts nested `payload` if dispatched from offline queue wrappers.
 */
function normalizeFiscalReceiptBody(body: unknown): unknown {
	if (typeof body !== "object" || body === null) return body;
	const b = body as Record<string, unknown>;

	// If body contains nested payload (from useFiscalOperations or offline queue), merge and flatten
	const inner =
		typeof b.payload === "object" && b.payload !== null
			? (b.payload as Record<string, unknown>)
			: {};

	const patientId = b.patientId ?? inner.patientId;
	const visitId = b.visitId ?? inner.visitId;
	const invoiceId = b.invoiceId ?? inner.invoiceId;
	const clientMutationId =
		b.idempotencyKey ??
		b.clientMutationId ??
		inner.idempotencyKey ??
		inner.clientMutationId;
	const customerContact =
		b.customerContact ??
		inner.customerContact ??
		b.patientPhoneOrEmail ??
		inner.patientPhoneOrEmail ??
		"+79990000000";
	const customerName =
		b.customerName ?? inner.customerName ?? b.patientName ?? inner.patientName;
	const cashierFullName =
		b.cashierFullName ??
		inner.cashierFullName ??
		b.cashierName ??
		inner.cashierName ??
		"Кассир-администратор";

	const rawItems = (b.items ?? inner.items) as Array<Record<string, unknown>> | undefined;
	const totalKopRaw =
		b.totalKopecks ??
		inner.totalKopecks ??
		(b.totalRub
			? Math.round(Number(b.totalRub) * 100)
			: inner.totalRub
				? Math.round(Number(inner.totalRub) * 100)
				: undefined);

	let normalizedItems = rawItems;
	if (Array.isArray(rawItems) && rawItems.length > 0) {
		normalizedItems = rawItems.map((it) => {
			const priceKop =
				it.priceKopecks !== undefined
					? Number(it.priceKopecks)
					: it.priceRub !== undefined
						? Math.round(Number(it.priceRub) * 100)
						: 0;
			const qty = Number(it.quantity || 1);
			const amountKop =
				it.amountKopecks !== undefined
					? Number(it.amountKopecks)
					: priceKop * qty;
			return {
				name: String(it.name || "Стоматологические услуги"),
				priceKopecks: priceKop,
				quantity: qty,
				amountKopecks: amountKop,
				method: it.method || "full_payment",
				subject: it.subject || "service",
				vatRate: it.vatRate || "vat_none",
				measure: it.measure || "piece",
				...(it.medicalServiceCode804n
					? { medicalServiceCode804n: String(it.medicalServiceCode804n) }
					: {}),
				...(it.code804n
					? { medicalServiceCode804n: String(it.code804n) }
					: {}),
			};
		});
	} else if (totalKopRaw !== undefined && Number(totalKopRaw) > 0) {
		normalizedItems = [
			{
				name: "Стоматологические услуги",
				priceKopecks: Number(totalKopRaw),
				quantity: 1,
				amountKopecks: Number(totalKopRaw),
				method: "full_payment",
				subject: "service",
				vatRate: "vat_none",
				measure: "piece",
			},
		];
	}

	const totalKopecks =
		totalKopRaw !== undefined
			? Number(totalKopRaw)
			: normalizedItems
				? normalizedItems.reduce(
						(acc, it) => acc + (Number(it.amountKopecks) || 0),
						0,
					)
				: 0;

	const paymentType = (b.paymentType ?? inner.paymentType ?? "card") as string;
	let cashKopecks = Number(b.cashKopecks ?? inner.cashKopecks ?? 0);
	let electronicCardKopecks = Number(
		b.electronicCardKopecks ?? inner.electronicCardKopecks ?? 0,
	);
	let sbpKopecks = Number(b.sbpKopecks ?? inner.sbpKopecks ?? 0);
	let prepaidKopecks = Number(b.prepaidKopecks ?? inner.prepaidKopecks ?? 0);
	const creditKopecks = Number(b.creditKopecks ?? inner.creditKopecks ?? 0);

	// If individual tender kopecks sum up to 0 but totalKopecks > 0, allocate based on paymentType
	if (
		cashKopecks +
			electronicCardKopecks +
			sbpKopecks +
			prepaidKopecks +
			creditKopecks ===
			0 &&
		totalKopecks > 0
	) {
		if (paymentType === "cash") {
			cashKopecks = totalKopecks;
		} else if (paymentType === "sbp") {
			sbpKopecks = totalKopecks;
		} else if (paymentType === "deposit" || paymentType === "family_wallet") {
			prepaidKopecks = totalKopecks;
		} else {
			electronicCardKopecks = totalKopecks;
		}
	}

	return {
		...inner,
		...b,
		patientId,
		visitId,
		invoiceId,
		clientMutationId,
		customerContact,
		customerName,
		cashierFullName,
		items: normalizedItems,
		totalKopecks,
		cashKopecks,
		electronicCardKopecks,
		sbpKopecks,
		prepaidKopecks,
		creditKopecks,
	};
}

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

	const normalizedBody = normalizeFiscalReceiptBody(request.body);
	const parsed = createFiscalReceiptPayloadSchema.safeParse(normalizedBody);
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
