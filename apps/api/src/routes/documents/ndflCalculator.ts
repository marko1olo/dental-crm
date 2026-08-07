import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { payments, treatmentItems } from "../../db/schema.js";
import {
	buildPatientLedger,
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

		const allPayments = await db
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, organizationId),
					eq(payments.patientId, query.patientId),
					eq(payments.status, PAID_PAYMENT_STATUS),
				),
			);

		const allTreatments = await db
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					eq(treatmentItems.patientId, query.patientId),
					ne(treatmentItems.status, "cancelled"),
				),
			);

		const ledger = buildPatientLedger(
			query.patientId,
			allTreatments,
			allPayments,
		);
		const debtKopecks = Math.max(0, ledger.balanceKopecks);

		if (debtKopecks > 0) {
			return {
				isBlocked: true,
				debtRub: rublesFromKopecks(debtKopecks),
				code1TotalRub: 0,
				code2TotalRub: 0,
			};
		}

		let code1Kopecks: Kopecks = 0;
		let code2Kopecks: Kopecks = 0;

		for (const p of allPayments) {
			if (p.paidAt >= start && p.paidAt <= end) {
				const kopecks = toKopecks(p.amountRub, "сумма платежа");
				if (p.taxDeductionCode === "1") {
					code1Kopecks += kopecks;
				} else if (p.taxDeductionCode === "2") {
					code2Kopecks += kopecks;
				}
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
