import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	patients,
	communicationTasks,
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../db/schema.js";
import { randomUUID } from "node:crypto";

export class RecallScheduler {
	/**
	 * Run this periodically (e.g., via node-cron or setInterval)
	 * Scans for completed surgical phases and triggers recall if the waiting period is over.
	 */
	static async processOsteointegrationRecalls() {
		console.log("[RecallScheduler] Scanning for osteointegration recalls...");

		try {
			const readyForCrown = await db
				.select({
					patientId: treatmentPlans.patientId,
					planName: treatmentPlans.name,
					planId: treatmentPlans.id,
					toothNumber: treatmentPlanItemsNew.toothNumber,
					itemDate: treatmentPlans.updatedAt,
					patientFullName: patients.fullName,
					organizationId: patients.organizationId,
				})
				.from(treatmentPlanItemsNew)
				.innerJoin(
					treatmentPlans,
					eq(treatmentPlans.id, treatmentPlanItemsNew.planId),
				)
				.innerJoin(
					patients,
					eq(patients.id, treatmentPlans.patientId),
				)
				.where(
					and(
						eq(treatmentPlanItemsNew.phase, 2) // Surgery phase
					),
				);

			const tasksToInsert = [];
			const now = new Date();

			for (const item of readyForCrown) {
				if (!item.toothNumber) continue;
				const isUpperJaw = item.toothNumber < 30;
				const healingMonths = isUpperJaw ? 6 : 3;

				const healingDate = new Date(item.itemDate);
				healingDate.setMonth(healingDate.getMonth() + healingMonths);

				if (now >= healingDate) {
					tasksToInsert.push({
						id: randomUUID(),
						organizationId: item.organizationId,
						patientId: item.patientId,
						assignedRole: "admin",
						channel: "whatsapp",
						intent: "recall",
						status: "queued",
						priority: "high",
						dueAt: new Date(Date.now() + 86400000),
						title: `Пригласить пациента на 3-й этап (зуб ${item.toothNumber})`,
						body: `Пациент: ${item.patientFullName}. Прошло необходимое время приживления. План: ${item.planName}.`,
					});
				}
			}

			if (tasksToInsert.length > 0) {
				await db.insert(communicationTasks).values(tasksToInsert);
				console.log(`[RecallScheduler] Created ${tasksToInsert.length} recall tasks for admin.`);
			}
		} catch (e: any) {
			console.warn("[RecallScheduler notice]:", e?.message || e);
		}
	}
}
