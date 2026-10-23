import { resolveInvoiceTotalAmountRub } from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patientInvoices } from "../../../db/schema/billing.js";
import { treatmentItems } from "../../../db/schema/clinical.js";
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
				patientId ? eq(patientInvoices.patientId, patientId) : sql`TRUE`,
				statusCondition,
			),
		)
		.orderBy(desc(patientInvoices.createdAt))
		.limit(limit);

	const invoices = invoiceRows.map((inv) => {
		const totalAmount = resolveInvoiceTotalAmountRub({ totalAmountRub: inv.totalAmountRub, totalRub: inv.totalRub });
		const year = inv.createdAt ? new Date(inv.createdAt).getFullYear() : new Date().getFullYear();
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
			paidAmountRub: inv.status === "paid" ? totalAmount : 0,
			status: inv.status,
			issuedAt: inv.issuedAt?.toISOString() || null,
			paidAt: inv.paidAt?.toISOString() || null,
			createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
			date: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("ru-RU") : new Date().toLocaleDateString("ru-RU"),
		};
	});

	const rawItems = await db
		.select()
		.from(treatmentItems)
		.where(and(eq(treatmentItems.organizationId, orgId), patientId ? eq(treatmentItems.patientId, patientId) : sql`TRUE`))
		.orderBy(desc(treatmentItems.id))
		.limit(limit);

	const items = rawItems.map((item) => ({
		...item,
		totalAmountRub: resolveInvoiceTotalAmountRub({ totalRub: item.priceRub }),
	}));

	return reply.code(200).send({ invoices, items });
}
