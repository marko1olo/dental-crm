import { kopecksToRubles, resolveInvoiceTotalAmountRub, rublesToKopecks } from "@dental/shared";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { withTenantReadCtx } from "../../../db/rls.js";
import { patientInvoices, payments } from "../../../db/schema/billing.js";
import { patients } from "../../../db/schema/patients.js";

/** GET /api/invoices/pending — Hot queue of unpaid invoices for cashbox 54-FZ */
export async function handlePendingInvoices(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (reply.sent) return;
	const context = await requireClinicalReadContext(
		request,
		reply,
		"invoices pending queue",
	);
	if (!context) return;
	const orgId = context.organizationId;

	const { invoiceRows, paidRows } = await withTenantReadCtx(orgId, async (tx) => {
		const rows = await tx
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
					inArray(patientInvoices.status, ["draft", "issued", "partially_paid"]),
				),
			)
			.orderBy(desc(patientInvoices.createdAt))
			.limit(50);

		const invoiceIds = rows.map((inv) => inv.id);
		const visitIds = Array.from(
			new Set(rows.map((inv) => inv.visitId).filter((v): v is string => Boolean(v))),
		);

		const linkedPayments =
			invoiceIds.length > 0
				? await tx
						.select({
							id: payments.id,
							documentId: payments.documentId,
							visitId: payments.visitId,
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

		return { invoiceRows: rows, paidRows: linkedPayments };
	});

	const pendingInvoices = invoiceRows.map((inv) => {
		const totalAmountKopecks =
			inv.totalPriceKopecks !== null && inv.totalPriceKopecks !== undefined && inv.totalPriceKopecks > 0n
				? Number(inv.totalPriceKopecks)
				: rublesToKopecks(
						resolveInvoiceTotalAmountRub({
							totalAmountRub: inv.totalAmountRub,
							totalRub: inv.totalRub,
						}),
					);
		const matchingPayments = paidRows.filter(
			(p) => p.documentId === inv.id || (inv.visitId !== null && p.visitId === inv.visitId),
		);
		const paidAmountKopecks = matchingPayments.reduce((sum, p) => {
			const rowKopecks =
				p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks > 0n
					? Number(p.amountKopecks)
					: rublesToKopecks(Number(p.amountRub ?? 0));
			return sum + rowKopecks;
		}, 0);
		const remainingAmountKopecks = Math.max(0, totalAmountKopecks - paidAmountKopecks);
		const year = inv.createdAt
			? new Date(inv.createdAt).getFullYear()
			: new Date().getFullYear();
		const invoiceNumber = `СЧ-${year}-${inv.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;

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
			paidAmountRub: kopecksToRubles(paidAmountKopecks),
			paidAmountKopecks,
			remainingAmountRub: kopecksToRubles(remainingAmountKopecks),
			remainingAmountKopecks,
			status: inv.status,
			issuedAt: inv.issuedAt?.toISOString() || null,
			paidAt: inv.paidAt?.toISOString() || null,
			createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
			date: inv.createdAt
				? new Date(inv.createdAt).toLocaleDateString("ru-RU")
				: new Date().toLocaleDateString("ru-RU"),
		};
	});

	return reply.code(200).send({
		success: true,
		invoices: pendingInvoices,
		count: pendingInvoices.length,
	});
}
