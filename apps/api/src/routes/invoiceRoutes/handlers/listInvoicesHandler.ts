import {
	kopecksToRubles,
	multiplyKopecksFractional,
	resolveInvoiceTotalAmountRub,
	rublesToKopecks,
} from "@dental/shared";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { invoiceItems, patientInvoices, payments } from "../../../db/schema/billing.js";
import { patients } from "../../../db/schema/patients.js";
import { invoiceListQuerySchema } from "../types.js";

/** GET /api/invoices & /api/v1/billing/invoices */
export async function handleListInvoices(request: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (reply.sent) return;
	const context = await requireClinicalReadContext(request, reply, "invoices list");
	if (!context) return;
	const orgId = context.organizationId;

	const parsedQuery = invoiceListQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Параметр patientId должен быть валидным UUID.",
			details: parsedQuery.error.issues,
		});
	}
	const { patientId, status, limit = 100 } = parsedQuery.data;

	const statusCondition = status
		? status === "pending" || status === "unpaid"
			? inArray(patientInvoices.status, ["draft", "issued", "partially_paid"])
			: eq(patientInvoices.status, status)
		: sql`TRUE`;

	const { invoiceRows, rawItems, paidRows } = await withTenantCtx(orgId, async (tx) => {
		const invRows = await tx
			.select({
				id: patientInvoices.id,
				organizationId: patientInvoices.organizationId,
				patientId: patientInvoices.patientId,
				visitId: patientInvoices.visitId,
				totalAmountRub: patientInvoices.totalAmountRub,
				totalRub: patientInvoices.totalRub,
				totalPriceKopecks: patientInvoices.totalPriceKopecks,
				status: patientInvoices.status,
				issuedAt: patientInvoices.issuedAt,
				paidAt: patientInvoices.paidAt,
				createdAt: patientInvoices.createdAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(patientInvoices)
			.leftJoin(patients, eq(patientInvoices.patientId, patients.id))
			.where(
				and(
					eq(patientInvoices.organizationId, orgId),
					patientId ? eq(patientInvoices.patientId, patientId) : sql`TRUE`,
					statusCondition,
				),
			)
			.orderBy(desc(patientInvoices.createdAt))
			.limit(limit);

		const invoiceIds = invRows.map((inv) => inv.id);
		const visitIds = Array.from(
			new Set(invRows.map((inv) => inv.visitId).filter((v): v is string => Boolean(v))),
		);

		const invItems =
			invoiceIds.length > 0
				? await tx
						.select()
						.from(invoiceItems)
						.where(
							and(
								eq(invoiceItems.organizationId, orgId),
								inArray(invoiceItems.invoiceId, invoiceIds),
							),
						)
						.orderBy(desc(invoiceItems.createdAt))
				: [];

		const invPayments =
			invoiceIds.length > 0
				? await tx
						.select({
							id: payments.id,
							documentId: payments.documentId,
							visitId: payments.visitId,
							patientId: payments.patientId,
							amountKopecks: payments.amountKopecks,
							amountRub: payments.amountRub,
						})
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.status, "paid"),
								visitIds.length > 0
									? or(
											inArray(payments.documentId, invoiceIds),
											inArray(payments.visitId, visitIds),
										)
									: inArray(payments.documentId, invoiceIds),
							),
						)
				: [];

		return { invoiceRows: invRows, rawItems: invItems, paidRows: invPayments };
	});

	const projectInvoiceItem = (item: typeof rawItems[number]) => {
		const qty = Number(item.quantity) || 1;
		const grossKopecks = multiplyKopecksFractional(Number(item.unitPriceKopecks), qty);
		const discountKopecks = Math.max(0, grossKopecks - Number(item.totalPriceKopecks));
		return {
			id: item.id,
			serviceId: item.priceListItemId || item.serviceCode || undefined,
			serviceCode: item.serviceCode || undefined,
			code: item.serviceCode || undefined,
			toothCode: item.toothCode,
			toothNumber: item.toothCode ? Number(item.toothCode) || undefined : undefined,
			title: item.name,
			name: item.name,
			quantity: qty,
			unitPriceRub: kopecksToRubles(item.unitPriceKopecks),
			priceRub: kopecksToRubles(item.totalPriceKopecks),
			discountRub: kopecksToRubles(discountKopecks),
			totalAmountRub: kopecksToRubles(item.totalPriceKopecks),
		};
	};

	const items = rawItems.map(projectInvoiceItem);

	const invoices = invoiceRows.map((inv) => {
		const totalAmountKopecks =
			inv.totalPriceKopecks !== null && inv.totalPriceKopecks !== undefined && inv.totalPriceKopecks > 0n
				? Number(inv.totalPriceKopecks)
				: rublesToKopecks(
						resolveInvoiceTotalAmountRub({ totalAmountRub: inv.totalAmountRub, totalRub: inv.totalRub }),
					);
		const matchingPayments = paidRows.filter(
			(p) =>
				p.documentId === inv.id ||
				(inv.visitId !== null && p.visitId === inv.visitId && p.patientId === inv.patientId),
		);
		const paidAmountKopecks =
			matchingPayments.length > 0
				? matchingPayments.reduce((sum, p) => {
						const rowKop =
							p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks > 0n
								? Number(p.amountKopecks)
								: rublesToKopecks(Number(p.amountRub ?? 0));
						return sum + rowKop;
					}, 0)
				: inv.status === "paid"
					? totalAmountKopecks
					: 0;
		const paidAmountRub = kopecksToRubles(paidAmountKopecks);
		const remainingAmountKopecks = Math.max(0, totalAmountKopecks - paidAmountKopecks);
		const remainingAmountRub = kopecksToRubles(remainingAmountKopecks);
		const year = inv.createdAt ? new Date(inv.createdAt).getFullYear() : new Date().getFullYear();
		const invoiceNumber = `СЧ-${year}-${inv.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

		const matchingItems = rawItems
			.filter((it) => it.invoiceId === inv.id)
			.map(projectInvoiceItem);

		return {
			id: inv.id,
			number: invoiceNumber,
			invoiceNumber,
			patientId: inv.patientId,
			patientName: inv.patientName || "Пациент",
			patientPhone: inv.patientPhone || undefined,
			visitId: inv.visitId,
			organizationId: inv.organizationId,
			totalAmountRub: kopecksToRubles(totalAmountKopecks),
			totalAmountKopecks,
			paidAmountRub,
			paidAmountKopecks,
			remainingAmountRub,
			remainingAmountKopecks,
			status: inv.status,
			issuedAt: inv.issuedAt?.toISOString() || null,
			paidAt: inv.paidAt?.toISOString() || null,
			createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
			date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU"),
			items: matchingItems,
		};
	});

	return reply.code(200).send({ success: true, data: invoices, invoices, items });
}
