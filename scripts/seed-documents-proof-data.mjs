import { db } from "../apps/api/src/db/client.js";
import { sql } from "drizzle-orm";
import { writeIssuedDocumentSnapshot } from "../apps/api/src/db/documentQuery.js";
import { getPatientByIdFromDb } from "../apps/api/src/db/patientsQuery.js";
import { renderDocumentHtml } from "../apps/api/src/documents/renderDocument.js";
import { randomUUID } from "node:crypto";

async function main() {
	const orgId = "01a00000-0000-0000-0000-000000000000";
	const patientId = "01a00000-0000-0000-0000-000000000001";
	const doctorUserId = "01a00000-0000-0000-0003-000000000001";

	console.log("[SEED] Clearing and re-inserting canonical documents into PostgreSQL 18...");

	await db.execute(sql`
		DELETE FROM generated_documents WHERE organization_id = ${orgId} AND patient_id = ${patientId};
	`);

	const patient = await getPatientByIdFromDb(orgId, patientId);

	// 1. Договор оказания платных медицинских услуг (выдан со снэпшотом)
	const contractId = randomUUID();
	const contractDoc = {
		id: contractId,
		organizationId: orgId,
		patientId,
		visitId: null,
		kind: "paid_medical_services_contract",
		title: "Договор оказания платных медицинских услуг № 2026/043",
		status: "issued",
		totalAmountRub: 45000,
		taxYear: null,
		taxPayerInn: null,
		createdAt: new Date().toISOString(),
		issuedAt: new Date().toISOString(),
		issuedByUserId: doctorUserId,
		signatureAttestation: {
			mode: "paper_signed",
			signedAt: "2026-10-13 14:00",
			recipientFullName: "Смирнова Анна Сергеевна",
			recipientRole: "пациент",
			staffFullName: "Д-р Соколов А. В.",
			staffRole: "Врач-стоматолог",
			identityChecked: true,
			documentOpenedAndChecked: true,
			recipientSigned: true,
			clinicRepresentativeSigned: true,
		},
	};
	const contractHtml = renderDocumentHtml(contractDoc, patient, {});
	const contractSnap = writeIssuedDocumentSnapshot(contractId, contractHtml);

	await db.execute(sql`
		INSERT INTO generated_documents (
			id, organization_id, patient_id, kind, status, title,
			total_amount_rub, issued_at, issued_by_user_id,
			signature_attestation, storage_path, issued_snapshot_sha256,
			issued_snapshot_created_at, created_at
		) VALUES (
			${contractId}, ${orgId}, ${patientId}, 'paid_medical_services_contract', 'issued',
			${contractDoc.title}, 45000.00, NOW(), ${doctorUserId},
			${JSON.stringify(contractDoc.signatureAttestation)}::jsonb,
			${contractSnap.snapshotPath}, ${contractSnap.sha256}, NOW(), NOW()
		);
	`);

	// 2. Информированное добровольное согласие (выдано со снэпшотом)
	const consentId = randomUUID();
	const consentDoc = {
		id: consentId,
		organizationId: orgId,
		patientId,
		visitId: null,
		kind: "informed_consent",
		title: "Информированное добровольное согласие на лечение (ИДС 1051н)",
		status: "issued",
		totalAmountRub: null,
		taxYear: null,
		taxPayerInn: null,
		createdAt: new Date().toISOString(),
		issuedAt: new Date().toISOString(),
		issuedByUserId: doctorUserId,
		signatureAttestation: {
			mode: "paper_signed",
			signedAt: "2026-10-13 14:15",
			recipientFullName: "Смирнова Анна Сергеевна",
			recipientRole: "пациент",
			staffFullName: "Д-р Соколов А. В.",
			staffRole: "Врач-стоматолог",
			identityChecked: true,
			documentOpenedAndChecked: true,
			recipientSigned: true,
			clinicRepresentativeSigned: true,
		},
	};
	const consentHtml = renderDocumentHtml(consentDoc, patient, {});
	const consentSnap = writeIssuedDocumentSnapshot(consentId, consentHtml);

	await db.execute(sql`
		INSERT INTO generated_documents (
			id, organization_id, patient_id, kind, status, title,
			issued_at, issued_by_user_id, signature_attestation,
			storage_path, issued_snapshot_sha256, issued_snapshot_created_at,
			created_at
		) VALUES (
			${consentId}, ${orgId}, ${patientId}, 'informed_consent', 'issued',
			${consentDoc.title}, NOW(), ${doctorUserId},
			${JSON.stringify(consentDoc.signatureAttestation)}::jsonb,
			${consentSnap.snapshotPath}, ${consentSnap.sha256}, NOW(), NOW()
		);
	`);

	// 3. Форма 043/у (Черновик)
	const cardId = randomUUID();
	await db.execute(sql`
		INSERT INTO generated_documents (
			id, organization_id, patient_id, kind, status, title,
			created_at
		) VALUES (
			${cardId}, ${orgId}, ${patientId}, 'dental_medical_card_043u', 'draft',
			'Медицинская карта стоматологического больного (форма 043/у)',
			NOW()
		);
	`);

	// 4. Справка для налогового вычета 3-НДФЛ (выдана со снэпшотом)
	const taxId = randomUUID();
	const taxDoc = {
		id: taxId,
		organizationId: orgId,
		patientId,
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Справка об оплате медицинских услуг для ФНС (КНД 1151156)",
		status: "issued",
		totalAmountRub: 45000,
		taxYear: 2026,
		taxPayerInn: null,
		createdAt: new Date().toISOString(),
		issuedAt: new Date().toISOString(),
		issuedByUserId: doctorUserId,
		signatureAttestation: {
			mode: "paper_signed",
			signedAt: "2026-10-13 14:30",
			recipientFullName: "Смирнова Анна Сергеевна",
			recipientRole: "пациент",
			staffFullName: "Д-р Соколов А. В.",
			staffRole: "Главный врач",
			identityChecked: true,
			documentOpenedAndChecked: true,
			recipientSigned: true,
			clinicRepresentativeSigned: true,
		},
	};
	const taxHtml = renderDocumentHtml(taxDoc, patient, {});
	const taxSnap = writeIssuedDocumentSnapshot(taxId, taxHtml);

	await db.execute(sql`
		INSERT INTO generated_documents (
			id, organization_id, patient_id, kind, status, title,
			tax_year, total_amount_rub, issued_at, issued_by_user_id,
			signature_attestation, storage_path, issued_snapshot_sha256,
			issued_snapshot_created_at, created_at
		) VALUES (
			${taxId}, ${orgId}, ${patientId}, 'tax_deduction_certificate', 'issued',
			${taxDoc.title}, 2026, 45000.00, NOW(), ${doctorUserId},
			${JSON.stringify(taxDoc.signatureAttestation)}::jsonb,
			${taxSnap.snapshotPath}, ${taxSnap.sha256}, NOW(), NOW()
		);
	`);

	console.log(`[SEED] Success! Seeded 4 canonical documents with real snapshots!`);
	process.exit(0);
}

main().catch((err) => {
	console.error("[SEED] Error:", err);
	process.exit(1);
});
