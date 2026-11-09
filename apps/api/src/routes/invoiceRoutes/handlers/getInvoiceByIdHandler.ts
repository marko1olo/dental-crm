import { resolveInvoiceTotalAmountRub } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patientInvoices, payments } from "../../../db/schema/billing.js";
import { treatmentItems } from "../../../db/schema/clinical.js";
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
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, orgId),
					or(
						invoiceRow.visitId ? eq(treatmentItems.visitId, invoiceRow.visitId) : sql`FALSE`,
						sql`${treatmentItems.notes} LIKE ${`%${invoiceRow.id}%`}`,
					),
				),
			);

		const items = itemRows.map((it) => ({
			id: it.id,
			serviceId: it.serviceId,
			serviceCode: it.serviceId || undefined,
			code: it.serviceId || undefined,
			toothCode: it.toothCode,
			toothNumber: it.toothCode ? Number(it.toothCode) || undefined : undefined,
			title: it.title,
			name: it.title,
			quantity: Number(it.quantity) || 1,
			unitPriceRub: Number(it.unitPriceRub) || Number(it.priceRub) || 0,
			priceRub: Number(it.priceRub) || 0,
			discountRub: Number(it.discountRub) || 0,
			totalAmountRub: Number(it.priceRub) || 0,
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
