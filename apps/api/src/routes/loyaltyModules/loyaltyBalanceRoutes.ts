import { calculateCashbackPoints } from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../../security/identity.js";
import { withTenantCtx } from "../../db/rls.js";
import { manualAccrueBodySchema, accrueCashbackBodySchema, processExpiredBodySchema } from "./loyaltySchemas.js";
import { executeBonusAccrual, getPatientBonusBalance, processExpiredBonuses } from "./bonusBalanceService.js";

export async function registerLoyaltyBalanceRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/balance/:patientId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		return withTenantCtx(orgId, async () => {
			const result = await getPatientBonusBalance({ orgId, patientId });
			if (!result) return reply.status(404).send({ message: "Пациент не найден" });
			return reply.send(result);
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

	/**
	 * Background / Cron endpoint: Batch expiration of overdue bonuses across the organization [LOY-04].
	 */
	app.post("/api/loyalty/process-expired", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = processExpiredBodySchema.safeParse(request.body || {});
		if (!parsed.success) {
			return reply.status(400).send({ message: "Некорректные параметры даты", errors: parsed.error.format() });
		}

		const asOfDate = parsed.data?.asOfDate ? new Date(parsed.data.asOfDate) : new Date();

		return withTenantCtx(orgId, async () => {
			const res = await processExpiredBonuses(orgId, asOfDate);
			return reply.status(200).send({ success: true, ...res });
		});
	});
}
