import { and, eq, inArray, or, type SQL } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../../db/client.js";
import {
	auditEvents,
	patients,
	serviceCatalogItems,
	treatmentItems,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../../db/schema.js";
import { debtNumericText } from "../../../../money/patientDebt.js";
import { ledgerRowId } from "../../../odontogram/planHelpers.js";
import { UUID_SHAPE } from "../../../odontogram/types.js";
import { createTreatmentPlanSchema } from "./schemas.js";

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
			name?: string | undefined;
			toothNumber?: number | null | undefined;
			quantity: number;
			price: number;
			discount: number;
			doctorId?: string | null | undefined;
		}> = [];

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
				const [createdItem] = await tx
					.insert(treatmentPlanItemsNew)
					.values({
						organizationId,
						planId: newPlan.id,
						stageId: createdStage?.id ?? null,
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
			const uuidCandidates = allItemsFlat
				.map((i) => i.priceId)
				.filter((id) => UUID_SHAPE.test(id));
			const codeCandidates = allItemsFlat
				.map((i) => i.priceId)
				.filter((id) => !UUID_SHAPE.test(id) && id && id.length > 0);
			const titleCandidates = allItemsFlat
				.map((i) => i.name?.trim())
				.filter((t): t is string => Boolean(t && t.length > 0));

			const orConditions: SQL<unknown>[] = [];
			if (uuidCandidates.length > 0) {
				orConditions.push(inArray(serviceCatalogItems.id, uuidCandidates));
			}
			if (codeCandidates.length > 0) {
				orConditions.push(inArray(serviceCatalogItems.code, codeCandidates));
				orConditions.push(inArray(serviceCatalogItems.order804nCode, codeCandidates));
			}
			if (titleCandidates.length > 0) {
				orConditions.push(inArray(serviceCatalogItems.title, titleCandidates));
			}

			const matchedServices = orConditions.length > 0
				? await tx
						.select({
							id: serviceCatalogItems.id,
							code: serviceCatalogItems.code,
							order804nCode: serviceCatalogItems.order804nCode,
							title: serviceCatalogItems.title,
						})
						.from(serviceCatalogItems)
						.where(
							and(
								eq(serviceCatalogItems.organizationId, organizationId),
								or(...orConditions),
							),
						)
				: [];

			const serviceLookup = new Map<string, string>();
			for (const svc of matchedServices) {
				serviceLookup.set(svc.id.toLowerCase(), svc.id);
				if (svc.code) serviceLookup.set(svc.code.toLowerCase(), svc.id);
				if (svc.order804nCode) serviceLookup.set(svc.order804nCode.toLowerCase(), svc.id);
				if (svc.title) serviceLookup.set(svc.title.toLowerCase().trim(), svc.id);
			}

			let slot = 0;
			const ledgerValues = allItemsFlat.map((item) => {
				const id = ledgerRowId(newPlan.id, slot);
				slot += 1;
				const unitPriceRub = Number(item.price.toFixed(2));
				const lineTotalRub = Number(Math.max(0, item.price * item.quantity - item.discount).toFixed(2));
				const discountRub = Number(item.discount.toFixed(2));
				const resolvedServiceId =
					serviceLookup.get(item.priceId?.toLowerCase()) ||
					(item.name ? serviceLookup.get(item.name.trim().toLowerCase()) : null) ||
					(UUID_SHAPE.test(item.priceId) ? item.priceId : null);

				return {
					id,
					organizationId,
					patientId: data.patientId,
					visitId: null,
					serviceId: resolvedServiceId,
					toothCode: item.toothNumber ? String(item.toothNumber) : null,
					title: item.name?.trim() || item.priceId,
					quantity: String(item.quantity),
					priceRub: lineTotalRub,
					unitPriceRub,
					discountRub,
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
