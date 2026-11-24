import { randomUUID } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { withTenantCtx } from "../../db/rls.js";
import { familyGroups, patientRelationships, patients } from "../../db/schema.js";
import { extractPortalPatient } from "./portalAuthStore.js";

const addPortalFamilyMemberSchema = z.object({
	fullName: z.string().min(1, "ФИО обязательно"),
	relationship: z.string().min(1, "Степень родства обязательна"),
	phone: z.string().optional(),
	birthDate: z.string().optional(),
	cardNumber: z.string().optional(),
	allowSpendFamilyBalance: z.boolean().optional(),
	allowBooking: z.boolean().optional(),
});

const updatePortalFamilyPermissionsSchema = z.object({
	memberId: z.string().min(1, "Идентификатор члена семьи обязателен"),
	canSpendFamilyWallet: z.boolean(),
});

export async function registerPortalFamilyRoutes(server: FastifyInstance): Promise<void> {
	// Добавление члена семьи через личный кабинет пациента
	server.post("/family/members", async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized", message: "Требуется авторизация в личном кабинете." };
		}

		const bodyParse = addPortalFamilyMemberSchema.safeParse(request.body);
		if (!bodyParse.success) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры члена семьи.",
				details: bodyParse.error.issues,
			};
		}

		const body = bodyParse.data;

		return withTenantCtx(auth.organizationId, async (tx) => {
			const [primaryPatient] = await tx
				.select({
					id: patients.id,
					fullName: patients.fullName,
					familyGroupId: patients.familyGroupId,
				})
				.from(patients)
				.where(
					and(
						eq(patients.id, auth.patientId),
						eq(patients.organizationId, auth.organizationId),
					),
				)
				.limit(1);

			if (!primaryPatient) {
				reply.status(404);
				return { error: "PatientNotFound", message: "Основной пациент не найден." };
			}

			let relatedPatientId: string | null = null;

			// Поиск существующего пациента по номеру телефона в клинике
			if (body.phone?.trim()) {
				const digits = body.phone.replace(/\D/g, "");
				if (digits.length >= 10) {
					const suffix = digits.slice(-10);
					const [existing] = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, auth.organizationId),
								sql`regexp_replace(${patients.phone}, '\\D', '', 'g') LIKE ${`%${suffix}`}`,
							),
						)
						.limit(1);

					if (existing) {
						relatedPatientId = existing.id;
					}
				}
			}

			// Если пациента нет — создаем новую карту пациента в клинике
			if (!relatedPatientId) {
				const newId = randomUUID();
				await tx.insert(patients).values({
					id: newId,
					organizationId: auth.organizationId,
					fullName: body.fullName.trim(),
					phone: body.phone?.trim() || null,
					birthDate: body.birthDate?.trim() || null,
				});
				relatedPatientId = newId;
			}

			// Привязка к семейной группе
			let targetFamilyGroupId = primaryPatient.familyGroupId;
			if (!targetFamilyGroupId) {
				const newFgId = randomUUID();
				await tx.insert(familyGroups).values({
					id: newFgId,
					organizationId: auth.organizationId,
					name: `Семья (${primaryPatient.fullName})`,
					groupName: `Семья (${primaryPatient.fullName})`,
					headPatientId: auth.patientId,
					primaryPatientId: auth.patientId,
					balance: "0.00",
					balanceKopecks: 0,
				});
				await tx
					.update(patients)
					.set({ familyGroupId: newFgId })
					.where(
						and(
							eq(patients.id, auth.patientId),
							eq(patients.organizationId, auth.organizationId),
						),
					);
				targetFamilyGroupId = newFgId;
			}

			await tx
				.update(patients)
				.set({ familyGroupId: targetFamilyGroupId })
				.where(
					and(
						eq(patients.id, relatedPatientId),
						eq(patients.organizationId, auth.organizationId),
					),
				);

			// Проверка и создание связи в patientRelationships
			const [existingRel] = await tx
				.select({ id: patientRelationships.id })
				.from(patientRelationships)
				.where(
					and(
						eq(patientRelationships.organizationId, auth.organizationId),
						or(
							and(
								eq(patientRelationships.patientId, auth.patientId),
								eq(patientRelationships.relatedPatientId, relatedPatientId),
							),
							and(
								eq(patientRelationships.patientId, relatedPatientId),
								eq(patientRelationships.relatedPatientId, auth.patientId),
							),
						),
					),
				)
				.limit(1);

			if (existingRel) {
				await tx
					.update(patientRelationships)
					.set({
						relationshipType: body.relationship,
						canSpendFamilyWallet: Boolean(body.allowSpendFamilyBalance),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(patientRelationships.id, existingRel.id),
							eq(patientRelationships.organizationId, auth.organizationId),
						),
					);
			} else {
				await tx.insert(patientRelationships).values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					relatedPatientId,
					relationshipType: body.relationship,
					canSpendFamilyWallet: Boolean(body.allowSpendFamilyBalance),
					canViewRecords: true,
				});
			}

			return {
				success: true,
				memberId: relatedPatientId,
				fullName: body.fullName.trim(),
				relationship: body.relationship,
				allowSpendFamilyBalance: Boolean(body.allowSpendFamilyBalance),
			};
		});
	});

	// Обновление прав семейного баланса через личный кабинет пациента
	server.patch("/family/permissions", async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized", message: "Требуется авторизация в личном кабинете." };
		}

		const bodyParse = updatePortalFamilyPermissionsSchema.safeParse(request.body);
		if (!bodyParse.success) {
			reply.status(400);
			return {
				error: "ValidationError",
				message: "Некорректные параметры прав доступа.",
				details: bodyParse.error.issues,
			};
		}

		const body = bodyParse.data;

		return withTenantCtx(auth.organizationId, async (tx) => {
			const updated = await tx
				.update(patientRelationships)
				.set({
					canSpendFamilyWallet: body.canSpendFamilyWallet,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patientRelationships.organizationId, auth.organizationId),
						or(
							and(
								eq(patientRelationships.patientId, auth.patientId),
								eq(patientRelationships.relatedPatientId, body.memberId),
							),
							and(
								eq(patientRelationships.patientId, body.memberId),
								eq(patientRelationships.relatedPatientId, auth.patientId),
							),
						),
					),
				)
				.returning({ id: patientRelationships.id });

			if (!updated.length) {
				reply.status(404);
				return { error: "RelationshipNotFound", message: "Связь с членом семьи не найдена." };
			}

			return {
				success: true,
				memberId: body.memberId,
				canSpendFamilyWallet: body.canSpendFamilyWallet,
			};
		});
	});
}
