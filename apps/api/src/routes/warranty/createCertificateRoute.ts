import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { patientRecalls, warrantyCertificates } from "../../db/schema.js";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { createCertificateBodySchema } from "./types.js";

export function registerCreateCertificateRoute(app: FastifyInstance) {
	app.post("/api/warranty/certificates", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"warranty certificates creation",
		);
		if (!context) return;

		const parsed = createCertificateBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные гарантийного паспорта.",
				issues: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const issuedAtDate = data.issuedAt ? new Date(data.issuedAt) : new Date();
		const expiresAtDate = data.expiresAt
			? new Date(data.expiresAt)
			: new Date(issuedAtDate.getTime() + data.warrantyMonths * 30 * 24 * 60 * 60 * 1000);
		const nextRecallDate = data.nextRecallDate
			? new Date(data.nextRecallDate)
			: new Date(issuedAtDate.getTime() + 180 * 24 * 60 * 60 * 1000);

		const [createdCert] = await db
			.insert(warrantyCertificates)
			.values({
				organizationId: context.organizationId,
				patientId: data.patientId,
				visitId: data.visitId || null,
				certificateNumber: data.certificateNumber,
				status: data.status,
				itemsJson: data.items,
				warrantyMonths: data.warrantyMonths,
				serviceLifeMonths: data.serviceLifeMonths,
				issuedAt: issuedAtDate,
				expiresAt: expiresAtDate,
				nextRecallDate,
				integritySha256: data.integritySha256,
				notes: data.notes || null,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: warrantyCertificates.certificateNumber,
				set: {
					status: data.status,
					itemsJson: data.items,
					warrantyMonths: data.warrantyMonths,
					serviceLifeMonths: data.serviceLifeMonths,
					expiresAt: expiresAtDate,
					nextRecallDate,
					integritySha256: data.integritySha256,
					notes: data.notes || null,
					updatedAt: new Date(),
				},
			})
			.returning();

		const identity = getRequestIdentity(request);
		let createdRecall: typeof patientRecalls.$inferSelect | null = null;
		try {
			const [rec] = await db
				.insert(patientRecalls)
				.values({
					organizationId: context.organizationId,
					patientId: data.patientId,
					doctorId: identity.userId || null,
					reason: `Контрольный осмотр по гарантийному паспорту ${data.certificateNumber}`,
					cohortType: "orthopedic_warranty",
					status: "pending",
					dueDate: nextRecallDate,
					notes: `Автоматически запланирован при выдаче гарантийного паспорта ${data.certificateNumber}`,
					createdAt: new Date(),
					updatedAt: new Date(),
				})
				.returning();
			if (rec) {
				createdRecall = rec;
				wsBroker.broadcastToOrganization(context.organizationId, {
					type: "PATIENT_RECALL_UPDATED",
					payload: {
						recallId: rec.id,
						patientId: data.patientId,
						status: "pending",
						dueDate: nextRecallDate.toISOString(),
						updatedAt: new Date().toISOString(),
					},
				});
			}
		} catch (recallErr) {
			request.log.warn({ err: recallErr }, "Non-blocking: Failed to auto-schedule warranty recall");
		}

		return reply.code(201).send({
			success: true,
			certificate: createdCert,
			recall: createdRecall,
		});
	});
}
