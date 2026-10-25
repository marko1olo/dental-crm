import { calculateCashbackPoints } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { patientBonusBalances, patients } from "../../db/schema.js";
import { manualAccrueBodySchema, accrueCashbackBodySchema } from "./loyaltySchemas.js";
import { executeBonusAccrual } from "./bonusBalanceService.js";

export async function registerLoyaltyBalanceRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/balance/:patientId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		return withTenantCtx(orgId, async () => {
			const [patient] = await db
				.select({ id: patients.id, fullName: patients.fullName })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
				.limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			const [balance] = await db
				.select()
				.from(patientBonusBalances)
				.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, patientId)))
				.limit(1);

			return reply.send({
				patientId,
				patientName: patient.fullName,
				activePoints: Number(balance?.activePoints ?? 0),
				pendingPoints: Number(balance?.pendingPoints ?? 0),
				lifetimeEarnedPoints: Number(balance?.lifetimeEarnedPoints ?? 0),
				lifetimeSpentPoints: Number(balance?.lifetimeSpentPoints ?? 0),
				tier: "bronze",
				cashbackPercent: 3.0,
				maxInvoiceCoveragePercent: 30.0,
				pointRateRub: 1.0,
			});
		});
	});

	app.post("/api/loyalty/accrue", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = manualAccrueBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры начисления", errors: parsed.error.format() });

		const { patientId, amountPoints, description, expiresInDays } = parsed.data;
		return withTenantCtx(orgId, async () => {
			const res = await executeBonusAccrual({ orgId, patientId, amountPoints, description, txType: "accrual_manual_admin", expiresInDays });
			if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
			return reply.status(201).send(res);
		});
	});

	app.post("/api/loyalty/accrue-cashback", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = accrueCashbackBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры кэшбэка", errors: parsed.error.format() });

		const { patientId, paidAmountRub, invoiceId, paymentId, cashbackPercent, pointRateRub, description, expiresInDays } = parsed.data;
		const pointsToAccrue = calculateCashbackPoints(paidAmountRub, cashbackPercent, pointRateRub);
		if (pointsToAccrue <= 0) return reply.send({ success: true, accruedPoints: 0, message: "Сумма кэшбэка равна 0" });

		return withTenantCtx(orgId, async () => {
			const res = await executeBonusAccrual({ orgId, patientId, amountPoints: pointsToAccrue, description: description || "Кэшбэк за оплату услуг", txType: "accrual_cashback", expiresInDays, relatedPaymentId: paymentId, relatedInvoiceId: invoiceId });
			if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
			return reply.status(201).send(res);
		});
	});
}
