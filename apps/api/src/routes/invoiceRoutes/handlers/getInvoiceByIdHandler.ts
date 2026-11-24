import {
	kopecksToRubles,
	multiplyKopecksFractional,
	resolveInvoiceTotalAmountRub,
	rublesToKopecks,
} from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
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

	const payload = await withTenantCtx(orgId, async (tx) => {
		let invoiceRow: typeof patientInvoices.$inferSelect | undefined;

		if (isUuid) {
			const [found] = await tx
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
			const totalAmountKopecks =
				invoiceRow.totalPriceKopecks !== null &&
				invoiceRow.totalPriceKopecks !== undefined &&
				invoiceRow.totalPriceKopecks > 0n
					? Number(invoiceRow.totalPriceKopecks)
					: rublesToKopecks(
							resolveInvoiceTotalAmountRub({
								totalAmountRub: invoiceRow.totalAmountRub,
								totalRub: invoiceRow.totalRub,
							}),
						);

			const linkedPayments = await tx
				.select({
					amountKopecks: payments.amountKopecks,
					amountRub: payments.amountRub,
					fiscalReceiptNumber: payments.fiscalReceiptNumber,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.patientId, invoiceRow.patientId),
						eq(payments.status, "paid"),
						invoiceRow.visitId
							? or(
									eq(payments.documentId, invoiceRow.id),
									eq(payments.visitId, invoiceRow.visitId),
								)
							: eq(payments.documentId, invoiceRow.id),
					),
				);

			const recordedPaidKopecks = linkedPayments.reduce((sum, p) => {
				const rowKop =
					p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks > 0n
						? Number(p.amountKopecks)
						: rublesToKopecks(Number(p.amountRub ?? 0));
				return sum + rowKop;
			}, 0);

			const isPaid = invoiceRow.status === "paid";
			const paidAmountKopecks =
				linkedPayments.length > 0
					? recordedPaidKopecks
					: isPaid
						? totalAmountKopecks
						: 0;
			const remainingAmountKopecks = Math.max(0, totalAmountKopecks - paidAmountKopecks);
			const actualFiscalReceiptNumber =
				linkedPayments.find((p) => Boolean(p.fiscalReceiptNumber))?.fiscalReceiptNumber ?? null;

			const itemRows = await tx
				.select()
				.from(invoiceItems)
				.where(
					and(
						eq(invoiceItems.organizationId, orgId),
						eq(invoiceItems.invoiceId, invoiceRow.id),
					),
				);

			const items = itemRows.map((it) => {
				const qty = Number(it.quantity) || 1;
				const grossKopecks = multiplyKopecksFractional(Number(it.unitPriceKopecks), qty);
				const itemDiscountKopecks = Math.max(0, grossKopecks - Number(it.totalPriceKopecks));
				return {
					id: it.id,
					serviceId: it.priceListItemId || it.serviceCode || undefined,
					serviceCode: it.serviceCode || undefined,
					code: it.serviceCode || undefined,
					toothCode: it.toothCode,
					toothNumber: it.toothCode ? Number(it.toothCode) || undefined : undefined,
					title: it.name,
					name: it.name,
					quantity: qty,
					unitPriceRub: kopecksToRubles(it.unitPriceKopecks),
					priceRub: kopecksToRubles(it.totalPriceKopecks),
					discountRub: kopecksToRubles(itemDiscountKopecks),
					totalAmountRub: kopecksToRubles(it.totalPriceKopecks),
				};
			});

			return {
				id: invoiceRow.id,
				organizationId: invoiceRow.organizationId,
				status: invoiceRow.status,
				isPaid,
				totalAmountRub: kopecksToRubles(totalAmountKopecks),
				totalAmountKopecks,
				paidAmountRub: kopecksToRubles(paidAmountKopecks),
				paidAmountKopecks,
				remainingAmountRub: kopecksToRubles(remainingAmountKopecks),
				remainingAmountKopecks,
				paidAtIso: invoiceRow.paidAt ? invoiceRow.paidAt.toISOString() : null,
				fiscalReceiptNumber: actualFiscalReceiptNumber,
				fiscalReceiptId: actualFiscalReceiptNumber,
				patientId: invoiceRow.patientId,
				visitId: invoiceRow.visitId,
				createdAt: invoiceRow.createdAt.toISOString(),
				items,
			};
		}

		return await lookupSberTransactionInvoice({ db: tx, orgId, id });
	});

	if (payload) {
		return reply.code(200).send(payload);
	}

	return reply.code(404).send({
		error: "InvoiceNotFound",
		message: `Счёт с идентификатором '${id}' не найден.`,
	});
}
