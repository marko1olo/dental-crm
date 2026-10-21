import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { auditEvents, patients, treatmentPlans } from "../../../db/schema.js";
import { insertPlanStagesAndItems } from "./planStageItemInserter.js";
import { createTreatmentPlanSchema } from "./schemas.js";

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
				totalPriceRub: calculatedTotalRub.toFixed(2),
				totalPrice: calculatedTotalRub.toFixed(2),
				discountMode: data.discountMode,
				planDiscountPercent: data.planDiscountPercent,
				planDiscountRub: data.planDiscountRub,
			})
			.returning();

		if (!newPlan) {
			throw new Error("Не удалось создать план лечения в транзакции");
		}

		const { createdStages, createdItems } = await insertPlanStagesAndItems(
			tx,
			organizationId,
			newPlan,
			patient.fullName || "Пациент",
			data.stages,
			data.doctorId,
		);

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
