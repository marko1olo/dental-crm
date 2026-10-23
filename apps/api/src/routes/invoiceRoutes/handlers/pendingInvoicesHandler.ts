import { resolveInvoiceTotalAmountRub } from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patientInvoices } from "../../../db/schema/billing.js";
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

	const invoiceRows = await db
		.select({
			id: patientInvoices.id,
			organizationId: patientInvoices.organizationId,
			patientId: patientInvoices.patientId,
			visitId: patientInvoices.visitId,
			totalAmountRub: patientInvoices.totalAmountRub,
			totalRub: patientInvoices.totalRub,
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

	const pendingInvoices = invoiceRows.map((inv) => {
		const totalAmount = resolveInvoiceTotalAmountRub({
			totalAmountRub: inv.totalAmountRub,
			totalRub: inv.totalRub,
		});
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
			totalAmountRub: totalAmount,
			paidAmountRub: 0,
			status: inv.status,
			issuedAt: inv.issuedAt?.toISOString() || null,
			paidAt: null,
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
