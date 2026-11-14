import {
	type DmsGuaranteeLetter,
	dmsGuaranteeLetterCreateSchema,
	dmsGuaranteeLetterUpdateSchema,
} from "@dental/shared";
import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { dmsGuaranteeLetters } from "../../db/schema.js";
import { guaranteeLetterQuerySchema, recordUsageBodySchema } from "./types.js";

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function isValidUuid(id: unknown): id is string {
	return typeof id === "string" && UUID_REGEX.test(id);
}

function safeToIsoString(date: unknown, fallback?: string): string {
	if (date instanceof Date && !Number.isNaN(date.getTime())) {
		return date.toISOString();
	}
	if (typeof date === "string" || typeof date === "number") {
		const parsed = new Date(date);
		if (!Number.isNaN(parsed.getTime())) {
			return parsed.toISOString();
		}
	}
	return fallback ?? new Date().toISOString();
}

export async function registerGuaranteeLetterRoutes(app: FastifyInstance) {
	// GET all guarantee letters for the organization with optional filters
	app.get<{
		Querystring: {
			patientId?: string;
			status?: string;
			search?: string;
		};
	}>("/api/insurance/guarantee-letters", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"insurance guarantee letters read",
		);
		if (!orgId) return;

		const parsedQuery = guaranteeLetterQuerySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Параметр patientId должен быть валидным UUID.",
				details: parsedQuery.error.issues,
			});
		}
		const { patientId, status, search } = parsedQuery.data;
		const conditions: SQL[] = [eq(dmsGuaranteeLetters.organizationId, orgId as string)];

		if (patientId) {
			conditions.push(eq(dmsGuaranteeLetters.patientId, patientId));
		}
		if (status) {
			conditions.push(eq(dmsGuaranteeLetters.status, status));
		}
		if (search && search.trim()) {
			const term = `%${search.trim().toLowerCase()}%`;
			const searchCondition = or(
				ilike(dmsGuaranteeLetters.letterNumber, term),
				ilike(dmsGuaranteeLetters.patientFullName, term),
				ilike(dmsGuaranteeLetters.insurerName, term),
				ilike(dmsGuaranteeLetters.policyNumber, term),
			);
			if (searchCondition) {
				conditions.push(searchCondition);
			}
		}

		const letters = await db
			.select()
			.from(dmsGuaranteeLetters)
			.where(and(...conditions))
			.orderBy(dmsGuaranteeLetters.createdAt);

		// Check for auto-expiration based on current date
		const todayIso = new Date().toISOString().slice(0, 10);
		const formatted = letters.map((l) => {
			let computedStatus = l.status;
			if ((l.status === "active" || l.status === "approved") && l.validUntil && l.validUntil < todayIso) {
				computedStatus = "expired";
			} else if ((l.status === "active" || l.status === "approved") && Number(l.usedAmountRub) >= Number(l.maxCoverageRub)) {
				computedStatus = "exhausted";
			}
			const maxRub = Number(l.maxCoverageRub);
			const usedRub = Number(l.usedAmountRub);
			const limitKop = Math.round(maxRub * 100);
			const usedKop = Math.round(usedRub * 100);
			const remainingLimitKop = Math.max(0, limitKop - usedKop);
			return {
				...l,
				validTo: l.validUntil,
				limitKopecks: limitKop,
				usedKopecks: usedKop,
				remainingLimitKopecks: remainingLimitKop,
				maxCoverageKopecks: limitKop,
				usedAmountKopecks: usedKop,
				status: computedStatus as DmsGuaranteeLetter["status"],
				maxCoverageRub: maxRub,
				usedAmountRub: usedRub,
				franchisePct: Number(l.franchisePct),
				franchiseType: (l.franchiseType as "percent" | "fixed_rub") || "percent",
				franchiseFixedRub: Number(l.franchiseFixedRub),
				programExclusions: (l.programExclusions as string[]) || [],
				approvedServiceCodes: (l.approvedServiceCodes as string[]) || [],
				approvedTeethFdi: (l.approvedTeethFdi as string[]) || [],
				approvedDiagnosisCodes: (l.approvedDiagnosisCodes as string[]) || [],
				createdAt: safeToIsoString(l.createdAt),
				updatedAt: safeToIsoString(l.updatedAt),
			};
		});

		return reply.code(200).send(formatted);
	});

	// GET single guarantee letter by id
	app.get<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"insurance guarantee letter read",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			if (!isValidUuid(letterId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр letterId должен быть валидным UUID.",
				});
			}

			const [letter] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (!letter) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			const todayIso = new Date().toISOString().slice(0, 10);
			let computedStatus = letter.status;
			if ((letter.status === "active" || letter.status === "approved") && letter.validUntil && letter.validUntil < todayIso) {
				computedStatus = "expired";
			} else if ((letter.status === "active" || letter.status === "approved") && Number(letter.usedAmountRub) >= Number(letter.maxCoverageRub)) {
				computedStatus = "exhausted";
			}

			const maxRub = Number(letter.maxCoverageRub);
			const usedRub = Number(letter.usedAmountRub);
			const limitKop = Math.round(maxRub * 100);
			const usedKop = Math.round(usedRub * 100);
			const remainingLimitKop = Math.max(0, limitKop - usedKop);

			return reply.code(200).send({
				...letter,
				validTo: letter.validUntil,
				limitKopecks: limitKop,
				usedKopecks: usedKop,
				remainingLimitKopecks: remainingLimitKop,
				maxCoverageKopecks: limitKop,
				usedAmountKopecks: usedKop,
				status: computedStatus as DmsGuaranteeLetter["status"],
				maxCoverageRub: maxRub,
				usedAmountRub: usedRub,
				franchisePct: Number(letter.franchisePct),
				franchiseType: (letter.franchiseType as "percent" | "fixed_rub") || "percent",
				franchiseFixedRub: Number(letter.franchiseFixedRub),
				programExclusions: (letter.programExclusions as string[]) || [],
				approvedServiceCodes: (letter.approvedServiceCodes as string[]) || [],
				approvedTeethFdi: (letter.approvedTeethFdi as string[]) || [],
				approvedDiagnosisCodes: (letter.approvedDiagnosisCodes as string[]) || [],
				createdAt: safeToIsoString(letter.createdAt),
				updatedAt: safeToIsoString(letter.updatedAt),
			});
		},
	);

	// POST create a new guarantee letter
	app.post("/api/insurance/guarantee-letters", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"insurance guarantee letter create",
		);
		if (!orgId) return;

		const parsed = dmsGuaranteeLetterCreateSchema.safeParse(request.body);
		if (!parsed.success) {
			const msg = parsed.error.issues[0]?.message ?? "Проверьте правильность заполнения гарантийного письма.";
			return reply.code(400).send({
				error: "ValidationError",
				message: msg,
			});
		}

		const data = parsed.data;
		const effectiveMaxRub = data.maxCoverageRub > 0
			? data.maxCoverageRub
			: (data.limitKopecks ? data.limitKopecks / 100 : (data.maxCoverageKopecks ? data.maxCoverageKopecks / 100 : 0));

		if (effectiveMaxRub <= 0) {
			return reply.code(400).send({
				error: "InvalidLimit",
				message: "Лимит покрытия по гарантийному письму должен быть больше 0 ₽.",
			});
		}

		const effectiveValidUntil = data.validUntil || data.validTo || "";
		if (data.validFrom > effectiveValidUntil) {
			return reply.code(400).send({
				error: "InvalidDateRange",
				message: "Дата начала действия гарантийного письма не может быть позже даты окончания.",
			});
		}

		const validLetterId = isValidUuid(data.id) ? data.id : undefined;

		const [created] = await db
			.insert(dmsGuaranteeLetters)
			.values({
				...(validLetterId ? { id: validLetterId } : {}),
				organizationId: orgId,
				contractId: data.contractId ?? null,
				patientId: data.patientId,
				patientFullName: data.patientFullName.trim(),
				patientBirthDate: data.patientBirthDate ?? null,
				policyNumber: data.policyNumber.trim(),
				insurerKey: data.insurerKey || "custom",
				insurerName: data.insurerName.trim(),
				letterNumber: data.letterNumber.trim(),
				issueDate: data.issueDate,
				validFrom: data.validFrom,
				validUntil: effectiveValidUntil,
				maxCoverageRub: effectiveMaxRub,
				usedAmountRub: data.usedAmountRub ?? (data.usedKopecks ? data.usedKopecks / 100 : 0),
				franchisePct: data.franchisePct ?? 0,
				franchiseType: data.franchiseType ?? "percent",
				franchiseFixedRub: data.franchiseFixedRub ?? 0,
				programExclusions: data.programExclusions ?? [],
				approvedServiceCodes: data.approvedServiceCodes ?? [],
				approvedTeethFdi: data.approvedTeethFdi ?? [],
				approvedDiagnosisCodes: data.approvedDiagnosisCodes ?? [],
				curatorFullName: data.curatorFullName ?? null,
				curatorPhone: data.curatorPhone ?? null,
				notes: data.notes ?? "",
				status: data.status ?? "active",
			})
			.returning();

		if (!created) {
			return reply.code(500).send({
				error: "LetterNotSaved",
				message: "Не удалось сохранить гарантийное письмо ДМС в базе данных.",
			});
		}

		const createdMaxRub = Number(created.maxCoverageRub);
		const createdUsedRub = Number(created.usedAmountRub);
		const createdLimitKop = Math.round(createdMaxRub * 100);
		const createdUsedKop = Math.round(createdUsedRub * 100);

		return reply.code(201).send({
			...created,
			validTo: created.validUntil,
			limitKopecks: createdLimitKop,
			usedKopecks: createdUsedKop,
			remainingLimitKopecks: Math.max(0, createdLimitKop - createdUsedKop),
			maxCoverageKopecks: createdLimitKop,
			usedAmountKopecks: createdUsedKop,
			status: created.status as DmsGuaranteeLetter["status"],
			maxCoverageRub: createdMaxRub,
			usedAmountRub: createdUsedRub,
			franchisePct: Number(created.franchisePct),
			franchiseType: (created.franchiseType as "percent" | "fixed_rub") || "percent",
			franchiseFixedRub: Number(created.franchiseFixedRub),
			programExclusions: (created.programExclusions as string[]) || [],
			approvedServiceCodes: (created.approvedServiceCodes as string[]) || [],
			approvedTeethFdi: (created.approvedTeethFdi as string[]) || [],
			approvedDiagnosisCodes: (created.approvedDiagnosisCodes as string[]) || [],
			createdAt: safeToIsoString(created.createdAt),
			updatedAt: safeToIsoString(created.updatedAt),
		});
	});

	// PUT update an existing guarantee letter
	app.put<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance guarantee letter update",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			if (!isValidUuid(letterId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр letterId должен быть валидным UUID.",
				});
			}

			const [existing] = await db
				.select()
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			const parsed = dmsGuaranteeLetterUpdateSchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Проверьте правильность обновления гарантийного письма.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
				});
			}

			const d = parsed.data;
			const updateData: Partial<typeof dmsGuaranteeLetters.$inferInsert> = {
				updatedAt: new Date(),
			};

			if (d.contractId !== undefined) updateData.contractId = d.contractId ?? null;
			if (d.patientId !== undefined) updateData.patientId = d.patientId;
			if (d.patientFullName !== undefined) updateData.patientFullName = d.patientFullName.trim();
			if (d.patientBirthDate !== undefined) updateData.patientBirthDate = d.patientBirthDate ?? null;
			if (d.policyNumber !== undefined) updateData.policyNumber = d.policyNumber.trim();
			if (d.insurerKey !== undefined) updateData.insurerKey = d.insurerKey;
			if (d.insurerName !== undefined) updateData.insurerName = d.insurerName.trim();
			if (d.letterNumber !== undefined) updateData.letterNumber = d.letterNumber.trim();
			if (d.issueDate !== undefined) updateData.issueDate = d.issueDate;
			if (d.validFrom !== undefined) updateData.validFrom = d.validFrom;
			if (d.validUntil !== undefined) updateData.validUntil = d.validUntil;
			else if (d.validTo !== undefined) updateData.validUntil = d.validTo;
			if (d.maxCoverageRub !== undefined) updateData.maxCoverageRub = d.maxCoverageRub;
			else if (d.limitKopecks !== undefined) updateData.maxCoverageRub = d.limitKopecks / 100;
			else if (d.maxCoverageKopecks !== undefined) updateData.maxCoverageRub = d.maxCoverageKopecks / 100;
			if (d.usedAmountRub !== undefined) updateData.usedAmountRub = d.usedAmountRub;
			else if (d.usedKopecks !== undefined) updateData.usedAmountRub = d.usedKopecks / 100;
			else if (d.usedAmountKopecks !== undefined) updateData.usedAmountRub = d.usedAmountKopecks / 100;
			if (d.franchisePct !== undefined) updateData.franchisePct = d.franchisePct;
			if (d.franchiseType !== undefined) updateData.franchiseType = d.franchiseType;
			if (d.franchiseFixedRub !== undefined) updateData.franchiseFixedRub = d.franchiseFixedRub;
			if (d.programExclusions !== undefined) updateData.programExclusions = d.programExclusions;
			if (d.approvedServiceCodes !== undefined) updateData.approvedServiceCodes = d.approvedServiceCodes;
			if (d.approvedTeethFdi !== undefined) updateData.approvedTeethFdi = d.approvedTeethFdi;
			if (d.approvedDiagnosisCodes !== undefined) updateData.approvedDiagnosisCodes = d.approvedDiagnosisCodes;
			if (d.curatorFullName !== undefined) updateData.curatorFullName = d.curatorFullName ?? null;
			if (d.curatorPhone !== undefined) updateData.curatorPhone = d.curatorPhone ?? null;
			if (d.notes !== undefined) updateData.notes = d.notes;
			if (d.status !== undefined) updateData.status = d.status;

			const finalMax = updateData.maxCoverageRub !== undefined ? Number(updateData.maxCoverageRub) : Number(existing.maxCoverageRub);
			const finalUsed = updateData.usedAmountRub !== undefined ? Number(updateData.usedAmountRub) : Number(existing.usedAmountRub);
			if (finalUsed >= finalMax && updateData.status === undefined) {
				updateData.status = "exhausted";
			}

			const [updated] = await db
				.update(dmsGuaranteeLetters)
				.set(updateData)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.returning();

			if (!updated) {
				return reply.code(404).send({
					error: "guarantee_letter_not_found",
					message: "Гарантийное письмо не найдено или не принадлежит организации",
				});
			}

			const updatedMaxRub = Number(updated.maxCoverageRub);
			const updatedUsedRub = Number(updated.usedAmountRub);
			const updatedLimitKop = Math.round(updatedMaxRub * 100);
			const updatedUsedKop = Math.round(updatedUsedRub * 100);

			return reply.code(200).send({
				...updated,
				validTo: updated.validUntil,
				limitKopecks: updatedLimitKop,
				usedKopecks: updatedUsedKop,
				remainingLimitKopecks: Math.max(0, updatedLimitKop - updatedUsedKop),
				maxCoverageKopecks: updatedLimitKop,
				usedAmountKopecks: updatedUsedKop,
				status: updated.status as DmsGuaranteeLetter["status"],
				maxCoverageRub: updatedMaxRub,
				usedAmountRub: updatedUsedRub,
				franchisePct: Number(updated.franchisePct),
				franchiseType: (updated.franchiseType as "percent" | "fixed_rub") || "percent",
				franchiseFixedRub: Number(updated.franchiseFixedRub),
				programExclusions: (updated.programExclusions as string[]) || [],
				approvedServiceCodes: (updated.approvedServiceCodes as string[]) || [],
				approvedTeethFdi: (updated.approvedTeethFdi as string[]) || [],
				approvedDiagnosisCodes: (updated.approvedDiagnosisCodes as string[]) || [],
				createdAt: safeToIsoString(updated.createdAt),
				updatedAt: safeToIsoString(updated.updatedAt),
			});
		},
	);

	// DELETE (soft-delete / cancel) a guarantee letter
	app.delete<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance guarantee letter delete",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			if (!isValidUuid(letterId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр letterId должен быть валидным UUID.",
				});
			}

			const [existing] = await db
				.select({ id: dmsGuaranteeLetters.id })
				.from(dmsGuaranteeLetters)
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				)
				.limit(1);

			if (!existing) {
				return reply.code(404).send({
					error: "LetterNotFound",
					message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
				});
			}

			await db
				.update(dmsGuaranteeLetters)
				.set({ status: "cancelled", updatedAt: new Date() })
				.where(
					and(
						eq(dmsGuaranteeLetters.id, letterId),
						eq(dmsGuaranteeLetters.organizationId, orgId),
					),
				);

			return reply.code(200).send({
				success: true,
				letterId,
				message: "Гарантийное письмо отозвано / аннулировано.",
			});
		},
	);

	// POST record usage against a guarantee letter (ACID Transaction)
	app.post<{ Params: { letterId: string } }>(
		"/api/insurance/guarantee-letters/:letterId/record-usage",
		async (request, reply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"insurance guarantee letter record usage",
			);
			if (!orgId) return;

			const { letterId } = request.params;
			const parsed = recordUsageBodySchema.safeParse(request.body);
			if (!parsed.success) {
				const msg = parsed.error.issues[0]?.message ?? "Укажите корректную сумму списания по ГП.";
				return reply.code(400).send({
					error: "ValidationError",
					message: msg,
				});
			}

			const { amountRub } = parsed.data;
			const isUrgentCare = Boolean(parsed.data.isEmergency || parsed.data.hasAcutePain || parsed.data.allowOverdraft);

			// Мандат 8e: если списание производится для экстренного визита без ГП
			if (letterId === "emergency" || letterId === "emergency_pending_letter" || letterId === "none" || letterId === "acute-pain") {
				return reply.code(200).send({
					success: true,
					letterId,
					debitedAmountRub: amountRub,
					usedAmountRub: amountRub,
					remainingCoverageRub: 0,
					status: "pending_letter",
					warning: "Требуется досылка гарантийного письма ДМС",
					isEmergency: true,
				});
			}

			if (!isValidUuid(letterId)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Параметр letterId должен быть валидным UUID.",
				});
			}

			const result = await db.transaction(async (tx) => {
				const [letter] = await tx
					.select()
					.from(dmsGuaranteeLetters)
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);

				if (!letter) {
					if (isUrgentCare) {
						return {
							status: 200,
							data: {
								success: true,
								letterId,
								debitedAmountRub: amountRub,
								usedAmountRub: amountRub,
								remainingCoverageRub: 0,
								status: "pending_letter",
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 404,
						error: {
							error: "LetterNotFound",
							message: "Гарантийное письмо ДМС не найдено в вашей клинике.",
						},
					};
				}

				if (letter.status === "cancelled") {
					if (isUrgentCare) {
						return {
							status: 200,
							data: {
								success: true,
								letterId: letter.id,
								debitedAmountRub: amountRub,
								usedAmountRub: Number(letter.usedAmountRub),
								remainingCoverageRub: 0,
								status: letter.status,
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 400,
						error: {
							error: "LetterCancelled",
							message: "Гарантийное письмо аннулировано и не может быть использовано для списания.",
						},
					};
				}

				const todayIso = new Date().toISOString().slice(0, 10);
				if (letter.validUntil && letter.validUntil < todayIso) {
					if (isUrgentCare) {
						return {
							status: 200,
							data: {
								success: true,
								letterId: letter.id,
								debitedAmountRub: amountRub,
								usedAmountRub: Number(letter.usedAmountRub),
								remainingCoverageRub: 0,
								status: letter.status,
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 400,
						error: {
							error: "LetterExpired",
							message: `Срок действия гарантийного письма истёк (${letter.validUntil}).`,
						},
					};
				}

				const maxCoverage = Number(letter.maxCoverageRub);
				const currentUsed = Number(letter.usedAmountRub);
				const remainingBefore = Math.max(0, Math.round((maxCoverage - currentUsed) * 100) / 100);

				if (amountRub > remainingBefore) {
					if (isUrgentCare) {
						// Мандат 8e: при острой боли превышение лимита не блокирует приём
						const newUsedAmount = Math.round((currentUsed + amountRub) * 100) / 100;
						const [updated] = await tx
							.update(dmsGuaranteeLetters)
							.set({
								usedAmountRub: newUsedAmount,
								status: "exhausted",
								updatedAt: new Date(),
							})
							.where(
								and(
									eq(dmsGuaranteeLetters.id, letterId),
									eq(dmsGuaranteeLetters.organizationId, orgId),
								),
							)
							.returning();

						if (!updated) {
							return {
								status: 404,
								error: {
									error: "guarantee_letter_not_found",
									message: "Гарантийное письмо не найдено в транзакции",
								},
							};
						}

						return {
							status: 200,
							data: {
								success: true,
								letterId: updated.id,
								debitedAmountRub: amountRub,
								usedAmountRub: Number(updated.usedAmountRub),
								remainingCoverageRub: 0,
								status: updated.status,
								warning: "Требуется досылка гарантийного письма ДМС",
								isEmergency: true,
							},
						};
					}
					return {
						status: 400,
						error: {
							error: "LimitExceeded",
							message: `Сумма списания (${amountRub} ₽) превышает остаток по гарантийному письму (${remainingBefore} ₽).`,
						},
					};
				}

				const newUsedAmount = Math.round((currentUsed + amountRub) * 100) / 100;
				let newStatus = letter.status;
				if (newUsedAmount >= maxCoverage) {
					newStatus = "exhausted";
				}

				const [updated] = await tx
					.update(dmsGuaranteeLetters)
					.set({
						usedAmountRub: newUsedAmount,
						status: newStatus,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(dmsGuaranteeLetters.id, letterId),
							eq(dmsGuaranteeLetters.organizationId, orgId),
						),
					)
					.returning();

				if (!updated) {
					return {
						status: 404,
						error: {
							error: "guarantee_letter_not_found",
							message: "Гарантийное письмо не найдено в транзакции",
						},
					};
				}

				return {
					status: 200,
					data: {
						success: true,
						letterId: updated.id,
						debitedAmountRub: amountRub,
						usedAmountRub: Number(updated.usedAmountRub),
						remainingCoverageRub: Math.max(0, Math.round((maxCoverage - newUsedAmount) * 100) / 100),
						status: updated.status,
					},
				};
			});

			if (result.status !== 200) {
				return reply.code(result.status).send(result.error);
			}
			return reply.code(200).send(result.data);
		},
	);
}
