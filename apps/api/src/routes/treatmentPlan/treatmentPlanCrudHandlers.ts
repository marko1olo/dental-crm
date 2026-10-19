import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/client.js";
import {
	auditEvents,
	patients,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../db/schema.js";

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

	// Проверяем принадлежность пациента клинике
	const [patient] = await db
		.select({
			id: patients.id,
			fullName: patients.fullName,
		})
		.from(patients)
		.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) {
		return reply.code(404).send({
			error: "PatientNotFound",
			message: "Пациент не найден в базе вашей клиники.",
		});
	}

	const patientFullName = patient.fullName || "Пациент";

	// Рассчитываем сумму плана
	let calculatedTotalRub = data.totalPriceRub ?? 0;
	if (calculatedTotalRub === 0 && data.stages.length > 0) {
		for (const st of data.stages) {
			for (const it of st.items) {
				calculatedTotalRub += Math.max(0, it.price * it.quantity - it.discount);
			}
		}
	}

	const result = await db.transaction(async (tx) => {
		// 1. Создаем план лечения
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

		const createdStages: Array<typeof treatmentPlanStages.$inferSelect> = [];
		const createdItems: Array<typeof treatmentPlanItemsNew.$inferSelect> = [];

		// 2. Создаем этапы и процедуры
		for (const st of data.stages) {
			const [createdStage] = await tx
				.insert(treatmentPlanStages)
				.values({
					organizationId,
					patientName: patientFullName,
					planTitle: newPlan.title || newPlan.name,
					stageOrder: st.stageOrder,
					stageName: st.stageName,
					completionPercentage: st.completionPercentage,
				})
				.returning();

			if (createdStage) {
				createdStages.push(createdStage);
			}

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

				if (createdItem) {
					createdItems.push(createdItem);
				}
			}
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

		return {
			plan: newPlan,
			stages: createdStages,
			itemsCount: createdItems.length,
		};
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

	// 1. Проверяем существование плана
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

	// 2. Ищем и обновляем этап (по UUID или по порядковому номеру stageOrder)
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
