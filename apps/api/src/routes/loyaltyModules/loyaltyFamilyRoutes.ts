import { and, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { familyGroups, patientBonusBalances, patients } from "../../db/schema.js";
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
				.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
				.limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			if (!patient.familyGroupId) {
				return reply.status(404).send({
					hasFamilyGroup: false,
					message: "Пациент не состоит в семейной группе",
				});
			}

			const [family] = await db
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.organizationId, orgId), eq(familyGroups.id, patient.familyGroupId)))
				.limit(1);

			const membersList = await db
				.select({
					id: patients.id,
					fullName: patients.fullName,
					familyRole: patients.familyRole,
				})
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.familyGroupId, patient.familyGroupId)));

			const memberIds = membersList.map((m) => m.id);
			const balances = memberIds.length > 0
				? await db
						.select()
						.from(patientBonusBalances)
						.where(and(eq(patientBonusBalances.organizationId, orgId), inArray(patientBonusBalances.patientId, memberIds)))
				: [];

			const balanceMap = new Map<string, number>();
			for (const b of balances) {
				balanceMap.set(b.patientId, Number(b.activePoints ?? 0));
			}

			let totalPoints = 0;
			const members = membersList.map((m) => {
				const pts = balanceMap.get(m.id) ?? 0;
				totalPoints += pts;
				return {
					patientId: m.id,
					fullName: m.fullName,
					roleRu: m.id === family?.headPatientId ? "Глава семьи" : (m.familyRole || "Член семьи"),
					individualPointsBalance: pts,
					canSpendSharedPool: true,
				};
			});

			return reply.send({
				hasFamilyGroup: true,
				familyGroupId: family?.id ?? patient.familyGroupId,
				familyName: family?.name ?? `Семья (${patient.fullName})`,
				totalPooledPoints: totalPoints,
				sponsorPatientId: family?.headPatientId ?? patientId,
				sponsorFullName: patient.fullName,
				members,
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

		const { primaryPatientId, relativePatientId, relationRole } = parsed.data;

		return withTenantCtx(orgId, async () => {
			const [primary] = await db
				.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, primaryPatientId)))
				.limit(1);
			if (!primary) return reply.status(404).send({ message: "Основной пациент не найден" });

			const [relative] = await db
				.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, relativePatientId)))
				.limit(1);
			if (!relative) return reply.status(404).send({ message: "Родственник не найден" });

			let targetGroupId = primary.familyGroupId;
			if (!targetGroupId) {
				const [newGroup] = await db
					.insert(familyGroups)
					.values({
						organizationId: orgId,
						name: `Семья ${primary.fullName.split(" ")[0]}`,
						headPatientId: primary.id,
						balance: "0.00",
					})
					.returning();
				targetGroupId = newGroup?.id ?? null;
				if (targetGroupId) {
					await db
						.update(patients)
						.set({ familyGroupId: targetGroupId, familyRole: "head", updatedAt: new Date() })
						.where(and(eq(patients.organizationId, orgId), eq(patients.id, primary.id)));
				}
			}

			if (targetGroupId) {
				await db
					.update(patients)
					.set({ familyGroupId: targetGroupId, familyRole: relationRole, updatedAt: new Date() })
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, relative.id)));
			}

			return reply.status(200).send({
				success: true,
				familyGroupId: targetGroupId,
				message: `Пациент ${relative.fullName} успешно привязан к семейному счету`,
			});
		});
	});
}
