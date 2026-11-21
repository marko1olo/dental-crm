import { kopecksToRubles, resolveInvoiceTotalAmountRub } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { invoiceItems, patientInvoices, payments } from "../../../db/schema/billing.js";
import { lookupSberTransactionInvoice } from "./sberInvoiceLookupHelper.js";

/** GET /api/invoices/:id & /api/v1/billing/invoices/:id */
export async function handleGetInvoiceById(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (reply.sent) return;
	const context = await requireClinicalReadContext(
		request,
		reply,
		"get invoice",
	);
	if (!context) return;
	const orgId = context.organizationId;

	const { id } = request.params as { id: string };
	if (!id) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор счёта обязателен.",
		});
	}

	const isUuid =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			id,
		);
	let invoiceRow: typeof patientInvoices.$inferSelect | undefined;

	if (isUuid) {
		const [found] = await db
			.select()
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.organizationId, orgId),
					eq(patientInvoices.id, id),
				),
			)
			.limit(1);
		invoiceRow = found;
	}

	if (invoiceRow) {
		const isPaid = invoiceRow.status === "paid";
		const totalAmountRub = resolveInvoiceTotalAmountRub({
			totalAmountRub: invoiceRow.totalAmountRub,
			totalRub: invoiceRow.totalRub,
		});

		let actualFiscalReceiptNumber: string | null = null;
		if (isPaid) {
			const [linkedPayment] = await db
				.select({ fiscalReceiptNumber: payments.fiscalReceiptNumber })
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.documentId, invoiceRow.id),
					),
				)
				.limit(1);
			actualFiscalReceiptNumber = linkedPayment?.fiscalReceiptNumber || null;
		}

		const itemRows = await db
			.select()
			.from(invoiceItems)
			.where(
				and(
					eq(invoiceItems.organizationId, orgId),
					eq(invoiceItems.invoiceId, invoiceRow.id),
				),
			);

		const items = itemRows.map((it) => ({
			id: it.id,
			serviceId: it.priceListItemId || it.serviceCode || undefined,
			serviceCode: it.serviceCode || undefined,
			code: it.serviceCode || undefined,
			toothCode: it.toothCode,
			toothNumber: it.toothCode ? Number(it.toothCode) || undefined : undefined,
			title: it.name,
			name: it.name,
			quantity: Number(it.quantity) || 1,
			unitPriceRub: kopecksToRubles(it.unitPriceKopecks),
			priceRub: kopecksToRubles(it.totalPriceKopecks),
			discountRub: 0,
			totalAmountRub: kopecksToRubles(it.totalPriceKopecks),
		}));

		return reply.code(200).send({
			id: invoiceRow.id,
			organizationId: invoiceRow.organizationId,
			status: invoiceRow.status,
			isPaid,
			totalAmountRub,
			paidAmountRub: isPaid ? totalAmountRub : 0,
			remainingAmountRub: isPaid ? 0 : totalAmountRub,
			paidAtIso: invoiceRow.paidAt ? invoiceRow.paidAt.toISOString() : null,
			fiscalReceiptNumber: actualFiscalReceiptNumber,
			fiscalReceiptId: actualFiscalReceiptNumber,
			patientId: invoiceRow.patientId,
			visitId: invoiceRow.visitId,
			createdAt: invoiceRow.createdAt.toISOString(),
			items,
		});
	}

	const sberResult = await lookupSberTransactionInvoice({ db, orgId, id });
	if (sberResult) {
		return reply.code(200).send(sberResult);
	}

	return reply.code(404).send({
		error: "InvoiceNotFound",
		message: `Счёт с идентификатором '${id}' не найден.`,
	});
}
