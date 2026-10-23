import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patientInvoices } from "../../../db/schema.js";

export async function handleGetBillingInvoices(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing get invoices",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const query = request.query as Record<string, string | undefined> | undefined;
	const period = query?.period;
	const patientId = query?.patientId;

	let dateThreshold: Date | undefined;
	const now = new Date();
	if (period === "day") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	} else if (period === "week") {
		dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
	} else if (period === "month") {
		dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
	} else if (period === "quarter") {
		const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
		dateThreshold = new Date(now.getFullYear(), currentQuarterMonth, 1);
	} else if (period === "year") {
		dateThreshold = new Date(now.getFullYear(), 0, 1);
	}

	const conditions = [eq(patientInvoices.organizationId, orgId)];
	if (patientId) {
		conditions.push(eq(patientInvoices.patientId, patientId));
	}
	if (dateThreshold) {
		conditions.push(sql`${patientInvoices.createdAt} >= ${dateThreshold}`);
	}

	const rows = await db
		.select()
		.from(patientInvoices)
		.where(and(...conditions))
		.orderBy(desc(patientInvoices.createdAt))
		.limit(500);

	const data = rows.map((row) => {
		const total = Number(row.totalAmountRub || 0);
		const paid = row.status === "paid" ? total : 0;
		return {
			id: row.id,
			totalRub: total,
			totalAmountRub: total,
			paidRub: paid,
			paidAmountRub: paid,
			status: row.status,
			patientId: row.patientId,
			visitId: row.visitId,
			issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : undefined,
			paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : undefined,
			createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
		};
	});

	return reply.send({ success: true, data });
}
