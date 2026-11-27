import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withSavepoint, withTenantCtx } from "../../../../db/rls.js";
import {
	auditEvents,
	treatmentPlans,
} from "../../../../db/schema.js";
import { debtNumericText, rublesFromKopecks } from "../../../../money/patientDebt.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import {
	ensurePatientInOrganization,
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
import { syncUpsertPlanStagesAndItems } from "./upsertPlanStagesAndItems.js";

interface CustomErrorWithStatus extends Error {
	statusCode?: number;
}

/**
 * upsertPatientTreatmentPlanHandler.ts — Создание, обновление сметы и проведение плана лечения.
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
	let upsertResult:
		| { patientNotFound: true }
		| {
				savedPlanId: string;
				responseBody: Record<string, unknown>;
		  }
		| null = null;
	let totalPriceKopecks = 0;

	try {
		const calculatedTotals = calculateTreatmentPlanTotals(patientId, input.items);
		totalPriceKopecks = calculatedTotals.totalPriceKopecks;

		upsertResult = await withTenantCtx(organizationId, async (tx) => {
			if (!(await ensurePatientInOrganization(patientId, organizationId, tx))) {
				return { patientNotFound: true as const };
			}
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
						planDiscountKopecks: treatmentPlans.planDiscountKopecks,
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

				if (existing.status === "Approved" || existing.patientSignature) {
					isRevision = true;
				}

				const hasExplicitDiscountInput =
					input.planDiscountRub !== undefined || input.planDiscountPercent !== undefined;
				const existingDiscountKopecks =
					!hasExplicitDiscountInput &&
					existing.planDiscountKopecks != null &&
					(Number(existing.planDiscountKopecks) !== 0 || Number(existing.planDiscountRub ?? 0) === 0)
						? existing.planDiscountKopecks
						: undefined;
				const effectiveDiscount = calculateEffectivePlanDiscount({
					baseTotalKopecks: calculatedTotals.totalPriceKopecks,
					discountMode: input.discountMode ?? existing.discountMode ?? "plan_fixed",
					planDiscountPercent: input.planDiscountPercent !== undefined
						? input.planDiscountPercent
						: Number(existing.planDiscountPercent ?? 0),
					planDiscountRub: input.planDiscountRub !== undefined
						? input.planDiscountRub
						: Number(existing.planDiscountRub ?? 0),
					...(existingDiscountKopecks !== undefined
						? { planDiscountKopecks: existingDiscountKopecks }
						: {}),
				});
				totalPriceKopecks = effectiveDiscount.finalTotalKopecks;
				const effectiveTotalPriceText = debtNumericText(totalPriceKopecks);

				const [planUpdated] = await tx
					.update(treatmentPlans)
					.set({
						name: input.name,
						totalPrice: effectiveTotalPriceText,
						totalPriceRub: debtNumericText(totalPriceKopecks),
						totalPriceKopecks: BigInt(totalPriceKopecks),
						planDiscountKopecks: BigInt(effectiveDiscount.discountKopecks),
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
						...(input.diagnosisIcd10 !== undefined
							? { diagnosisIcd10: input.diagnosisIcd10 }
							: {}),
						...(input.diagnosisTitle !== undefined
							? { diagnosisTitle: input.diagnosisTitle }
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
						...(input.isInstallment !== undefined
							? { isInstallment: input.isInstallment }
							: {}),
						...(input.installmentMonths !== undefined
							? { installmentMonths: input.installmentMonths }
							: {}),
						...(input.downPaymentKopecks !== undefined
							? { downPaymentKopecks: input.downPaymentKopecks }
							: {}),
						...(input.monthlyPaymentKopecks !== undefined
							? { monthlyPaymentKopecks: input.monthlyPaymentKopecks }
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
					const revisedPlanId = savedPlanId;
					try {
						await withSavepoint(tx, async (spTx) => {
							await spTx.insert(auditEvents).values({
								organizationId,
								actorUserId: identity.userId ?? null,
								entityType: "treatment_plan",
								entityId: revisedPlanId,
								action: "TREATMENT_PLAN_REVISED",
								reason: `Создана новая ревизия плана лечения (версия ${planUpdated.version}) врачом у кресла на сумму ${rublesFromKopecks(totalPriceKopecks)} ₽`,
							});
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
						diagnosisIcd10: input.diagnosisIcd10 ?? null,
						diagnosisTitle: input.diagnosisTitle ?? null,
						status: input.status ?? "Draft",
						totalPrice: effectiveTotalPriceText,
						totalPriceRub: debtNumericText(totalPriceKopecks),
						totalPriceKopecks: BigInt(totalPriceKopecks),
						planDiscountKopecks: BigInt(effectiveDiscount.discountKopecks),
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
						isInstallment: input.isInstallment ?? false,
						installmentMonths: input.installmentMonths ?? null,
						downPaymentKopecks: input.downPaymentKopecks ?? null,
						monthlyPaymentKopecks: input.monthlyPaymentKopecks ?? null,
						isSynced: false,
						version: 1,
						updatedAt: now,
					})
					.returning({ id: treatmentPlans.id });
				savedPlanId = created?.id ?? null;

				if (savedPlanId) {
					const createdPlanId = savedPlanId;
					try {
						await withSavepoint(tx, async (spTx) => {
							await spTx.insert(auditEvents).values({
								organizationId,
								actorUserId: identity.userId ?? null,
								entityType: "treatment_plan",
								entityId: createdPlanId,
								action: "TREATMENT_PLAN_CREATED",
								reason: `Создан план лечения «${input.name}» на сумму ${rublesFromKopecks(totalPriceKopecks)} ₽`,
							});
						});
					} catch (auditErr) {
						request.log.warn({ err: auditErr }, "Не удалось записать аудит создания плана лечения");
					}
				}
			}

			if (!savedPlanId) return null;

			await syncUpsertPlanStagesAndItems(tx, {
				organizationId,
				patientId,
				savedPlanId,
				input,
				logger: request.log,
			});

			const [rawPlan] = await tx
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.id, savedPlanId),
						eq(treatmentPlans.patientId, patientId),
						eq(treatmentPlans.organizationId, organizationId),
					),
				)
				.limit(1);

			const savedPlan = rawPlan ? serializeTreatmentPlan(rawPlan, []) : null;

			const responseBody: Record<string, unknown> = {
				success: true,
				planId: savedPlanId,
				totalPrice: numeric(rublesFromKopecks(totalPriceKopecks)),
				plan: savedPlan ?? null,
			};

			return {
				savedPlanId,
				responseBody,
			};
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

	if (upsertResult && "patientNotFound" in upsertResult) {
		return reply.code(404).send({ error: "PatientNotFound" });
	}

	if (!upsertResult || !upsertResult.savedPlanId) {
		return reply.code(input.id ? 404 : 500).send({
			error: input.id ? "TreatmentPlanNotFound" : "TreatmentPlanSaveFailed",
		});
	}

	return reply.send(upsertResult.responseBody);
}
