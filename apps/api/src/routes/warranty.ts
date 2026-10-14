import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
	organizations,
	patientRecalls,
	warrantyCertificates,
} from "../db/schema.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { getRequestIdentity } from "../security/identity.js";
import { wsBroker } from "../services/websocketBroker.js";

const createCertificateBodySchema = z.object({
	patientId: z.string().uuid("Некорректный ID пациента"),
	visitId: z.string().uuid().optional().nullable(),
	certificateNumber: z.string().trim().min(3).max(64),
	status: z.enum(["active", "conditional", "voided"]).default("active"),
	items: z.array(z.record(z.unknown())).min(1, "Требуется хотя бы одна позиция в паспорте"),
	warrantyMonths: z.number().int().positive("Срок гарантии должен быть положительным"),
	serviceLifeMonths: z.number().int().positive("Срок службы должен быть положительным"),
	issuedAt: z.string().optional().nullable(),
	expiresAt: z.string().optional().nullable(),
	nextRecallDate: z.string().optional().nullable(),
	integritySha256: z.string().trim().min(16, "Некорректный хеш целостности"),
	notes: z.string().trim().max(2000).optional().nullable(),
});

export const registerWarrantyRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
	/**
	 * POST /api/warranty/certificates
	 * Сохранение гарантийного паспорта / сертификата стоматологического лечения.
	 * Автоматически создает запись в системе повторных вызовов (patient_recalls) на плановый осмотр через 6 месяцев.
	 */
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
			: new Date(issuedAtDate.getTime() + 180 * 24 * 60 * 60 * 1000); // +6 месяцев (180 дней)

		// 1. Сохраняем гарантийный паспорт в честную таблицу warranty_certificates
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

		// 2. СВЯЗКА С РЕКОЛЛАМИ (#recalls, Мандат 8k):
		// Фиксируем плановый профосмотр по гарантии через 6 месяцев
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

	/**
	 * GET /api/warranty/certificates/:patientId
	 * Получение всех гарантийных паспортов пациента
	 */
	app.get<{ Params: { patientId: string } }>(
		"/api/warranty/certificates/:patientId",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"warranty certificates read",
			);
			if (!context) return;

			const patientId = request.params.patientId;
			if (!patientId) {
				return reply.code(400).send({
					error: "MissingPatientId",
					message: "Укажите ID пациента",
				});
			}

			const list = await db
				.select()
				.from(warrantyCertificates)
				.where(
					and(
						eq(warrantyCertificates.organizationId, context.organizationId),
						eq(warrantyCertificates.patientId, patientId),
					),
				)
				.orderBy(desc(warrantyCertificates.issuedAt));

			return reply.send({
				success: true,
				certificates: list,
			});
		},
	);

	/**
	 * GET /api/public/warranty/:certificateNumber
	 * Публичная верификация гарантийного паспорта по QR-коду без авторизации и без раскрытия персданных (152-ФЗ)
	 * Возвращает: статус гарантии, клинику, срок гарантии, перечень работ и дату следующего чекапа.
	 */
	app.get<{ Params: { certificateNumber: string } }>(
		"/api/public/warranty/:certificateNumber",
		async (request, reply) => {
			const certNum = request.params.certificateNumber?.trim();
			if (!certNum) {
				return reply.code(400).send({
					error: "MissingCertificateNumber",
					message: "Укажите номер гарантийного сертификата",
				});
			}

			const [cert] = await db
				.select()
				.from(warrantyCertificates)
				.where(eq(warrantyCertificates.certificateNumber, certNum))
				.limit(1);

			if (!cert) {
				return reply.code(404).send({
					error: "CertificateNotFound",
					message: `Гарантийный паспорт ${certNum} не найден в реестре клиники. Проверьте правильность введенного номера или отсканируйте актуальный QR-код.`,
				});
			}

			// Получаем публичные реквизиты клиники (без раскрытия персданных пациента)
			const [clinicOrg] = await db
				.select({
					name: organizations.name,
					legalAddress: organizations.legalAddress,
					medicalLicenseNumber: organizations.medicalLicenseNumber,
					email: organizations.email,
					website: organizations.website,
				})
				.from(organizations)
				.where(eq(organizations.id, cert.organizationId))
				.limit(1);

			return reply.code(200).send({
				success: true,
				certificate: {
					certificateNumber: cert.certificateNumber,
					status: cert.status, // "active" | "conditional" | "voided"
					clinicName: clinicOrg?.name || "Стоматологическая клиника ДЕНТЕ",
					clinicLegalName: clinicOrg?.name || "ООО «Стоматологическая клиника ДЕНТЕ»",
					clinicPhone: "",
					clinicAddress: clinicOrg?.legalAddress || "",
					clinicWebsite: clinicOrg?.website || "",
					clinicLicenseNumber: clinicOrg?.medicalLicenseNumber || "",
					warrantyMonths: cert.warrantyMonths,
					serviceLifeMonths: cert.serviceLifeMonths,
					issuedAt: cert.issuedAt,
					expiresAt: cert.expiresAt,
					nextRecallDate: cert.nextRecallDate,
					items: cert.itemsJson,
					integritySha256: cert.integritySha256,
					notes: cert.notes,
				},
			});
		},
	);
};

export default registerWarrantyRoutes;
