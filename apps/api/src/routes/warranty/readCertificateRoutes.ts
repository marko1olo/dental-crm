import type { FastifyInstance } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { organizations, warrantyCertificates } from "../../db/schema.js";
import { requireClinicalReadContext } from "../../accessGuard.js";

export function registerReadCertificateRoutes(app: FastifyInstance) {
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
					status: cert.status,
					clinicName: clinicOrg?.name || "Стоматологическая клиники ДЕНТЕ",
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
}
