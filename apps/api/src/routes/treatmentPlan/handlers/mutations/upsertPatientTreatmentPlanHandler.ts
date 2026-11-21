import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { rublesToKopecks, kopecksToRubles } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	auditEvents,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../../db/schema.js";
import { debtNumericText, rublesFromKopecks } from "../../../../money/patientDebt.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import {
	ensurePatientInOrganization,
	loadTreatmentPlansForPatient,
	numeric,
	serializeTreatmentPlan,
	verifyPlanWriteAccess,
} from "../../../odontogram/planHelpers.js";
import {
	UUID_SHAPE,
	treatmentPlanUpsertSchema,
} from "../../../odontogram/types.js";
import {
	calculateEffectivePlanDiscount,
	calculateTreatmentPlanTotals,
} from "../treatmentPlanTotalsCalculator.js";
import { syncUpsertPlanLedgerItems } from "./planLedgerSync.js";

interface CustomErrorWithStatus extends Error {
	statusCode?: number;
}

/**
 * upsertPatientTreatmentPlanHandler.ts — Создание, обновление сметы и проведение плана лечения.
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
	const staffRole = identity.role ?? request.user?.role ?? null;
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
						discountMode: treatmentPlans.discountMode,
						planDiscountPercent: treatmentPlans.planDiscountPercent,
						planDiscountRub: treatmentPlans.planDiscountRub,
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

				const effectiveDiscount = calculateEffectivePlanDiscount({
					baseTotalKopecks: calculatedTotals.totalPriceKopecks,
					discountMode: input.discountMode ?? existing.discountMode ?? "plan_fixed",
					planDiscountPercent: input.planDiscountPercent !== undefined
						? input.planDiscountPercent
						: Number(existing.planDiscountPercent ?? 0),
					planDiscountRub: input.planDiscountRub !== undefined
						? input.planDiscountRub
						: Number(existing.planDiscountRub ?? 0),
				});
				totalPriceKopecks = effectiveDiscount.finalTotalKopecks;
				const effectiveTotalPriceText = debtNumericText(totalPriceKopecks);

				const [planUpdated] = await tx
					.update(treatmentPlans)
					.set({
						name: input.name,
						totalPrice: effectiveTotalPriceText,
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
				const effectiveDiscount = calculateEffectivePlanDiscount({
					baseTotalKopecks: calculatedTotals.totalPriceKopecks,
					discountMode: input.discountMode ?? "plan_fixed",
					planDiscountPercent: input.planDiscountPercent ?? 0,
					planDiscountRub: input.planDiscountRub ?? 0,
				});
				totalPriceKopecks = effectiveDiscount.finalTotalKopecks;
				const effectiveTotalPriceText = debtNumericText(totalPriceKopecks);

				const [created] = await tx
					.insert(treatmentPlans)
					.values({
						organizationId,
						patientId,
						name: input.name,
						status: input.status ?? "Draft",
						totalPrice: effectiveTotalPriceText,
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

			// Синхронизация этапов treatment_plan_stages для сохранения stageId
			const stageMap = new Map<number, string>();
			const existingStages = await tx
				.select()
				.from(treatmentPlanStages)
				.where(
					and(
						eq(treatmentPlanStages.planId, savedPlanId),
						eq(treatmentPlanStages.organizationId, organizationId),
					),
				);
			const existingByOrder = new Map(existingStages.map((s) => [s.stageOrder, s]));

			// 1. Если явно переданы stages
			if (input.stages && input.stages.length > 0) {
				for (const stg of input.stages) {
					const order = stg.stageOrder || 1;
					const existing = existingByOrder.get(order);
					if (existing) {
						await tx
							.update(treatmentPlanStages)
							.set({
								stageName: stg.stageName || existing.stageName,
								completionPercentage: stg.completionPercentage ?? existing.completionPercentage,
							})
							.where(eq(treatmentPlanStages.id, existing.id));
						stageMap.set(order, existing.id);
					} else {
						const [created] = await tx
							.insert(treatmentPlanStages)
							.values({
								organizationId,
								planId: savedPlanId,
								stageOrder: order,
								stageName: stg.stageName || `Этап ${order}`,
								completionPercentage: stg.completionPercentage ?? 0,
							})
							.returning({ id: treatmentPlanStages.id });
						if (created) stageMap.set(order, created.id);
					}
				}
			}

			// 2. Для всех фаз из элементов плана гарантируем наличие этапа в treatment_plan_stages
			for (const item of input.items) {
				const phaseNum = item.phase || 1;
				if (!stageMap.has(phaseNum)) {
					const existing = existingByOrder.get(phaseNum);
					if (existing) {
						stageMap.set(phaseNum, existing.id);
					} else {
						const [created] = await tx
							.insert(treatmentPlanStages)
							.values({
								organizationId,
								planId: savedPlanId,
								stageOrder: phaseNum,
								stageName: `Этап ${phaseNum}`,
								completionPercentage: 0,
							})
							.returning({ id: treatmentPlanStages.id });
						if (created) stageMap.set(phaseNum, created.id);
					}
				}
			}

			// Diff-based Upsert (ROT-004): Загружаем существующие элементы плана лечения
			const existingPlanItems = savedPlanId
				? await tx
						.select()
						.from(treatmentPlanItemsNew)
						.where(
							and(
								eq(treatmentPlanItemsNew.planId, savedPlanId),
								eq(treatmentPlanItemsNew.organizationId, organizationId),
							),
						)
				: [];
			const existingItemMap = new Map(existingPlanItems.map((it) => [it.id, it]));

			// Находим элементы, которые были удалены пользователем
			const incomingItemIds = new Set(
				input.items
					.map((item) => item.id)
					.filter((id): id is string => Boolean(id && existingItemMap.has(id))),
			);

			const idsToDelete = existingPlanItems
				.filter((it) => !incomingItemIds.has(it.id))
				.map((it) => it.id);

			if (idsToDelete.length > 0) {
				await tx
					.delete(treatmentPlanItemsNew)
					.where(
						and(
							inArray(treatmentPlanItemsNew.id, idsToDelete),
							eq(treatmentPlanItemsNew.organizationId, organizationId),
						),
					);
			}

			// Выполняем update для существующих строк или insert для новых
			const createdItemsList: Array<{ id: string }> = [];
			for (const item of input.items) {
				const phaseNum = item.phase || 1;
				const itemPriceKopecks =
					typeof item.unitPriceKopecks === "number" && item.unitPriceKopecks > 0
						? Math.round(item.unitPriceKopecks)
						: rublesToKopecks(item.price);
				const itemDiscountKopecks = rublesToKopecks(item.discount);
				const itemPayload = {
					organizationId,
					planId: savedPlanId,
					stageId: stageMap.get(phaseNum) ?? null,
					toothNumber: item.toothNumber ?? null,
					priceId: item.priceId || (item.isCustom ? "custom" : "service-item"),
					name: item.name ?? null,
					quantity: item.quantity,
					price: item.price.toString(),
					discount: item.discount.toString(),
					priceKopecks: itemPriceKopecks,
					discountKopecks: itemDiscountKopecks,
					phase: phaseNum,
					isBundle: Boolean(item.isAuto),
					doctorId: item.doctorId ?? null,
				};

				if (item.id && existingItemMap.has(item.id)) {
					await tx
						.update(treatmentPlanItemsNew)
						.set(itemPayload)
						.where(
							and(
								eq(treatmentPlanItemsNew.id, item.id),
								eq(treatmentPlanItemsNew.organizationId, organizationId),
							),
						);
					createdItemsList.push({ id: item.id });
				} else {
					const [created] = await tx
						.insert(treatmentPlanItemsNew)
						.values(itemPayload)
						.returning({ id: treatmentPlanItemsNew.id });
					if (created) {
						createdItemsList.push({ id: created.id });
					}
				}
			}

			// DEF-03: Синхронизация книги лечения (treatment_items) с сохранением FK treatmentPlanItemId
			const itemsWithPlanItemId = input.items.map((item, idx) => ({
				...item,
				treatmentPlanItemId: createdItemsList[idx]?.id ?? null,
			}));

			await syncUpsertPlanLedgerItems(tx, {
				organizationId,
				patientId,
				savedPlanId,
				items: itemsWithPlanItemId,
				patientSignature: input.patientSignature,
				allowClinicalBlockerOverride: input.allowClinicalBlockerOverride,
				clinicalBlockerOverrideReason: input.clinicalBlockerOverrideReason,
				logger: request.log,
			});

			return savedPlanId;
		});
	} catch (err: unknown) {
		const customErr = err as CustomErrorWithStatus;
		if (customErr.statusCode) {
			return reply.code(customErr.statusCode).send({
				error: "TreatmentPlanValidationError",
				message: customErr.message,
			});
		}
		throw err;
	}

	if (!planId) {
		return reply.code(input.id ? 404 : 500).send({
			error: input.id ? "TreatmentPlanNotFound" : "TreatmentPlanSaveFailed",
		});
	}

	const patientPlans = await loadTreatmentPlansForPatient(patientId, organizationId);
	let savedPlan = patientPlans.find((p) => p.id === planId) ?? null;
	if (!savedPlan) {
		const [rawPlan] = await db
			.select()
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.id, planId),
					eq(treatmentPlans.patientId, patientId),
					eq(treatmentPlans.organizationId, organizationId),
				),
			)
			.limit(1);
		savedPlan = rawPlan ? serializeTreatmentPlan(rawPlan, []) : null;
	}

	return reply.send({
		success: true,
		planId,
		totalPrice: numeric(rublesFromKopecks(totalPriceKopecks)),
		plan: savedPlan ?? null,
	});
}
