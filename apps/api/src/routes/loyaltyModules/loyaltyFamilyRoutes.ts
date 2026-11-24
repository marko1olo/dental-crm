import { and, eq, ilike, inArray, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { familyDebitBodySchema } from "@dental/shared";
import { requireOrganizationId } from "../../security/identity.js";
import { withTenantCtx } from "../../db/rls.js";
import { familyGroups, patientBonusBalances, patientRelationships, patients } from "../../db/schema.js";
import { executeFamilyBonusRedeem } from "./bonusRedemptionService.js";
import { executeCreateFamilyGroup, executeAddFamilyMember } from "../family/familyGroupWriteRoutes.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";

const familyLinkSchema = z
	.object({
		primaryPatientId: z.string().uuid(),
		relativePatientId: z.string().min(1),
		relationRole: z.string().default("член семьи"),
	})
	.strict();

export async function registerLoyaltyFamilyRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/family/:patientId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };
		if (!patientId || !isValidUuid(patientId.trim())) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор пациента (ожидается UUID)",
			});
		}
		const cleanPatientId = patientId.trim();

		return withTenantCtx(orgId, async (tx) => {
			const [patient] = await tx
				.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, cleanPatientId)))
				.limit(1);
			if (!patient) return reply.status(404).send({ message: "Пациент не найден" });

			if (!patient.familyGroupId) {
				return reply.status(404).send({
					hasFamilyGroup: false,
					message: "Пациент не состоит в семейной группе",
				});
			}

			const [family] = await tx
				.select()
				.from(familyGroups)
				.where(and(eq(familyGroups.organizationId, orgId), eq(familyGroups.id, patient.familyGroupId)))
				.limit(1);

			const membersList = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
				})
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.familyGroupId, patient.familyGroupId)));

			const memberIds = membersList.map((m) => m.id);
			const balances = memberIds.length > 0
				? await tx
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
					roleRu: m.id === family?.headPatientId ? "Глава семьи" : "Член семьи",
					individualPointsBalance: pts,
					canSpendSharedPool: true,
				};
			});

			return reply.send({
				hasFamilyGroup: true,
				familyGroupId: family?.id ?? patient.familyGroupId,
				familyName: family?.name ?? `Семья (${patient.fullName})`,
				totalPooledPoints: totalPoints,
				sponsorPatientId: family?.headPatientId ?? cleanPatientId,
				sponsorFullName: patient.fullName,
				members,
			});
		});
	});

	app.post("/api/loyalty/family/debit", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
			});
		}

		const parsed = familyDebitBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры списания семьи", errors: parsed.error.format() });

		const { sponsorPatientId, targetPatientId, pointsToDebit, description } = parsed.data;

		return withTenantCtx(orgId, async (tx) => {
			// BOLA/IDOR Defense: verify kinship & family group authorization
			if (sponsorPatientId !== targetPatientId) {
				const [sponsor] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, sponsorPatientId)))
					.limit(1);
				if (!sponsor) return reply.status(404).send({ message: "Спонсор не найден" });

				const [target] = await tx
					.select({ id: patients.id, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, targetPatientId)))
					.limit(1);
				if (!target) return reply.status(404).send({ message: "Целевой пациент не найден" });

				const sameFamily = Boolean(
					sponsor.familyGroupId &&
					target.familyGroupId &&
					sponsor.familyGroupId === target.familyGroupId,
				);

				let hasSpendAuth = false;
				if (!sameFamily) {
					const [rel] = await tx
						.select({
							canSpendFamilyWallet: patientRelationships.canSpendFamilyWallet,
							isPrimaryPayer: patientRelationships.isPrimaryPayer,
						})
						.from(patientRelationships)
						.where(
							and(
								eq(patientRelationships.organizationId, orgId),
								or(
									and(
										eq(patientRelationships.patientId, sponsorPatientId),
										eq(patientRelationships.relatedPatientId, targetPatientId),
									),
									and(
										eq(patientRelationships.patientId, targetPatientId),
										eq(patientRelationships.relatedPatientId, sponsorPatientId),
									),
								),
							),
						)
						.limit(1);

					if (rel && (rel.canSpendFamilyWallet === true || rel.isPrimaryPayer === true)) {
						hasSpendAuth = true;
					}
				}

				if (!sameFamily && !hasSpendAuth) {
					return reply.status(403).send({
						message: "Пациенты не состоят в одной семейной группе и не имеют подтвержденных прав на списание баллов",
						code: "UNAUTHORIZED_FAMILY_SPEND",
					});
				}
			}

			const res = await executeFamilyBonusRedeem({
				orgId,
				sponsorPatientId,
				targetPatientId,
				pointsToRedeem: pointsToDebit,
				invoiceAmountRub: pointsToDebit,
				clientMutationId: idempotencyKey ?? undefined,
				description: `${description} (семейный пул в пользу ${targetPatientId})`,
			});
			if ("notFound" in res) return reply.status(404).send({ message: "Участники семейной группы не найдены" });
			if ("insufficientPoints" in res) return reply.status(400).send({ message: "Недостаточно бонусов в семейном кошельке" });

			if ("replayed" in res && res.replayed) {
				reply.header("idempotency-replayed", "true");
			}
			if (idempotencyKey) {
				reply.header("idempotency-key", idempotencyKey);
			}

			return reply.status(200).send(res);
		});
	});

	app.post("/api/loyalty/family/link", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = familyLinkSchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры связывания", errors: parsed.error.format() });

		const { primaryPatientId, relativePatientId, relationRole } = parsed.data;

		return withTenantCtx(orgId, async (tx) => {
			const [primary] = await tx
				.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
				.from(patients)
				.where(and(eq(patients.organizationId, orgId), eq(patients.id, primaryPatientId)))
				.limit(1);
			if (!primary) return reply.status(404).send({ message: "Основной пациент не найден" });

			const cleanRelativeInput = relativePatientId.trim();
			const isUuid = isValidUuid(cleanRelativeInput);

			let relative: { id: string; fullName: string; familyGroupId: string | null } | undefined;

			if (isUuid) {
				const [found] = await tx
					.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, cleanRelativeInput)))
					.limit(1);
				relative = found;
			}

			if (!relative) {
				const digits = cleanRelativeInput.replace(/\D/g, "");
				const searchConditions = [ilike(patients.fullName, `%${cleanRelativeInput}%`)];
				if (digits.length >= 4) {
					searchConditions.push(ilike(patients.phone, `%${digits}%`));
				}
				const foundList = await tx
					.select({ id: patients.id, fullName: patients.fullName, familyGroupId: patients.familyGroupId })
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), or(...searchConditions)))
					.limit(2);
				relative = foundList.find((p) => p.id !== primary.id) || foundList[0];
			}

			if (!relative) return reply.status(404).send({ message: "Родственник с указанным идентификатором, именем или телефоном не найден в картотеке клиники" });
			if (primary.id === relative.id) return reply.status(400).send({ message: "Нельзя привязать пациента к самому себе в качестве родственника" });

			let targetGroupId = primary.familyGroupId;
			if (!targetGroupId) {
				const createRes = await executeCreateFamilyGroup({
					organizationId: orgId,
					data: {
						name: `Семья ${primary.fullName.split(" ")[0]}`,
						headPatientId: primary.id,
					},
				});
				if (!createRes.success) {
					return reply.status(createRes.status).send({ message: createRes.message });
				}
				targetGroupId = createRes.family.id;
			}

			const addRes = await executeAddFamilyMember({
				organizationId: orgId,
				familyGroupId: targetGroupId,
				patientId: relative.id,
				canSpendFamilyWallet: true,
			});

			if (!addRes.success) {
				return reply.status(addRes.status).send({ message: addRes.body.message });
			}

			const [balance] = await tx
				.select()
				.from(patientBonusBalances)
				.where(and(eq(patientBonusBalances.organizationId, orgId), eq(patientBonusBalances.patientId, relative.id)))
				.limit(1);
			const individualPointsBalance = Number(balance?.activePoints ?? 0);

			return reply.status(200).send({
				success: true,
				familyGroupId: targetGroupId,
				relative: {
					id: relative.id,
					fullName: relative.fullName,
					individualPointsBalance,
				},
				message: `Пациент ${relative.fullName} успешно привязан к семейному счету`,
			});
		});
	});
}
