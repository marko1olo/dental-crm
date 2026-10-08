/**
 * @file documents.ts
 * @description Layer 1 & 3: Generated documents collection, snapshot storage and document lifecycle.
 */
import { recordAuditEvent } from "./audit.js";


import { createHash, randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
	DocumentIssueSignatureAttestation,
	DocumentKind,
	DocumentPayload,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	GeneratedDocument,
} from "@dental/shared";
import { documentKindMetadata } from "@dental/shared";
import { organizationId, marinaPatientId, alexeyPatientId, activeVisitId, doctorUserId } from "./fixtureIds.js";
import { persistMutableState } from "./stateNotifier.js";

export const documents: GeneratedDocument[] = [
	{
		id: "f9d274b4-3730-4eaa-aeac-20bf5f2f1bc5",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "paid_medical_services_contract",
		title: "Договор платных медицинских услуг",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 6800,
	},
	{
		id: "59b724c7-c988-45a7-91d8-1ad11a6e74c7",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		kind: "completed_works_act",
		title: "Акт выполненных работ",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 6800,
	},
	{
		id: "b77b8720-7ffd-453a-9db4-54637ef292a7",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		kind: "tax_deduction_certificate",
		title: "Черновик данных для справки КНД 1151156 за 2026 год",
		status: "draft",
		issuedAt: null,
		totalAmountRub: 4500,
		taxYear: 2026,
	},
];


const documentTitles = Object.fromEntries(
	Object.entries(documentKindMetadata).map(([kind, metadata]) => [
		kind,
		metadata.title,
	]),
) as Record<DocumentKind, string>;

function documentSnapshotDirectoryPath(): string {
	return (
		process.env.DENTAL_DOCUMENT_SNAPSHOT_DIR ??
		path.resolve(process.cwd(), ".data", "document-snapshots")
	);
}

function documentSnapshotPath(documentId: string): string {
	return path.join(documentSnapshotDirectoryPath(), `${documentId}.html`);
}

function sleepSync(milliseconds: number): void {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function moveSnapshotTempFile(tempPath: string, snapshotPath: string): void {
	let lastError: unknown = null;
	for (const delayMs of [0, 20, 60, 140, 300]) {
		if (delayMs > 0) sleepSync(delayMs);
		try {
			renameSync(tempPath, snapshotPath);
			return;
		} catch (error) {
			lastError = error;
		}
	}

	try {
		copyFileSync(tempPath, snapshotPath);
		try {
			unlinkSync(tempPath);
		} catch {
			// A stale temp file is less dangerous than losing an issued document snapshot.
		}
		return;
	} catch {
		throw lastError instanceof Error
			? lastError
			: new Error("Failed to store issued document snapshot.");
	}
}

function writeIssuedDocumentSnapshot(
	documentId: string,
	html: string,
): { snapshotPath: string; sha256: string; createdAt: string } {
	const snapshotPath = documentSnapshotPath(documentId);
	mkdirSync(path.dirname(snapshotPath), { recursive: true });
	const tempPath = `${snapshotPath}.tmp`;
	writeFileSync(tempPath, html, "utf8");
	moveSnapshotTempFile(tempPath, snapshotPath);
	return {
		snapshotPath,
		sha256: createHash("sha256").update(html, "utf8").digest("hex"),
		createdAt: new Date().toISOString(),
	};
}

function _storeIssuedDocumentSnapshot(
	documentId: string,
	html: string,
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (document?.status !== "issued") return null;

	const snapshot = writeIssuedDocumentSnapshot(document.id, html);
	document.storagePath = snapshot.snapshotPath;
	document.issuedSnapshotSha256 = snapshot.sha256;
	document.issuedSnapshotCreatedAt = snapshot.createdAt;
	document.issuedByUserId = doctorUserId;
	persistMutableState();
	return document;
}

function _createGeneratedDocument(input: {
	patientId: string;
	visitId?: string | null | undefined;
	kind: DocumentKind;
	title?: string | undefined;
	totalAmountRub?: number | null | undefined;
	taxYear?: number | null | undefined;
	taxPayerInn?: string | null | undefined;
	payload?: DocumentPayload | null | undefined;
}): GeneratedDocument {
	const title = input.title?.trim() || documentTitles[input.kind];
	const document: GeneratedDocument = {
		id: randomUUID(),
		organizationId,
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		kind: input.kind,
		title: title.length > 240 ? title.slice(0, 240) : title,
		status: "draft",
		issuedAt: null,
		totalAmountRub: input.totalAmountRub ?? null,
		taxYear: input.taxYear ?? null,
		taxPayerInn: input.taxPayerInn?.trim() || null,
		payload: input.payload ?? null,
	};
	documents.unshift(document);
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "document_created",
		reason: `${document.title} создан из рабочего экрана.`,
	});
	return document;
}

function _issueGeneratedDocument(
	documentId: string,
	options: {
		issuedAt?: string;
		releaseJournalEntry?: DocumentReleaseJournalEntry | null;
		snapshotHtml?: string;
		signatureAttestation?: DocumentIssueSignatureAttestation;
		taxPaymentSnapshot?: TaxPaymentSnapshot | null;
		taxXmlSourceSnapshot?: TaxXmlSourceSnapshot | null;
		totalAmountRub?: number | null;
	} = {},
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (!document || document.status === "voided") {
		return null;
	}
	if (document.status === "issued") {
		return document;
	}

	const snapshot = options.snapshotHtml
		? writeIssuedDocumentSnapshot(document.id, options.snapshotHtml)
		: null;
	document.status = "issued";
	document.issuedAt = options.issuedAt ?? new Date().toISOString();
	document.issuedByUserId = doctorUserId;
	document.signatureAttestation = options.signatureAttestation ?? null;
	document.releaseJournalEntry = options.releaseJournalEntry
		? {
				...options.releaseJournalEntry,
				createdByUserId:
					options.releaseJournalEntry.createdByUserId ?? doctorUserId,
				sourceSnapshotSha256:
					options.releaseJournalEntry.sourceSnapshotSha256 ??
					snapshot?.sha256 ??
					document.issuedSnapshotSha256 ??
					null,
			}
		: null;
	if (options.totalAmountRub !== undefined) {
		document.totalAmountRub = options.totalAmountRub;
	}
	if (options.taxPaymentSnapshot !== undefined) {
		document.taxPaymentSnapshot = options.taxPaymentSnapshot;
	}
	if (options.taxXmlSourceSnapshot !== undefined) {
		document.taxXmlSourceSnapshot = options.taxXmlSourceSnapshot;
	}
	if (snapshot) {
		document.storagePath = snapshot.snapshotPath;
		document.issuedSnapshotSha256 = snapshot.sha256;
		document.issuedSnapshotCreatedAt = snapshot.createdAt;
	}
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "document_issued",
		reason: `${document.title} выдан пациенту или законному получателю.`,
	});
	persistMutableState();
	return document;
}

function _storeTaxXmlSnapshot(
	documentId: string,
	input: Omit<TaxXmlSnapshot, "sha256" | "createdAt">,
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (document?.status !== "issued") return null;

	document.taxXmlSnapshot = {
		...input,
		sha256: createHash("sha256").update(input.xml, "utf8").digest("hex"),
		createdAt: new Date().toISOString(),
	};
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "tax_xml_snapshot_created",
		reason:
			"XML КНД сохранен как неизменяемый снимок первой успешной выгрузки.",
	});
	persistMutableState();
	return document;
}

function _voidGeneratedDocument(
	documentId: string,
	options: {
		voidedAt?: string;
		voidAttestation?: DocumentVoidAttestation;
	} = {},
): GeneratedDocument | null {
	const document = documents.find((candidate) => candidate.id === documentId);
	if (!document) {
		return null;
	}
	if (document.status === "voided") {
		return document;
	}

	const voidedAt = options.voidedAt ?? new Date().toISOString();
	const voidAttestation = options.voidAttestation ?? null;
	document.status = "voided";
	document.voidedAt = voidedAt;
	document.voidedByUserId = doctorUserId;
	document.voidAttestation = voidAttestation;
	recordAuditEvent({
		entityType: "document",
		entityId: document.id,
		action: "document_voided",
		reason: voidAttestation
			? `${document.title} аннулирован без удаления записи. Причина: ${voidAttestation.reasonText}. Ответственный: ${voidAttestation.staffRole} ${voidAttestation.staffFullName}.`
			: `${document.title} аннулирован без удаления записи.`,
	});
	persistMutableState();
	return document;
}

function cleanNullableText(value: string | null | undefined): string | null {
	const clean = value?.trim();
	return clean ? clean : null;
}

