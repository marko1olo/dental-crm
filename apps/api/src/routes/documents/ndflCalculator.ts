import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { payments } from "../../db/schema.js";
import {
	type Kopecks,
	PAID_PAYMENT_STATUS,
	rublesFromKopecks,
	toKopecks,
} from "../../money/patientDebt.js";
import { requireOrganizationId } from "../../security/identity.js";

const ndflQuerySchema = z.object({
	patientId: z.string().uuid(),
	startDate: z.string().datetime(),
	endDate: z.string().datetime(),
});

export async function register(app: FastifyInstance) {
	app.get("/api/documents/ndfl-calculator", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "document read")))
			return;
		const organizationId = requireOrganizationId(request, reply);
		if (!organizationId) return;
		const query = ndflQuerySchema.parse(request.query);
		const start = new Date(query.startDate);
		const end = new Date(query.endDate);

		const patient = await getPatientByIdFromDb(organizationId, query.patientId);

		if (!patient) {
			return reply.status(404).send({ error: "Patient not found" });
		}

		// balanceRub is negative if there is a debt.
		const debtRub = patient.balanceRub < 0 ? Math.abs(patient.balanceRub) : 0;

		if (debtRub > 0) {
			return {
				isBlocked: true,
				debtRub,
				code1TotalRub: 0,
				code2TotalRub: 0,
			};
		}

		const taxSums = await db
			.select({
				taxDeductionCode: payments.taxDeductionCode,
				totalAmountRub: sql<string>`sum(${payments.amountRub})`,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.patientId, query.patientId),
					eq(payments.status, PAID_PAYMENT_STATUS),
					gte(payments.paidAt, start),
					lte(payments.paidAt, end),
				),
			)
			.groupBy(payments.taxDeductionCode);

		let code1Kopecks: Kopecks = 0;
		let code2Kopecks: Kopecks = 0;

		for (const row of taxSums) {
			const kopecks = toKopecks(row.totalAmountRub, "сумма платежа");
			if (row.taxDeductionCode === "1") {
				code1Kopecks += kopecks;
			} else if (row.taxDeductionCode === "2") {
				code2Kopecks += kopecks;
			}
		}

		return {
			isBlocked: false,
			debtRub: 0,
			code1TotalRub: rublesFromKopecks(code1Kopecks),
			code2TotalRub: rublesFromKopecks(code2Kopecks),
		};
	});
}
