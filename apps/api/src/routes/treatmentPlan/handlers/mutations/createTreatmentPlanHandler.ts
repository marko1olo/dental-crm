import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { db } from "../../../../db/client.js";
import {
	auditEvents,
	patients,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../../db/schema.js";
import { debtNumericText } from "../../../../money/patientDebt.js";
import { syncUpsertPlanLedgerItems, type SyncPlanLedgerItemInput } from "./planLedgerSync.js";
import { createTreatmentPlanSchema } from "./schemas.js";

/**
 * handleCreateTreatmentPlan — Создание клинического плана лечения и этапов (SSOT).
 * Мандаты 8b, 8e: план лечения — это клиническая смета, черновик не искажает отчёт дебиторки.
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

	let itemsTotalKopecks = 0;
	if (data.stages.length > 0) {
		for (const st of data.stages) {
			for (const it of st.items) {
				const unitKopecks = typeof it.unitPriceKopecks === "number" && it.unitPriceKopecks > 0
					? Math.round(it.unitPriceKopecks)
					: rublesToKopecks(it.price);
				const discountKopecks = rublesToKopecks(it.discount);
				const lineTotal = Math.max(0, unitKopecks * it.quantity - discountKopecks);
				itemsTotalKopecks += lineTotal;
			}
		}
	}

	let totalKopecks: number;
	if (typeof data.totalPriceRub === "number" && data.totalPriceRub > 0) {
		totalKopecks = rublesToKopecks(data.totalPriceRub);
	} else {
		let discountedKopecks = itemsTotalKopecks;
		if (typeof data.planDiscountRub === "number" && data.planDiscountRub > 0) {
			const planDiscountKopecks = rublesToKopecks(data.planDiscountRub);
			discountedKopecks = Math.max(0, discountedKopecks - planDiscountKopecks);
		} else if (typeof data.planDiscountPercent === "number" && data.planDiscountPercent > 0) {
			const percentDiscountKopecks = Math.round((discountedKopecks * data.planDiscountPercent) / 100);
			discountedKopecks = Math.max(0, discountedKopecks - percentDiscountKopecks);
		}
		totalKopecks = discountedKopecks;
	}
	const calculatedTotalRub = kopecksToRubles(totalKopecks);

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
		const allItemsFlat: SyncPlanLedgerItemInput[] = [];

		for (const st of data.stages) {
			const [createdStage] = await tx
				.insert(treatmentPlanStages)
				.values({
					organizationId,
					planId: newPlan.id,
					stageOrder: st.stageOrder,
					stageName: st.stageName,
					completionPercentage: st.completionPercentage,
				})
				.returning();

			if (createdStage) createdStages.push(createdStage);

			for (const item of st.items) {
				const itemPriceKopecks = typeof item.unitPriceKopecks === "number" && item.unitPriceKopecks > 0
					? Math.round(item.unitPriceKopecks)
					: rublesToKopecks(item.price);
				const itemDiscountKopecks = rublesToKopecks(item.discount);

				const [createdItem] = await tx
					.insert(treatmentPlanItemsNew)
					.values({
						organizationId,
						planId: newPlan.id,
						stageId: createdStage?.id ?? null,
						toothNumber: item.toothNumber ?? null,
						priceId: item.priceId || (item.isCustom ? "custom" : "service-item"),
						name: item.name ?? null,
						quantity: item.quantity,
						price: item.price.toFixed(2),
						discount: item.discount.toFixed(2),
						priceKopecks: itemPriceKopecks,
						discountKopecks: itemDiscountKopecks,
						phase: st.stageOrder,
						isBundle: item.isBundle,
						doctorId: item.doctorId || data.doctorId || null,
					})
					.returning();

				if (createdItem) createdItems.push(createdItem);
				allItemsFlat.push({
					...item,
					treatmentPlanItemId: createdItem?.id ?? null,
					phase: st.stageOrder,
					isAuto: item.isBundle,
				});
			}
		}

		if (allItemsFlat.length > 0) {
			await syncUpsertPlanLedgerItems(tx, {
				organizationId,
				patientId: data.patientId,
				savedPlanId: newPlan.id,
				items: allItemsFlat,
				patientSignature: null,
				logger: request.log,
			});
		}

		try {
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: newPlan.id,
				action: "TREATMENT_PLAN_CREATED",
				reason: `Создан план комплексного лечения «${newPlan.name}» на сумму ${calculatedTotalRub} ₽`,
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
