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

		// Find treatment plan items in Phase 2 (Surgery) that are completed,
		// but Phase 3 (Prosthetics) hasn't started yet.
		// For Osteointegration, we need to check items where phase = 2.
		// A better robust check would use the actual completion date of the item, 
		// but for MVP we use updatedAt.

		const readyForCrown = await db
			.select({
				patientId: treatmentPlans.patientId,
				planName: treatmentPlans.name,
				planId: treatmentPlans.id,
				toothNumber: treatmentPlanItemsNew.toothNumber,
				itemDate: treatmentPlans.updatedAt,
			})
			.from(treatmentPlanItemsNew)
			.innerJoin(
				treatmentPlans,
				eq(treatmentPlans.id, treatmentPlanItemsNew.planId),
			)
			.where(
				and(
					eq(treatmentPlanItemsNew.phase, 2) // Surgery phase
				)
			)
			.limit(100);

		for (const item of readyForCrown) {
			if (!item.toothNumber) continue;

			// Jaw determination (FDI):
			// Upper jaw: 11-18, 21-28
			// Lower jaw: 31-38, 41-48
			const isUpperJaw = item.toothNumber < 30;
			// 6 months for upper jaw, 3 months for lower jaw
			const healingMonths = isUpperJaw ? 6 : 3;

			const healingDate = new Date(item.itemDate);
			healingDate.setMonth(healingDate.getMonth() + healingMonths);

			if (new Date() >= healingDate) {
				// Trigger Recall
				await RecallScheduler.triggerRecall(
					item.patientId,
					item.toothNumber,
					item.planName,
				);
			}
		}
	}

	private static async triggerRecall(
		patientId: string,
		toothNumber: number,
		planName: string,
	) {
		// 1. Fetch patient
		const patientRecord = await db
			.select()
			.from(patients)
			.where(eq(patients.id, patientId))
			.limit(1);
		const patient = patientRecord[0];
		if (!patient) return;

		const message = `Уважаемый(ая) ${patient.fullName}! Период приживляемости имплантата на зубе ${toothNumber} завершен. Пора продолжить лечение по плану "${planName}"!`;

		console.log(
			`[RecallScheduler] Triggering recall for ${patientId}: ${message}`,
		);

		// 3. Instead of only a fake Telegram message, we create a CRM Task for the admins!
		try {
			await db.insert(communicationTasks).values({
				id: randomUUID(),
				organizationId: patient.organizationId,
				patientId: patientId,
				assignedRole: "admin",
				channel: "whatsapp",
				intent: "recall",
				status: "queued",
				priority: "high",
				dueAt: new Date(Date.now() + 86400000), // due in 1 day
				title: `Пригласить пациента на 3-й этап (зуб ${toothNumber})`,
				body: `Пациент: ${patient.fullName}. Прошло необходимое время приживления. План: ${planName}.`,
			});
			console.log(`[RecallScheduler] Task created for admin to recall ${patient.fullName}`);
		} catch (e) {
			console.error("[RecallScheduler] Failed to create CRM task", e);
		}
	}
}
