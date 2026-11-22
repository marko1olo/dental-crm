import type { FastifyInstance } from "fastify";
import { generateUuidV7 } from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
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

		const identity = getRequestIdentity(request);

		const normalizedItems = data.items.map((it) => {
			const title = it.clinicalWorkTitle || it.name || it.restorationType || "Стоматологическая работа";
			const tooth = it.toothNumber !== undefined ? String(it.toothNumber) : (it.tooth !== undefined ? String(it.tooth) : "—");
			const mat = it.material || it.materialName || "Конструкционный материал";
			const shade = it.color || it.shade || it.vitaShade || "По прейскуранту";
			const lot = it.lot || it.lotNumber || it.batchCode || data.certificateNumber;
			return {
				id: it.id || generateUuidV7(),
				name: title,
				clinicalWorkTitle: title,
				category: it.category || "orthopedics",
				tooth,
				toothNumber: tooth,
				surface: it.surface,
				material: mat,
				materialName: mat,
				color: shade,
				shade,
				vitaShade: shade,
				shadeStump: it.shadeStump ?? null,
				lot,
				lotNumber: lot,
				batchCode: lot,
				restorationType: it.restorationType || title,
				laboratoryName: it.laboratoryName || "Цифровая зуботехническая лаборатория CAD/CAM",
				cementationProtocol: it.cementationProtocol || "Адгезивный протокол двойного отверждения (композитный цемент)",
				warrantyMonths: it.warrantyMonths ?? data.warrantyMonths,
				serviceLifeMonths: it.serviceLifeMonths ?? data.serviceLifeMonths,
				notes: it.notes,
			};
		});

		const { createdCert, createdRecall } = await withTenantCtx(context.organizationId, async (tx) => {
			const [cert] = await tx
				.insert(warrantyCertificates)
				.values({
					organizationId: context.organizationId,
					patientId: data.patientId,
					visitId: data.visitId || null,
					certificateNumber: data.certificateNumber,
					status: data.status,
					itemsJson: normalizedItems,
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
						itemsJson: normalizedItems,
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

			const [rec] = await tx
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

			return { createdCert: cert, createdRecall: rec ?? null };
		});

		if (createdRecall) {
			wsBroker.broadcastToOrganization(context.organizationId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					recallId: createdRecall.id,
					patientId: data.patientId,
					status: "pending",
					dueDate: nextRecallDate.toISOString(),
					updatedAt: new Date().toISOString(),
				},
			});
		}

		return reply.code(201).send({
			success: true,
			data: {
				certificate: createdCert,
				recall: createdRecall,
			},
			certificate: createdCert,
			recall: createdRecall,
		});
	});
}
