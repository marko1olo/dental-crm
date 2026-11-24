import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { formatKopecksToRub, formatKopecksToRubles, kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	auditEvents,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../../../db/schema.js";
import { calculateEffectivePlanDiscount } from "../treatmentPlanTotalsCalculator.js";
import { updateTreatmentPlanSchema } from "./schemas.js";

/**
 * updateTreatmentPlanHandler.ts — Редактирование реквизитов и режима скидок плана лечения.
 * Мандат 8b/8zi: компактный изолированный хэндлер мутаций с синхронным пересчетом копеечных итогов.
 */
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

	const updatedPlan = await withTenantCtx(organizationId, async (tx) => {
		const [existing] = await tx
			.select()
			.from(treatmentPlans)
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.for("update")
			.limit(1);

		if (!existing) {
			return null;
		}

		const updatePayload: Partial<typeof treatmentPlans.$inferInsert> = {
			updatedAt: new Date(),
		};
		if (data.name !== undefined) updatePayload.name = data.name;
		if (data.title !== undefined) updatePayload.title = data.title;
		if (data.diagnosisIcd10 !== undefined) updatePayload.diagnosisIcd10 = data.diagnosisIcd10;
		if (data.diagnosisTitle !== undefined) updatePayload.diagnosisTitle = data.diagnosisTitle;
		if (data.status !== undefined) updatePayload.status = data.status;
		if (data.discountMode !== undefined) updatePayload.discountMode = data.discountMode;
		if (data.planDiscountPercent !== undefined) updatePayload.planDiscountPercent = data.planDiscountPercent;
		if (data.planDiscountRub !== undefined) updatePayload.planDiscountRub = data.planDiscountRub;
		if (data.isInstallment !== undefined) updatePayload.isInstallment = data.isInstallment;
		if (data.installmentMonths !== undefined) updatePayload.installmentMonths = data.installmentMonths;
		if (data.downPaymentKopecks !== undefined) updatePayload.downPaymentKopecks = data.downPaymentKopecks;
		if (data.monthlyPaymentKopecks !== undefined) updatePayload.monthlyPaymentKopecks = data.monthlyPaymentKopecks;
		if (data.curatorId !== undefined) updatePayload.curatorId = data.curatorId;
		if (data.curatorName !== undefined) updatePayload.curatorName = data.curatorName;
		if (data.curatorFunnelStage !== undefined) updatePayload.curatorFunnelStage = data.curatorFunnelStage;
		if (data.curatorNextContactDate !== undefined) updatePayload.curatorNextContactDate = data.curatorNextContactDate;
		if (data.curatorNotes !== undefined) updatePayload.curatorNotes = data.curatorNotes;

		// Мандат 8bm: Синхронный пересчет копеечных итогов плана при изменении параметров скидок
		const isDiscountTouched =
			data.discountMode !== undefined ||
			data.planDiscountPercent !== undefined ||
			data.planDiscountRub !== undefined;

		if (isDiscountTouched) {
			const items = await tx
				.select()
				.from(treatmentPlanItemsNew)
				.where(
					and(
						eq(treatmentPlanItemsNew.planId, id),
						eq(treatmentPlanItemsNew.organizationId, organizationId),
					),
				);

			let baseTotalKopecks = 0;
			if (items.length > 0) {
				for (const it of items) {
					const qty = Math.max(1, it.quantity || 1);
					const priceKop =
						it.priceKopecks != null && Number(it.priceKopecks) > 0
							? Number(it.priceKopecks)
							: rublesToKopecks(Number(it.price || 0));
					const discKop =
						it.discountKopecks != null && Number(it.discountKopecks) > 0
							? Number(it.discountKopecks)
							: rublesToKopecks(Number(it.discount || 0));
					baseTotalKopecks += Math.max(0, priceKop * qty - discKop);
				}
			} else {
				const existingBaseKop =
					existing.totalPriceKopecks != null && Number(existing.totalPriceKopecks) > 0
						? Number(existing.totalPriceKopecks) + Number(existing.planDiscountKopecks || 0)
						: rublesToKopecks(Number(existing.totalPriceRub || existing.totalPrice || 0));
				baseTotalKopecks = existingBaseKop;
			}

			const effective = calculateEffectivePlanDiscount({
				baseTotalKopecks,
				discountMode: data.discountMode ?? existing.discountMode ?? "plan_fixed",
				planDiscountPercent: Number(
					data.planDiscountPercent !== undefined
						? data.planDiscountPercent
						: existing.planDiscountPercent ?? 0,
				),
				planDiscountRub: Number(
					data.planDiscountRub !== undefined
						? data.planDiscountRub
						: existing.planDiscountRub ?? 0,
				),
			});

			updatePayload.totalPriceKopecks = BigInt(effective.finalTotalKopecks);
			updatePayload.planDiscountKopecks = BigInt(effective.discountKopecks);
			updatePayload.totalPriceRub = String(kopecksToRubles(effective.finalTotalKopecks));
			updatePayload.totalPrice = formatKopecksToRubles(effective.finalTotalKopecks);
		}

		const [updated] = await tx
			.update(treatmentPlans)
			.set(updatePayload)
			.where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.organizationId, organizationId)))
			.returning();

		if (updated) {
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: id,
				action: "TREATMENT_PLAN_UPDATED",
				reason: `План лечения «${updated.name || updated.title}» обновлен (сумма: ${formatKopecksToRub(updated.totalPriceKopecks ? Number(updated.totalPriceKopecks) : rublesToKopecks(Number(updated.totalPrice || 0)))})`,
			});
		}

		return updated;
	});

	if (!updatedPlan) {
		return reply.code(404).send({
			error: "TreatmentPlanNotFound",
			message: "План лечения не найден.",
		});
	}

	return reply.code(200).send({
		success: true,
		plan: updatedPlan,
	});
}
