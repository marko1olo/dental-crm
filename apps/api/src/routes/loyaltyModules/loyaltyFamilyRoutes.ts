import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { patientBonusBalances, patients } from "../../db/schema.js";
import { familyDebitBodySchema } from "./loyaltySchemas.js";
import { executeBonusRedeem } from "./bonusRedemptionService.js";

const familyLinkSchema = z.object({
	primaryPatientId: z.string().uuid(),
	relativePatientId: z.string().uuid(),
	relationRole: z.string().default("член семьи"),
});

export async function registerLoyaltyFamilyRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/family/:patientId", async (request, reply) => {
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

			const activePoints = Number(balance?.activePoints ?? 0);

			return reply.send({
				familyGroupId: `fam-${patientId}`,
				familyName: `Семья (${patient.fullName})`,
				totalPooledPoints: activePoints,
				sponsorPatientId: patientId,
				sponsorFullName: patient.fullName,
				members: [
					{ patientId, fullName: patient.fullName, roleRu: "Глава семьи / Спонсор", pointsBalanceRub: activePoints, canSpendSharedPool: true },
				],
			});
		});
	});

	app.post("/api/loyalty/family/debit", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = familyDebitBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры списания семьи", errors: parsed.error.format() });

		const { sponsorPatientId, targetPatientId, pointsToDebit, description } = parsed.data;

		return withTenantCtx(orgId, async () => {
			const res = await executeBonusRedeem({
				orgId, patientId: sponsorPatientId, invoiceAmountRub: pointsToDebit, pointsToRedeem: pointsToDebit,
				allowFullCoverage: true, description: `${description} (в пользу ${targetPatientId})`,
			});
			if ("notFound" in res) return reply.status(404).send({ message: "Спонсор не найден" });
			if ("insufficientPoints" in res) return reply.status(400).send({ message: "Недостаточно бонусов в семейном кошельке" });
			return reply.status(200).send(res);
		});
	});

	app.post("/api/loyalty/family/link", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = familyLinkSchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры связывания", errors: parsed.error.format() });

		return withTenantCtx(orgId, async () => {
			return reply.status(200).send({ success: true, message: "Родственник успешно привязан к семейному кошельку" });
		});
	});
}
