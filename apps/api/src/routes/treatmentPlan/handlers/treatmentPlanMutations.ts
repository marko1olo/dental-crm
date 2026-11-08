import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { evaluateClinicalRulesInDb } from "../../../db/clinicalQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	auditEvents,
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../db/schema.js";
import {
	chargeLineKopecks,
	debtNumericText,
	rublesFromKopecks,
} from "../../../money/patientDebt.js";
import { getRequestIdentity } from "../../../security/identity.js";
import {
	ensurePatientInOrganization,
	ledgerRowId,
	loadTreatmentPlansForPatient,
	numeric,
	verifyPlanWriteAccess,
} from "../../odontogram/planHelpers.js";
import {
	LEDGER_ID_PREFIX_LENGTH,
	LEDGER_MAX_SLOT,
	LEDGER_STATUSES_OWNED_BY_PLAN,
	UUID_SHAPE,
	treatmentPlanUpsertSchema,
} from "../../odontogram/types.js";
import { calculateTreatmentPlanTotals } from "./treatmentPlanTotalsCalculator.js";

export const createTreatmentPlanSchema = z.object({
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	doctorId: z.string().uuid().optional().nullable(),
	name: z.string().trim().min(1).default("План комплексного лечения"),
	title: z.string().trim().optional().default(""),
	totalPriceRub: z.number().nonnegative().optional(),
	planDiscountPercent: z.number().min(0).max(100).optional().default(0),
	planDiscountRub: z.number().nonnegative().optional().default(0),
	discountMode: z.string().optional().default("plan_fixed"),
	stages: z
		.array(
			z.object({
				stageOrder: z.number().int().positive().default(1),
				stageName: z.string().trim().min(1),
				completionPercentage: z.number().int().min(0).max(100).default(0),
				items: z
					.array(
						z.object({
							priceId: z.string().trim().min(1),
							name: z.string().trim().optional(),
							toothNumber: z.number().int().optional().nullable(),
							quantity: z.number().int().positive().default(1),
							price: z.number().nonnegative().default(0),
							discount: z.number().nonnegative().default(0),
							isBundle: z.boolean().default(false),
							doctorId: z.string().uuid().optional().nullable(),
						}),
					)
					.optional()
					.default([]),
			}),
		)
		.optional()
		.default([]),
});

export const updateTreatmentPlanStageSchema = z.object({
	status: z.enum(["planned", "in_progress", "completed", "agreed", "declined"]).optional(),
	completionPercentage: z.number().int().min(0).max(100).optional(),
	stageName: z.string().trim().optional(),
	isCompleted: z.boolean().optional(),
});

export const listTreatmentPlansQuerySchema = z.object({
	patientId: z.string().uuid().optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	limit: z.coerce.number().int().min(1).max(100).default(50),
	offset: z.coerce.number().int().min(0).default(0),
});

export const updateTreatmentPlanSchema = z.object({
	name: z.string().trim().min(1).optional(),
	title: z.string().trim().optional(),
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).optional(),
	discountMode: z.string().optional(),
	planDiscountPercent: z.number().min(0).max(100).optional(),
	planDiscountRub: z.number().nonnegative().optional(),
});

export const updateTreatmentPlanStatusSchema = z.object({
	status: z.enum(["Draft", "Active", "Approved", "Completed", "Rejected"]).default("Approved"),
	selectedTier: z.string().optional(),
});

/**
 * treatmentPlanMutations.ts — Создание, обновление сметы и проведение плана лечения.
 *
 * Декомпозирован из patientTreatmentPlanHandlers.ts по Мандатам 8b и 8zi.
 * Обеспечивает:
 * - Мандат 8e (Автономия врача): ноль 409 блокировок при изменении сметы, мягкое создание ревизий.
 * - Мандат 8n: суверенитет соло-врача и отсутствие бюрократических преград.
 * - Целочисленная арифметика в копейках (amountKopecks) и синхронизация книги лечения.
 */

export async function handleUpsertPatientTreatmentPlan(
	request: FastifyRequest<{ Params: { patientId: string } }>,
	reply: FastifyReply,
) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"treatment plan upsert",
	);
	if (!organizationId) return;

	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const access = verifyPlanWriteAccess(staffRole);
	if (!access.allowed) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.treatment_plan.write",
			role: staffRole,
			message: `Отказ в создании плана лечения: ${access.reason}`,
		});
	}

	const { patientId } = request.params;
	if (!UUID_SHAPE.test(patientId)) {
		return reply.code(400).send({ error: "InvalidPatientId" });
	}
	if (!(await ensurePatientInOrganization(patientId, organizationId))) {
		return reply.code(404).send({ error: "PatientNotFound" });
	}

	const parsed = treatmentPlanUpsertSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "TreatmentPlanValidationError",
			message: "План лечения не сохранен: проверьте услуги, цены и этапы.",
			details: parsed.error.format(),
		});
	}

	const input = parsed.data;
	const now = new Date();
	let planId: string | null = null;
	let totalPriceKopecks = 0;

	try {
		const calculatedTotals = calculateTreatmentPlanTotals(patientId, input.items);
		totalPriceKopecks = calculatedTotals.totalPriceKopecks;
		const totalPriceText = calculatedTotals.totalPriceText;

		planId = await withTenantCtx(organizationId, async (tx) => {
			let savedPlanId = input.id ?? null;
			let isRevision = false;

			if (savedPlanId) {
				const [existing] = await tx
					.select({
						id: treatmentPlans.id,
						patientSignature: treatmentPlans.patientSignature,
						status: treatmentPlans.status,
						version: treatmentPlans.version,
					})
					.from(treatmentPlans)
					.where(
						and(
							eq(treatmentPlans.id, savedPlanId),
							eq(treatmentPlans.patientId, patientId),
							eq(treatmentPlans.organizationId, organizationId),
						),
					)
					.for("update")
					.limit(1);

				if (!existing) return null;

				// Мандат 8e (Автономия врача):
				// При изменении ранее согласованного плана лечения НЕ БЛОКИРУЕМ врача 409 ошибкой!
				// Врач у кресла обновляет смету, система автоматически создает ревизию с инкрементом версии.
				if (existing.status === "Approved" || existing.patientSignature) {
					isRevision = true;
				}

				const [planUpdated] = await tx
					.update(treatmentPlans)
					.set({
						name: input.name,
						totalPrice: totalPriceText,
						totalPriceRub: debtNumericText(totalPriceKopecks),
						...(input.status !== undefined
							? { status: input.status }
							: {}),
						...(input.patientSignature !== undefined
							? { patientSignature: input.patientSignature }
							: isRevision
								? { patientSignature: null }
								: {}),
						...(input.planGroupId !== undefined
							? { planGroupId: input.planGroupId }
							: {}),
						...(input.groupName !== undefined
							? { groupName: input.groupName }
							: {}),
						...(input.isAlternative !== undefined
							? { isAlternative: input.isAlternative }
							: {}),
						...(input.alternativeTier !== undefined
							? { alternativeTier: input.alternativeTier }
							: {}),
						...(input.alternativeStatus !== undefined
							? { alternativeStatus: input.alternativeStatus }
							: {}),
						...(input.declinedReason !== undefined
							? { declinedReason: input.declinedReason }
							: {}),
						...(input.priceFreezePolicy !== undefined
							? { priceFreezePolicy: input.priceFreezePolicy }
							: {}),
						...(input.discountMode !== undefined
							? { discountMode: input.discountMode }
							: {}),
						...(input.planDiscountPercent !== undefined
							? { planDiscountPercent: input.planDiscountPercent }
							: {}),
						...(input.planDiscountRub !== undefined
							? { planDiscountRub: input.planDiscountRub }
							: {}),
						updatedAt: now,
						isSynced: false,
						version: sql`${treatmentPlans.version} + 1`,
					})
					.where(
						and(
							eq(treatmentPlans.id, savedPlanId),
							eq(treatmentPlans.patientId, patientId),
							eq(treatmentPlans.organizationId, organizationId),
						),
					)
					.returning({ id: treatmentPlans.id, version: treatmentPlans.version });
				if (!planUpdated) return null;

				await tx
					.delete(treatmentPlanItemsNew)
					.where(
						and(
							eq(treatmentPlanItemsNew.planId, savedPlanId),
							eq(treatmentPlanItemsNew.organizationId, organizationId),
						),
					);

				if (isRevision) {
					try {
						await tx.insert(auditEvents).values({
							organizationId,
							actorUserId: identity.userId ?? null,
							entityType: "treatment_plan",
							entityId: savedPlanId,
							action: "TREATMENT_PLAN_REVISED",
							reason: `Создана новая ревизия плана лечения (версия ${planUpdated.version}) врачом у кресла на сумму ${rublesFromKopecks(totalPriceKopecks)} ₽`,
						});
					} catch (auditErr) {
						request.log.warn({ err: auditErr }, "Не удалось записать аудит ревизии плана лечения");
					}
				}
			} else {
				const [created] = await tx
					.insert(treatmentPlans)
					.values({
						organizationId,
						patientId,
						name: input.name,
						status: input.status ?? "Draft",
						totalPrice: totalPriceText,
						totalPriceRub: debtNumericText(totalPriceKopecks),
						patientSignature: input.patientSignature ?? null,
						planGroupId: input.planGroupId ?? null,
						groupName: input.groupName ?? null,
						isAlternative: input.isAlternative ?? false,
						alternativeTier: input.alternativeTier ?? null,
						alternativeStatus: input.alternativeStatus ?? "proposed",
						declinedReason: input.declinedReason ?? null,
						priceFreezePolicy: input.priceFreezePolicy ?? "standard_30_days",
						discountMode: input.discountMode ?? "plan_fixed",
						planDiscountPercent: input.planDiscountPercent ?? 0,
						planDiscountRub: input.planDiscountRub ?? 0,
						isSynced: false,
						version: 1,
						updatedAt: now,
					})
					.returning({ id: treatmentPlans.id });
				savedPlanId = created?.id ?? null;

				if (savedPlanId) {
					try {
						await tx.insert(auditEvents).values({
							organizationId,
							actorUserId: identity.userId ?? null,
							entityType: "treatment_plan",
							entityId: savedPlanId,
							action: "TREATMENT_PLAN_CREATED",
							reason: `Создан план лечения «${input.name}» на сумму ${rublesFromKopecks(totalPriceKopecks)} ₽`,
						});
					} catch (auditErr) {
						request.log.warn({ err: auditErr }, "Не удалось записать аудит создания плана лечения");
					}
				}
			}

			if (!savedPlanId) return null;

			if (input.items.length > 0) {
				await tx.insert(treatmentPlanItemsNew).values(
					input.items.map((item) => ({
						organizationId,
						planId: savedPlanId,
						toothNumber: item.toothNumber ?? null,
						priceId: item.name
							? `${item.priceId}::${item.name}`
							: item.priceId,
						quantity: item.quantity,
						price: item.price.toString(),
						discount: item.discount.toString(),
						phase: item.phase,
						isBundle: Boolean(item.isAuto),
						doctorId: item.doctorId ?? null,
					})),
				);
			}

			const ledgerPrefix = savedPlanId.slice(0, LEDGER_ID_PREFIX_LENGTH).toLowerCase();
			const ownedRows = await tx
				.select({
					id: treatmentItems.id,
					status: treatmentItems.status,
					visitId: treatmentItems.visitId,
				})
				.from(treatmentItems)
				.where(
					and(
						eq(treatmentItems.organizationId, organizationId),
						eq(treatmentItems.patientId, patientId),
						sql`lower(left(${treatmentItems.id}::text, ${sql.raw(String(LEDGER_ID_PREFIX_LENGTH))})) = ${ledgerPrefix}`,
					),
				);

			const rewritableIds = ownedRows
				.filter(
					(row) =>
						row.visitId === null &&
						LEDGER_STATUSES_OWNED_BY_PLAN.has(row.status),
				)
				.map((row) => row.id);

			if (rewritableIds.length > 0) {
				await tx
					.delete(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							inArray(treatmentItems.id, rewritableIds),
						),
					);
			}
			const keptSlots = new Set(
				ownedRows
					.filter((row) => !rewritableIds.includes(row.id))
					.map((row) => row.id.toLowerCase()),
			);

			if (input.items.length > 0) {
				const priceIdCandidates = [
					...new Set(
						input.items
							.map((item) => item.priceId)
							.filter((priceId) => UUID_SHAPE.test(priceId)),
					),
				];
				const knownServiceIds = new Set<string>(
					priceIdCandidates.length === 0
						? []
						: (
								await tx
									.select({ id: serviceCatalogItems.id })
									.from(serviceCatalogItems)
									.where(
										and(
											eq(
												serviceCatalogItems.organizationId,
												organizationId,
											),
											inArray(serviceCatalogItems.id, priceIdCandidates),
										),
									)
							).map((row) => row.id),
				);

				const completedItems = await tx
					.select({ serviceId: treatmentItems.serviceId })
					.from(treatmentItems)
					.where(
						and(
							eq(treatmentItems.organizationId, organizationId),
							eq(treatmentItems.patientId, patientId),
							eq(treatmentItems.status, "completed"),
						),
					);

				const evaluation = await evaluateClinicalRulesInDb(organizationId, {
					patientId,
					serviceIds: Array.from(knownServiceIds),
					completedServiceIds: completedItems
						.map((r) => r.serviceId)
						.filter(Boolean) as string[],
					enforceBlockers: true,
				});

				const blockingRule = evaluation.evaluations.find(
					(e) => !e.resolved && e.severity === "blocker",
				);
				if (blockingRule) {
					if (input.allowClinicalBlockerOverride) {
						request.log.warn(
							{
								patientId,
								planId: savedPlanId,
								blockingRule: blockingRule.message,
								overrideReason: input.clinicalBlockerOverrideReason ?? null,
							},
							`[Автономия врача] План лечения сохранен под ответственность врача: ${blockingRule.message}`,
						);
					} else {
						const err = new Error(
							`Отказ: план содержит противопоказание. ${blockingRule.message}`,
						);
						// biome-ignore lint/suspicious/noExplicitAny: error mapping
						(err as any).statusCode = 400;
						throw err;
					}
				}

				const ledgerStatus = input.patientSignature
					? "approved"
					: "proposed";

				let slot = 0;
				const ledgerValues = input.items.map((item, index) => {
					while (
						slot <= LEDGER_MAX_SLOT &&
						keptSlots.has(ledgerRowId(savedPlanId, slot).toLowerCase())
					) {
						slot += 1;
					}
					if (slot > LEDGER_MAX_SLOT) {
						throw new Error(
							`Позиции плана лечения некуда записать: свободных слотов книги лечения не осталось (позиция ${index + 1}).`,
						);
					}
					const id = ledgerRowId(savedPlanId, slot);
					slot += 1;

					const lineTotalRub = rublesFromKopecks(
						chargeLineKopecks({
							patientId,
							status: ledgerStatus,
							unitPriceRub: item.price,
							quantity: item.quantity,
							discountRub: item.discount,
						}),
					);
					const unitPriceRub = rublesFromKopecks(
						chargeLineKopecks({
							patientId,
							status: ledgerStatus,
							unitPriceRub: item.price,
							quantity: 1,
							discountRub: 0,
						}),
					);
					return {
						id,
						organizationId,
						patientId,
						visitId: null,
						serviceId: knownServiceIds.has(item.priceId)
							? item.priceId
							: null,
						toothCode:
							item.toothNumber === null || item.toothNumber === undefined
								? null
								: String(item.toothNumber),
						title: item.name?.trim() || item.priceId,
						quantity: String(item.quantity),
						priceRub: lineTotalRub,
						unitPriceRub,
						discountRub: rublesFromKopecks(
							chargeLineKopecks({
								patientId,
								status: ledgerStatus,
								unitPriceRub: item.discount,
								quantity: 1,
								discountRub: 0,
							}),
						),
						status: ledgerStatus as "proposed" | "approved",
						plannedDoctorUserId: item.doctorId ?? null,
						notes: null,
					};
				});
				await tx.insert(treatmentItems).values(ledgerValues);
			}

			return savedPlanId;
		});
		// biome-ignore lint/suspicious/noExplicitAny: error mapping
	} catch (err: any) {
		if (err.statusCode) {
			return reply.code(err.statusCode).send({
				error: "TreatmentPlanValidationError",
				message: err.message,
			});
		}
		throw err;
	}

	if (!planId) {
		return reply.code(input.id ? 404 : 500).send({
			error: input.id ? "TreatmentPlanNotFound" : "TreatmentPlanSaveFailed",
		});
	}

	const [savedPlan] = await loadTreatmentPlansForPatient(patientId, organizationId);
	return reply.send({
		success: true,
		planId,
		totalPrice: numeric(rublesFromKopecks(totalPriceKopecks)),
		plan: savedPlan ?? null,
	});
}

/**
 * handleCreateTreatmentPlan — Создание плана лечения с синхронизацией книги лечения (ledger).
 * Мандат 8b, 8e: целостный финансовый и клинический контур (treatment_items).
 */
export async function handleCreateTreatmentPlan(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string,
) {
	const parsed = createTreatmentPlanSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные данные для создания плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const [patient] = await db
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) {
		return reply.code(404).send({
			error: "PatientNotFound",
			message: "Пациент не найден в базе вашей клиники.",
		});
	}

	let calculatedTotalRub = data.totalPriceRub ?? 0;
	if (calculatedTotalRub === 0 && data.stages.length > 0) {
		for (const st of data.stages) {
			for (const it of st.items) {
				calculatedTotalRub += Math.max(0, it.price * it.quantity - it.discount);
			}
		}
	}
	const totalKopecks = Math.round(calculatedTotalRub * 100);

	const result = await db.transaction(async (tx) => {
		const [newPlan] = await tx
			.insert(treatmentPlans)
			.values({
				organizationId,
				patientId: data.patientId,
				doctorId: data.doctorId || null,
				name: data.name,
				title: data.title || data.name,
				status: "Draft",
				totalPriceRub: debtNumericText(totalKopecks),
				totalPrice: debtNumericText(totalKopecks),
				discountMode: data.discountMode,
				planDiscountPercent: data.planDiscountPercent,
				planDiscountRub: data.planDiscountRub,
				version: 1,
				isSynced: false,
			})
			.returning();

		if (!newPlan) {
			throw new Error("Не удалось создать план лечения в транзакции");
		}

		const createdStages: Array<typeof treatmentPlanStages.$inferSelect> = [];
		const createdItems: Array<typeof treatmentPlanItemsNew.$inferSelect> = [];
		const allItemsFlat: Array<{
			priceId: string;
			name?: string;
			toothNumber?: number | null;
			quantity: number;
			price: number;
			discount: number;
			doctorId?: string | null;
		}> = [];

		for (const st of data.stages) {
			const [createdStage] = await tx
				.insert(treatmentPlanStages)
				.values({
					organizationId,
					patientName: patient.fullName || "Пациент",
					planTitle: newPlan.title || newPlan.name,
					stageOrder: st.stageOrder,
					stageName: st.stageName,
					completionPercentage: st.completionPercentage,
				})
				.returning();

			if (createdStage) createdStages.push(createdStage);

			for (const item of st.items) {
				const [createdItem] = await tx
					.insert(treatmentPlanItemsNew)
					.values({
						organizationId,
						planId: newPlan.id,
						toothNumber: item.toothNumber ?? null,
						priceId: item.priceId,
						quantity: item.quantity,
						price: item.price.toFixed(2),
						discount: item.discount.toFixed(2),
						phase: st.stageOrder,
						isBundle: item.isBundle,
						doctorId: item.doctorId || data.doctorId || null,
					})
					.returning();

				if (createdItem) createdItems.push(createdItem);
				allItemsFlat.push(item);
			}
		}

		// Синхронизация с книгой лечения (treatment_items)
		if (allItemsFlat.length > 0) {
			let slot = 0;
			const ledgerValues = allItemsFlat.map((item, index) => {
				const id = ledgerRowId(newPlan.id, slot);
				slot += 1;
				const unitPriceRub = item.price.toFixed(2);
				const lineTotalRub = Math.max(0, item.price * item.quantity - item.discount).toFixed(2);

				return {
					id,
					organizationId,
					patientId: data.patientId,
					visitId: null,
					serviceId: UUID_SHAPE.test(item.priceId) ? item.priceId : null,
					toothCode: item.toothNumber ? String(item.toothNumber) : null,
					title: item.name?.trim() || item.priceId,
					quantity: String(item.quantity),
					priceRub: lineTotalRub,
					unitPriceRub,
					discountRub: item.discount.toFixed(2),
					status: "proposed" as const,
					plannedDoctorUserId: item.doctorId || data.doctorId || null,
					notes: null,
				};
			});
			await tx.insert(treatmentItems).values(ledgerValues);
		}

		try {
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: newPlan.id,
				action: "TREATMENT_PLAN_CREATED",
				reason: `Создан план комплексного лечения «${newPlan.name}» на сумму ${calculatedTotalRub} ₽ с фиксацией в книге лечения`,
			});
		} catch (auditErr) {
			request.log.warn({ err: auditErr }, "Не удалось записать аудит создания плана лечения");
		}

		return { plan: newPlan, stages: createdStages, itemsCount: createdItems.length };
	});

	return reply.code(201).send({
		success: true,
		treatmentPlan: result.plan,
		stages: result.stages,
		itemsCount: result.itemsCount,
	});
}

export async function handleUpdateTreatmentPlanStage(
	request: FastifyRequest<{ Params: { id: string; stageId: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id: planId, stageId } = request.params;
	const parsed = updateTreatmentPlanStageSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры обновления этапа плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const [plan] = await db
		.select({ id: treatmentPlans.id, name: treatmentPlans.name })
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!plan) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const data = parsed.data;
	const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stageId);
	const stageOrderNumber = Number.parseInt(stageId, 10);

	const updateResult = await db.transaction(async (tx) => {
		const stageCondition = isUuid
			? and(eq(treatmentPlanStages.id, stageId), eq(treatmentPlanStages.organizationId, organizationId))
			: !Number.isNaN(stageOrderNumber)
				? and(
						eq(treatmentPlanStages.stageOrder, stageOrderNumber),
						eq(treatmentPlanStages.organizationId, organizationId),
					)
				: null;

		if (!stageCondition) {
			return null;
		}

		const [targetStage] = await tx.select().from(treatmentPlanStages).where(stageCondition).limit(1);
		if (!targetStage) {
			return null;
		}

		const isCompleted = data.isCompleted ?? (data.status === "completed");
		const completionPercentage = data.completionPercentage ?? (isCompleted ? 100 : targetStage.completionPercentage);

		const [updatedStage] = await tx
			.update(treatmentPlanStages)
			.set({
				stageName: data.stageName ?? targetStage.stageName,
				completionPercentage,
				autoArchived: isCompleted ? true : targetStage.autoArchived,
				archivedAt: isCompleted ? new Date() : targetStage.archivedAt,
			})
			.where(eq(treatmentPlanStages.id, targetStage.id))
			.returning();

		return updatedStage;
	});

	if (!updateResult) {
		return reply.code(404).send({
			error: "StageNotFound",
			message: "Этап плана лечения не найден.",
		});
	}

	return reply.code(200).send({
		success: true,
		stage: updateResult,
	});
}

export async function handleListTreatmentPlans(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string,
) {
	const parsed = listTreatmentPlansQuerySchema.safeParse(request.query);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фильтра планов лечения.",
			issues: parsed.error.issues,
		});
	}

	const { patientId, status, limit, offset } = parsed.data;

	const conditions = [eq(treatmentPlans.organizationId, organizationId)];
	if (patientId) {
		conditions.push(eq(treatmentPlans.patientId, patientId));
	}
	if (status) {
		conditions.push(eq(treatmentPlans.status, status));
	}

	const plans = await db
		.select({
			id: treatmentPlans.id,
			organizationId: treatmentPlans.organizationId,
			patientId: treatmentPlans.patientId,
			doctorId: treatmentPlans.doctorId,
			name: treatmentPlans.name,
			title: treatmentPlans.title,
			status: treatmentPlans.status,
			totalPriceRub: treatmentPlans.totalPriceRub,
			totalPrice: treatmentPlans.totalPrice,
			discountMode: treatmentPlans.discountMode,
			planDiscountPercent: treatmentPlans.planDiscountPercent,
			planDiscountRub: treatmentPlans.planDiscountRub,
			createdAt: treatmentPlans.createdAt,
			updatedAt: treatmentPlans.updatedAt,
			approvedAt: treatmentPlans.approvedAt,
		})
		.from(treatmentPlans)
		.where(and(...conditions))
		.orderBy(desc(treatmentPlans.createdAt))
		.limit(limit)
		.offset(offset);

	return reply.code(200).send({
		success: true,
		plans,
		totalCount: plans.length,
	});
}

export async function handleUpdateTreatmentPlan(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const parsed = updateTreatmentPlanSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры обновления плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const updatePayload: Partial<typeof treatmentPlans.$inferInsert> = {
		updatedAt: new Date(),
	};
	if (data.name !== undefined) updatePayload.name = data.name;
	if (data.title !== undefined) updatePayload.title = data.title;
	if (data.status !== undefined) updatePayload.status = data.status;
	if (data.discountMode !== undefined) updatePayload.discountMode = data.discountMode;
	if (data.planDiscountPercent !== undefined) updatePayload.planDiscountPercent = data.planDiscountPercent;
	if (data.planDiscountRub !== undefined) updatePayload.planDiscountRub = data.planDiscountRub;

	const [updatedPlan] = await db
		.update(treatmentPlans)
		.set(updatePayload)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateFailed",
			message: "Не удалось обновить план лечения",
		});
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
	});
}

export async function handleApproveTreatmentPlan(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const [approvedPlan] = await db
		.update(treatmentPlans)
		.set({
			status: "Approved",
			approvedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	if (!approvedPlan) {
		return reply.code(500).send({
			error: "ApproveFailed",
			message: "Не удалось утвердить план лечения",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: "TREATMENT_PLAN_APPROVED",
			reason: `План лечения «${approvedPlan.name}» утвержден (сумма: ${approvedPlan.totalPriceRub || approvedPlan.totalPrice} ₽)`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит утверждения плана лечения");
	}

	return reply.code(200).send({
		success: true,
		plan: approvedPlan,
	});
}

export async function handleUpdateTreatmentPlanStatus(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
	organizationId: string,
) {
	const { id } = request.params;
	const parsed = updateTreatmentPlanStatusSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры статуса плана лечения: " + parsed.error.issues.map((i) => i.message).join("; "),
			issues: parsed.error.issues,
		});
	}
	const status = parsed.data.status;

	const [existing] = await db
		.select()
		.from(treatmentPlans)
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.limit(1);

	if (!existing) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	const isApproved = status.toLowerCase() === "approved";
	const [updatedPlan] = await db
		.update(treatmentPlans)
		.set({
			status,
			...(isApproved ? { approvedAt: new Date() } : {}),
			updatedAt: new Date(),
		})
		.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
		.returning();

	if (!updatedPlan) {
		return reply.code(500).send({
			error: "UpdateStatusFailed",
			message: "Не удалось обновить статус плана лечения.",
		});
	}

	try {
		await db.insert(auditEvents).values({
			organizationId,
			actorUserId: null,
			entityType: "treatment_plan",
			entityId: id,
			action: isApproved ? "TREATMENT_PLAN_APPROVED" : "TREATMENT_PLAN_STATUS_CHANGED",
			reason: `Статус плана лечения «${updatedPlan.name || updatedPlan.title}» изменен на «${status}»`,
		});
	} catch (auditErr) {
		request.log.warn({ err: auditErr }, "Не удалось записать аудит смены статуса плана лечения");
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
	});
}
