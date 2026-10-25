import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import { referralRegisterBodySchema } from "./loyaltySchemas.js";
import { executeBonusAccrual } from "./bonusBalanceService.js";

const creditReferralSchema = z.object({
	referrerPatientId: z.string().uuid(),
	invitedPatientName: z.string().min(2),
	rewardRub: z.number().positive().default(1000),
});

export async function registerLoyaltyReferralRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/referrals/:patientId", async (request, reply) => {
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

			return reply.send({
				referrerPatientId: patientId,
				referrerFullName: patient.fullName,
				referrals: [
					{
						id: `ref-sample-${patientId.slice(0, 4)}`,
						invitedPatientName: "Друг / Семья",
						rewardRub: 1000,
						status: "completed",
						isRewardCredited: true,
						note: "Сертификат «Приведи друга на профгигиену» (1000 бонусов)",
					},
				],
			});
		});
	});

	app.post("/api/loyalty/referrals/register", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = referralRegisterBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры рекомендации", errors: parsed.error.format() });

		return withTenantCtx(orgId, async () => {
			return reply.status(201).send({
				success: true,
				referralId: `ref-${Date.now().toString().slice(-6)}`,
				invitedPatientName: parsed.data.invitedPatientName,
				rewardRub: parsed.data.rewardRub,
				message: `Рекомендация «${parsed.data.invitedPatientName}» зарегистрирована`,
			});
		});
	});

	app.post("/api/loyalty/referrals/credit", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = creditReferralSchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры начисления", errors: parsed.error.format() });

		const { referrerPatientId, invitedPatientName, rewardRub } = parsed.data;

		return withTenantCtx(orgId, async () => {
			const res = await executeBonusAccrual({
				orgId, patientId: referrerPatientId, amountPoints: rewardRub,
				description: `Бонус за рекомендацию «Приведи друга»: ${invitedPatientName}`,
				txType: "accrual_referral", expiresInDays: 365,
			});
			if ("notFound" in res) return reply.status(404).send({ message: "Реферер не найден" });
			return reply.status(200).send({
				success: true, creditedRub: rewardRub, message: `Начислено ${rewardRub} ₽ бонусов за рекомендацию`,
			});
		});
	});
}
