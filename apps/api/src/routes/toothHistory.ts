import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	patients,
	toothStates,
	treatmentPlanItemsNew,
	treatmentPlans,
	visitDiaries,
} from "../db/schema.js";

export default async function registerToothHistoryRoutes(app: FastifyInstance) {
	app.get(
		"/api/odontogram/tooth-history/:patientId/:toothId",
		async (req, reply) => {
			const orgId = await requireResolvedOrganizationId(
				req,
				reply,
				"read tooth history",
			);
			if (!orgId) return;

			const { patientId, toothId } = req.params as {
				patientId: string;
				toothId: string;
			};
			const toothNum = parseInt(toothId, 10);

			if (isNaN(toothNum))
				return reply.code(400).send({ error: "Invalid tooth ID" });

			const [patient] = await db
				.select()
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				);
			if (!patient) return reply.code(404).send({ error: "PatientNotFound" });

			const events: any[] = [];

			const diaries = await db
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.patientId, patientId),
						eq(visitDiaries.diagnosisTooth, toothId),
						eq(visitDiaries.organizationId, orgId),
					),
				);
			diaries.forEach((d) => {
				events.push({
					type: "diary",
					date: d.createdAt,
					description: d.treatmentDescription || d.anamnesis,
					authorId:
						d.lockedByUserId || d.coSignedByUserId || d.doctorId || "System",
				});
			});

			const planItems = await db
				.select({
					createdAt: treatmentPlans.createdAt,
					name: treatmentPlans.name,
					priceId: treatmentPlanItemsNew.priceId,
					phase: treatmentPlanItemsNew.phase,
				})
				.from(treatmentPlanItemsNew)
				.innerJoin(
					treatmentPlans,
					eq(treatmentPlans.id, treatmentPlanItemsNew.planId),
				)
				.where(
					and(
						eq(treatmentPlans.patientId, patientId),
						eq(treatmentPlanItemsNew.toothNumber, toothNum),
					),
				);

			planItems.forEach((p) => {
				events.push({
					type: "plan",
					date: p.createdAt,
					description: `План: ${p.name} - ${p.priceId} (Этап ${p.phase})`,
					authorId: "System",
				});
			});

			const states = await db
				.select()
				.from(toothStates)
				.where(
					and(
						eq(toothStates.patientId, patientId),
						eq(toothStates.toothNumber, toothNum),
					),
				)
				.orderBy(desc(toothStates.updatedAt));
			states.forEach((s) => {
				events.push({
					type: "state_change",
					date: s.updatedAt,
					description: `Статус изменен на: ${s.state}`,
					authorId: "System",
				});
			});

			events.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
			);

			return reply.send({ events });
		},
	);
}
