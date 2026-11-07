import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { generatedDocuments, patientConsents, patients } from "../../db/schema.js";
import type { SaveConsentBody } from "./types.js";

type DocumentKindEnum = typeof generatedDocuments.kind.enumValues[number];

function mapConsentKindToDocumentKind(kind: string): DocumentKindEnum {
	switch (kind) {
		case "informed_consent":
		case "intake":
			return "informed_consent";
		case "procedure_specific_consent_packet":
		case "general_treatment":
		case "therapy":
		case "surgery":
		case "implant":
		case "implantology":
		case "orthodontics":
		case "pediatric":
		case "radiation_xray":
		case "extraction":
		case "sinus_lift":
		case "whitening":
		case "hygiene":
		case "perio":
		case "endodontics":
		case "orthopedics":
			return "procedure_specific_consent_packet";
		case "anesthesia_consent_log":
		case "anesthesia":
		case "sedation":
			return "anesthesia_consent_log";
		case "personal_data_processing_consent":
			return "personal_data_processing_consent";
		case "minor_legal_representative_consent":
			return "minor_legal_representative_consent";
		case "photo_video_consent":
			return "photo_video_consent";
		case "medical_intervention_refusal":
		case "refusal":
			return "medical_intervention_refusal";
		default:
			return "informed_consent";
	}
}

export async function fetchPatientConsentsList(orgId: string, patientId: string) {
	const consents = await db
		.select({
			id: patientConsents.id,
			organizationId: patientConsents.organizationId,
			patientId: patientConsents.patientId,
			kind: patientConsents.kind,
			grantedAt: patientConsents.grantedAt,
			revokedAt: patientConsents.revokedAt,
			documentId: patientConsents.documentId,
			documentTitle: generatedDocuments.title,
			documentStatus: generatedDocuments.status,
			signatureSvg: generatedDocuments.signatureSvg,
			integrityHash: generatedDocuments.issuedSnapshotSha256,
		})
		.from(patientConsents)
		.leftJoin(
			generatedDocuments,
			and(
				eq(patientConsents.documentId, generatedDocuments.id),
				eq(generatedDocuments.organizationId, orgId),
			),
		)
		.where(
			and(
				eq(patientConsents.organizationId, orgId),
				eq(patientConsents.patientId, patientId),
			),
		)
		.orderBy(desc(patientConsents.grantedAt));

	return consents;
}

export async function recordPatientConsentEntry(
	orgId: string,
	patientId: string,
	body: SaveConsentBody,
) {
	const now = body.signedAt ? new Date(body.signedAt) : new Date();

	// 1. Извлекаем имя пациента для юридической аттестации подписи
	const patientRow = await db
		.select({ fullName: patients.fullName })
		.from(patients)
		.where(
			and(
				eq(patients.id, patientId),
				eq(patients.organizationId, orgId),
			),
		)
		.limit(1);

	const patientFullName = patientRow[0]?.fullName || "Пациент клиники";
	const effectiveDoctorName = body.doctorFullName || "Лечащий врач";
	const isDigital =
		body.signatureType === "digital_canvas" ||
		body.verificationMethod === "tablet_stylus" ||
		body.verificationMethod === "digital_canvas";

	const attestationNote =
		body.notes ||
		(isDigital
			? "Подписано пациентом на экране (Canvas / ПЭП по 63-ФЗ)"
			: "Подписано на бумажном носителе и передано в архив клиники");

	const effectiveKind = body.consentType || body.kind || "informed_consent";
	let effectiveDocId: string | null = body.documentId ?? null;

	// 2. Если documentId не передан, создаем юридическую запись в generatedDocuments
	if (!effectiveDocId) {
		const targetKind = mapConsentKindToDocumentKind(effectiveKind);
		const docTitle = body.title || "Информированное добровольное согласие";

		const [createdDoc] = await db
			.insert(generatedDocuments)
			.values({
				organizationId: orgId,
				patientId,
				visitId: body.visitId ?? null,
				kind: targetKind,
				status: "issued",
				title: docTitle,
				signatureSvg: body.signatureSvg ?? null,
				issuedSnapshotSha256: body.integrityHash ?? null,
				issuedAt: now,
				signatureAttestation: {
					mode: isDigital ? "simple_electronic_signature" : "paper_signed",
					signedAt: now.toISOString(),
					recipientFullName: patientFullName,
					recipientRole: "patient",
					staffFullName: effectiveDoctorName,
					staffRole: "doctor",
					identityChecked: true,
					documentOpenedAndChecked: true,
					recipientSigned: body.isSigned !== undefined ? body.isSigned : true,
					clinicRepresentativeSigned: true,
					note: attestationNote,
				},
				payloadJson: body.payload ? JSON.stringify(body.payload) : null,
			})
			.returning();

		if (createdDoc) {
			effectiveDocId = createdDoc.id;
		}
	} else {
		// Если documentId уже передан, обновляем подпись и хеш целостности в существующем документе
		await db
			.update(generatedDocuments)
			.set({
				status: "issued",
				issuedAt: now,
				...(body.signatureSvg ? { signatureSvg: body.signatureSvg } : {}),
				...(body.integrityHash ? { issuedSnapshotSha256: body.integrityHash } : {}),
				signatureAttestation: {
					mode: isDigital ? "simple_electronic_signature" : "paper_signed",
					signedAt: now.toISOString(),
					recipientFullName: patientFullName,
					recipientRole: "patient",
					staffFullName: effectiveDoctorName,
					staffRole: "doctor",
					identityChecked: true,
					documentOpenedAndChecked: true,
					recipientSigned: body.isSigned !== undefined ? body.isSigned : true,
					clinicRepresentativeSigned: true,
					note: attestationNote,
				},
			})
			.where(
				and(
					eq(generatedDocuments.id, effectiveDocId),
					eq(generatedDocuments.organizationId, orgId),
				),
			);
	}

	// 3. Записываем / обновляем согласие в patientConsents со связью на documentId
	const existing = await db
		.select({ id: patientConsents.id })
		.from(patientConsents)
		.where(
			and(
				eq(patientConsents.organizationId, orgId),
				eq(patientConsents.patientId, patientId),
				eq(patientConsents.kind, effectiveKind),
			),
		)
		.limit(1);

	let savedConsent;
	if (existing.length > 0 && existing[0]) {
		const [updated] = await db
			.update(patientConsents)
			.set({
				grantedAt: now,
				revokedAt: null,
				documentId: effectiveDocId,
			})
			.where(
				and(
					eq(patientConsents.id, existing[0].id),
					eq(patientConsents.organizationId, orgId),
				),
			)
			.returning();
		savedConsent = updated;
	} else {
		const [created] = await db
			.insert(patientConsents)
			.values({
				organizationId: orgId,
				patientId,
				kind: effectiveKind,
				grantedAt: now,
				documentId: effectiveDocId,
			})
			.returning();
		savedConsent = created;
	}

	return {
		...savedConsent,
		consentType: effectiveKind,
		isSigned: body.isSigned !== undefined ? body.isSigned : true,
		signedAt: now.toISOString(),
		doctorFullName: effectiveDoctorName,
		signatureType: body.signatureType || (isDigital ? "digital_canvas" : "paper_scanned"),
		documentId: effectiveDocId,
		signatureSvg: body.signatureSvg ?? null,
		integrityHash: body.integrityHash ?? null,
		title: body.title,
		verificationMethod: body.verificationMethod,
	};
}

export async function syncDocumentToPatientConsent(
	orgId: string,
	patientId: string,
	kind: string,
	docId: string,
	grantedAtDate?: Date,
) {
	const now = grantedAtDate ?? new Date();
	const existing = await db
		.select({ id: patientConsents.id })
		.from(patientConsents)
		.where(
			and(
				eq(patientConsents.organizationId, orgId),
				eq(patientConsents.patientId, patientId),
				eq(patientConsents.kind, kind),
			),
		)
		.limit(1);

	if (existing.length > 0 && existing[0]) {
		await db
			.update(patientConsents)
			.set({ grantedAt: now, revokedAt: null, documentId: docId })
			.where(
				and(
					eq(patientConsents.id, existing[0].id),
					eq(patientConsents.organizationId, orgId),
				),
			);
	} else {
		await db.insert(patientConsents).values({
			organizationId: orgId,
			patientId,
			kind,
			grantedAt: now,
			documentId: docId,
		});
	}
}
