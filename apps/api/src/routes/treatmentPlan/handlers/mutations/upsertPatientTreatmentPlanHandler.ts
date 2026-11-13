import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	auditEvents,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../../../db/schema.js";
import { debtNumericText, rublesFromKopecks } from "../../../../money/patientDebt.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import {
	ensurePatientInOrganization,
	loadTreatmentPlansForPatient,
	numeric,
	verifyPlanWriteAccess,
} from "../../../odontogram/planHelpers.js";
import {
	UUID_SHAPE,
	treatmentPlanUpsertSchema,
} from "../../../odontogram/types.js";
import { calculateTreatmentPlanTotals } from "../treatmentPlanTotalsCalculator.js";
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
						priceId: item.priceId,
						name: item.name ?? null,
						quantity: item.quantity,
						price: item.price.toString(),
						discount: item.discount.toString(),
						phase: item.phase,
						isBundle: Boolean(item.isAuto),
						doctorId: item.doctorId ?? null,
					})),
				);
			}

			// Синхронизация книги лечения (treatment_items)
			await syncUpsertPlanLedgerItems(tx, {
				organizationId,
				patientId,
				savedPlanId,
				items: input.items,
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

	const [savedPlan] = await loadTreatmentPlansForPatient(patientId, organizationId);
	return reply.send({
		success: true,
		planId,
		totalPrice: numeric(rublesFromKopecks(totalPriceKopecks)),
		plan: savedPlan ?? null,
	});
}
