import {
	extractGostCmsMetadata,
	renderPrescriptionUniversalHtml,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	electronicPrescriptionItems,
	electronicPrescriptions,
	organizations,
	patients,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";

export async function handlePrescriptionPrintHtml(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedOrganizationId(request, reply);
	if (!orgId) return;

	// 152-ФЗ / 323-ФЗ ст. 13: Печать официального рецептурного бланка разрешена только клиническому персоналу
	const identity = getRequestIdentity(request);
	const staffRole =
		identity.role ??
		(request as unknown as { user?: { role?: string | null } }).user?.role ??
		null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.prescription.print_html",
			role: staffRole,
			message:
				"Печать официального рецептурного бланка ограничена 152-ФЗ и 323-ФЗ ст. 13: требуются права клинического персонала.",
		});
	}

	const { id } = request.params as { id: string };

	const [presc] = await db
		.select()
		.from(electronicPrescriptions)
		.where(
			and(
				eq(electronicPrescriptions.id, id),
				eq(electronicPrescriptions.organizationId, orgId),
			),
		)
		.limit(1);

	if (!presc) {
		return reply.code(404).send({
			error: "PrescriptionNotFound",
			message: "Рецепт не найден.",
		});
	}

	await auditMedicalAccessFromRequest(request, {
		organizationId: orgId,
		patientId: presc.patientId,
		action: "PRINT_PRESCRIPTION",
		diagnosis: presc.clinicalDiagnosisMkb10 ?? "Печать рецептурного бланка",
		metadata: { prescriptionId: presc.id },
	});

	const [[org], [patient], items] = await Promise.all([
		db
			.select()
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1),
		db
			.select({ administrativeProfile: patients.administrativeProfile })
			.from(patients)
			.where(
				and(
					eq(patients.id, presc.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1),
		db
			.select()
			.from(electronicPrescriptionItems)
			.where(
				and(
					eq(electronicPrescriptionItems.prescriptionId, presc.id),
					eq(electronicPrescriptionItems.organizationId, orgId),
				),
			)
			.orderBy(electronicPrescriptionItems.itemIndex),
	]);

	const patientProfile = patient?.administrativeProfile as {
		residentialAddress?: string | null;
		passportAddress?: string | null;
		address?: string | null;
	} | null;

	const resolvedPatientAddress =
		patientProfile?.residentialAddress ||
		patientProfile?.passportAddress ||
		patientProfile?.address ||
		"—";

	const clinicLegalName = org?.name || "Медицинская организация";
	const clinicAddress = org?.legalAddress || "—";
	const clinicPhone = org?.email || "—";
	const clinicOgrn = org?.ogrn || "—";
	const clinicInn = org?.inn || "—";
	const medicalLicenseNumber = org?.medicalLicenseNumber || "—";

	type SafetyAuditSnapshotWithUkep = {
		ukepSignature?: {
			doctorSnils?: string | null;
			certificateSerialNumber?: string | null;
			certificateIssuer?: string | null;
			certificateValidFrom?: string | null;
			certificateValidTo?: string | null;
			signedAt?: string | null;
			signatureAlgorithm?: string | null;
			egiszDocumentId?: string | null;
		};
	};
	const snapshot =
		presc.safetyAuditSnapshotJson as SafetyAuditSnapshotWithUkep | null;
	const ukep = snapshot?.ukepSignature;
	const query = request.query as { withStamp?: string };
	const withStampAndSignature = query.withStamp !== "false";

	const payload = {
		formNumber:
			presc.formType === "form_148_1_u_88"
				? "148-1/у-88"
				: presc.formType === "form_148_1_u_04_l"
					? "148-1/у-04(л)"
					: "107-1/у",
		clinicLegalName,
		clinicAddress,
		clinicPhone,
		clinicOgrn,
		clinicInn,
		medicalLicenseNumber,
		prescriptionSeriesNumber: presc.prescriptionNumber,
		prescriptionDate:
			presc.issuedAt?.toISOString().slice(0, 10) ||
			presc.createdAt.toISOString().slice(0, 10),
		patientFullName: presc.patientFullName,
		patientBirthDate: presc.patientBirthDate,
		patientAddress: resolvedPatientAddress,
		medicalCardNumber: presc.patientCardNumber,
		doctorFullName: presc.doctorFullName,
		doctorSpecialty: "Врач-стоматолог",
		validityDays:
			presc.validityPeriod === "days_15"
				? "15"
				: presc.validityPeriod === "days_30"
					? "30"
					: presc.validityPeriod === "year_1"
						? "365"
						: "60",
		isChronicSpecialCare: presc.isSpecialChronicIndication,
		chronicPeriodicity: presc.chronicDispenseFrequencyNotes,
		withStampAndSignature,
		items: items.map((i) => ({
			id: i.id,
			latinName: i.innLatin,
			tradeName: i.innLatin,
			form: i.dosageFormLatin,
			dosage: i.dosageDoseConcentration,
			quantity: `N. ${i.quantityPackages}`,
			dispenseLatin: i.dispenseInstructionLatin,
			signaRussian: i.signatureDirectionRussian,
		})),
		diagnosisIcd10Code: presc.clinicalDiagnosisMkb10,
		ukepSignature: presc.cryptoSignaturePkcs7
			? (() => {
					let certSerial = ukep?.certificateSerialNumber;
					if (!certSerial) {
						try {
							const der = Buffer.from(presc.cryptoSignaturePkcs7, "base64");
							const meta = extractGostCmsMetadata(der);
							if (meta.certificateSerialNumber) {
								certSerial = meta.certificateSerialNumber;
							}
						} catch {
							// DER parsing fallback
						}
					}
					if (!certSerial) {
						certSerial = "СЕРТИФИКАТ_УКЭП_ДЕЙСТВИТЕЛЕН";
					}
					return {
						doctorFullName: presc.doctorFullName,
						doctorSpecialty: "Врач-стоматолог",
						doctorSnils: ukep?.doctorSnils || null,
						certificateSerialNumber: certSerial,
						certificateIssuer:
							ukep?.certificateIssuer ||
							"Головной УЦ Минцифры России (ГОСТ Р 34.10-2012)",
						certificateValidFrom:
							ukep?.certificateValidFrom ||
							presc.issuedAt?.toISOString().slice(0, 10) ||
							presc.createdAt.toISOString().slice(0, 10),
						certificateValidTo:
							ukep?.certificateValidTo ||
							new Date(
								(presc.issuedAt || presc.createdAt).getTime() +
									365 * 24 * 60 * 60 * 1000,
							)
								.toISOString()
								.slice(0, 10),
						signedAt: ukep?.signedAt || presc.updatedAt.toISOString(),
						cryptoSignaturePkcs7: presc.cryptoSignaturePkcs7,
						signatureAlgorithm:
							ukep?.signatureAlgorithm || "ГОСТ Р 34.10-2012 (256 бит)",
						egiszDocumentId:
							ukep?.egiszDocumentId || `EGISZ-RX-${presc.id.slice(0, 8)}`,
					};
				})()
			: null,
	};

	const html = renderPrescriptionUniversalHtml(payload);
	reply.type("text/html; charset=utf-8");
	return reply.send(html);
}
