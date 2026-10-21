import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { treatmentPlanItemsNew, treatmentPlanStages, type treatmentPlans } from "../../../db/schema.js";
import type { createTreatmentPlanSchema } from "./schemas.js";
import type { z } from "zod";

type CreateInput = z.infer<typeof createTreatmentPlanSchema>;

export async function insertPlanStagesAndItems(
	tx: any,
	organizationId: string,
	newPlan: typeof treatmentPlans.$inferSelect,
	patientFullName: string,
	stages: CreateInput["stages"],
	defaultDoctorId?: string | null,
) {
	const createdStages: Array<typeof treatmentPlanStages.$inferSelect> = [];
	const createdItems: Array<typeof treatmentPlanItemsNew.$inferSelect> = [];

	for (const st of stages) {
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
					doctorId: item.doctorId || defaultDoctorId || null,
				})
				.returning();

			if (createdItem) createdItems.push(createdItem);
		}
	}

	return { createdStages, createdItems };
}
