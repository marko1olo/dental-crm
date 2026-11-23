import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	implantIsqMeasurements,
	organizations,
	patientImplantInstallations,
	patients,
	users,
	warrantyCertificates,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

const paramsSchema = z.object({
	installationId: z.string().uuid(),
});

export function registerPassportRoute(app: FastifyInstance) {
	const handlePassport = async (request: FastifyRequest<{ Params: { installationId: string } }>, reply: FastifyReply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const identity = getRequestIdentity(request);
		const staffRole = identity.role ?? request.user?.role ?? null;
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.implants.read",
				role: staffRole,
				message: `Отказ в доступе к паспорту имплантата (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
			});
		}

		const parsedParams = paramsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный идентификатор установки имплантата (ожидается UUID).",
				details: parsedParams.error.format(),
			});
		}

		const { installationId } = parsedParams.data;
		const [installation] = await db
			.select()
			.from(patientImplantInstallations)
			.where(and(eq(patientImplantInstallations.id, installationId), eq(patientImplantInstallations.organizationId, orgId)))
			.limit(1);

		if (!installation) {
			return reply.code(404).send({ error: "ImplantInstallationNotFound", message: "Паспорт имплантата не найден." });
		}

		const [patient] = await db
			.select()
			.from(patients)
			.where(and(eq(patients.id, installation.patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		let doctorName = "Хирург-имплантолог";
		if (installation.surgeonDoctorId) {
			const [doc] = await db
				.select()
				.from(users)
				.where(and(eq(users.id, installation.surgeonDoctorId), eq(users.organizationId, orgId)))
				.limit(1);
			if (doc) doctorName = doc.fullName;
		}

		const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
		const isqHistory = await db
			.select()
			.from(implantIsqMeasurements)
			.where(and(eq(implantIsqMeasurements.installationId, installationId), eq(implantIsqMeasurements.organizationId, orgId)))
			.orderBy(implantIsqMeasurements.daysPostOp);

		await auditMedicalAccessFromRequest(request, {
			organizationId: orgId,
			patientId: installation.patientId,
			action: "VIEW_IMPLANT_PASSPORT",
			diagnosis: "Имплантологический паспорт",
		});

		let parsedNotes: Record<string, unknown> = {};
		try {
			if (installation.notes && installation.notes.startsWith("{")) {
				parsedNotes = JSON.parse(installation.notes);
			}
		} catch {
			// fallback для обратной совместимости со старыми записями
		}

		const rawFinancials = (installation.financialsJsonb as Record<string, unknown> | null) ?? null;
		const financialsObj =
			rawFinancials && "financials" in rawFinancials
				? rawFinancials.financials
				: (rawFinancials ?? parsedNotes.financials ?? null);
		const deductedMaterials =
			rawFinancials && "deductedMaterials" in rawFinancials && Array.isArray(rawFinancials.deductedMaterials)
				? rawFinancials.deductedMaterials
				: (Array.isArray(parsedNotes.deductedMaterials) ? parsedNotes.deductedMaterials : []);

		const canonicalPassportId = `IMP-PASSPORT-${installation.toothNumberFdi}-${installation.id.slice(0, 8).toUpperCase()}`;
		const baseSite = org?.website?.trim().replace(/\/$/, "") || "https://dente.clinic";
		const qrVerificationUrl = `${baseSite}/#/portal/warranty?cert=${canonicalPassportId}`;

		// Сквозная регистрация в гарантийном реестре клиники без 404 (СтАР / Закон РФ № 2300-1)
		const expDate = new Date(installation.installedAt.getTime());
		expDate.setFullYear(expDate.getFullYear() + 10);
		const recallDate = new Date(installation.installedAt.getTime() + 180 * 24 * 60 * 60 * 1000);
		const integritySha256 = createHash("sha256")
			.update(
				JSON.stringify({
					orgId,
					patientId: installation.patientId,
					canonicalPassportId,
					brand: installation.implantBrand,
					lot: installation.lotNumber,
					sn: installation.serialNumber,
					installedAt: installation.installedAt,
				}),
			)
			.digest("hex");

		const implantItemsPayload = [
			{
				toothNumber: String(installation.toothNumberFdi),
				clinicalWorkTitle: `Дентальный имплантат ${installation.implantBrand} Ø${installation.implantDiameterMm}×${installation.implantLengthMm} мм`,
				materialName: "Медицинский титан Grade 4 / Roxolid",
				manufacturer: installation.implantBrand,
				vitaShade: "—",
				lotNumber: installation.lotNumber || "б/н",
				serviceCode804n: "A16.07.054",
			},
		];

		await db
			.insert(warrantyCertificates)
			.values({
				organizationId: orgId,
				patientId: installation.patientId,
				visitId: installation.visitId || null,
				certificateNumber: canonicalPassportId,
				status: "active",
				itemsJson: implantItemsPayload,
				warrantyMonths: 120,
				serviceLifeMonths: 240,
				issuedAt: installation.installedAt,
				expiresAt: expDate,
				nextRecallDate: recallDate,
				integritySha256,
				notes: `Гарантийный паспорт имплантата ${canonicalPassportId} (${installation.implantBrand} #${installation.toothNumberFdi}).`,
				createdAt: new Date(),
				updatedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: warrantyCertificates.certificateNumber,
				set: {
					status: "active",
					itemsJson: implantItemsPayload,
					warrantyMonths: 120,
					serviceLifeMonths: 240,
					expiresAt: expDate,
					nextRecallDate: recallDate,
					integritySha256,
					updatedAt: new Date(),
				},
			});

		const passportData = {
			passportId: canonicalPassportId,
			installationId: installation.id,
			toothFdi: installation.toothNumberFdi,
			installedAt: installation.installedAt,
			implantBrand: installation.implantBrand,
			connectionType: installation.connectionType ?? parsedNotes.connectionType ?? "internal_hex",
			diameterMm: Number(installation.implantDiameterMm),
			lengthMm: Number(installation.implantLengthMm),
			lotNumber: installation.lotNumber,
			serialNumber: installation.serialNumber,
			catalogArticle: installation.catalogArticle ?? parsedNotes.sku ?? null,
			sku: installation.catalogArticle ?? parsedNotes.sku ?? null,
			expirationDate: installation.expirationDate ?? parsedNotes.expirationDate ?? null,
			boneDensityClass: installation.boneDensityClass,
			torqueNcm: Number(installation.finalInsertionTorqueNcm),
			baselineIsq: installation.baselineIsq,
			protocol: installation.initialProtocol,
			graftMaterial: installation.boneGraftMaterial,
			membraneUsed: installation.membraneUsed,
			isGuidedSurgery: installation.isGuidedSurgery,
			guidedSleeveDiameterMm: installation.guidedSleeveDiameterMm ? Number(installation.guidedSleeveDiameterMm) : null,
			guidedSleeveOffsetMm: installation.guidedSleeveOffsetMm ? Number(installation.guidedSleeveOffsetMm) : null,
			surgicalGuideTemplateId: installation.surgicalGuideTemplateId ?? null,
			clinicName: org?.name ?? "Стоматологическая клиника DENTE",
			patientName: patient?.fullName ?? "Пациент",
			patientCardNumber: patient?.id?.slice(0, 8) ?? "CARD-01",
			doctorName,
			qrVerificationUrl,
			isqHistory,
			financials: financialsObj,
			deductedMaterials,
			notes:
				installation.notes && !installation.notes.startsWith("{")
					? installation.notes
					: ((parsedNotes.userNotes as string | undefined) ?? null),
		};

		return reply.send({ success: true, passport: passportData });
	};

	app.get("/api/clinical/implants/:installationId/passport", handlePassport);
}
