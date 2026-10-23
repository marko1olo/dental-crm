import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { payments } from "../../../db/schema.js";

export async function handleGetBillingPayments(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing get payments",
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

	const conditions = [eq(payments.organizationId, orgId)];
	if (patientId) {
		conditions.push(eq(payments.patientId, patientId));
	}
	if (dateThreshold) {
		conditions.push(sql`${payments.paidAt} >= ${dateThreshold}`);
	}

	const rows = await db
		.select()
		.from(payments)
		.where(and(...conditions))
		.orderBy(desc(payments.paidAt))
		.limit(500);

	const data = rows.map((row) => ({
		id: row.id,
		amountRub: Number(row.amountRub),
		amountKopecks: Math.round(Number(row.amountRub) * 100),
		status: row.status,
		method: row.method,
		paymentMethod: row.method,
		patientId: row.patientId,
		visitId: row.visitId,
		documentId: row.documentId,
		isPrimaryPatient: true,
		paidAt: row.paidAt ? row.paidAt.toISOString() : undefined,
		createdAt: row.createdAt ? row.createdAt.toISOString() : undefined,
	}));

	return reply.send({ success: true, data });
}
