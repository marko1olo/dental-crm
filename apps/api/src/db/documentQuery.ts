import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
	DocumentIssueSignatureAttestation,
	DocumentKind,
	DocumentPayload,
	DocumentReleaseJournalEntry,
	DocumentVoidAttestation,
	GeneratedDocument,
	TaxPaymentSnapshot,
	TaxXmlSnapshot,
	TaxXmlSourceSnapshot,
} from "@dental/shared";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./client.js";
import * as schema from "./schema.js";

function documentSnapshotPath(documentId: string): string {
	const dir = path.join(process.cwd(), ".dente-data", "documents");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return path.join(dir, `${documentId}.html`);
}

export function writeIssuedDocumentSnapshot(
	documentId: string,
	html: string,
): { sha256: string; snapshotPath: string; createdAt: string } {
	const file = documentSnapshotPath(documentId);
	writeFileSync(file, html, "utf8");
	return {
		sha256: createHash("sha256").update(html, "utf8").digest("hex"),
		snapshotPath: file,
		createdAt: new Date().toISOString(),
	};
}

export async function readIssuedDocumentSnapshot(
	document: import("@dental/shared").GeneratedDocument,
): Promise<string | null> {
	if (document.status !== "issued" && document.status !== "voided") return null;
	if (!document.issuedSnapshotSha256) return null;
	const snapshotPath =
		document.storagePath || documentSnapshotPath(document.id);

	try {
		const html = await readFile(snapshotPath, "utf8");
		const actualHash = createHash("sha256").update(html, "utf8").digest("hex");
		if (actualHash !== document.issuedSnapshotSha256) return null;
		return html;
	} catch (e: any) {
		if (e.code === "ENOENT") return null;
		throw e;
	}
}

import { recordAuditEvent } from "../audit.js";

// Basic mapping from schema to type
function mapDocument(
	record: typeof schema.generatedDocuments.$inferSelect,
): GeneratedDocument {
	return {
		id: record.id,
		organizationId: record.organizationId,
		patientId: record.patientId,
		visitId: record.visitId,
		kind: record.kind as any,
		status: record.status as any,
		title: record.title,
		storagePath: record.storagePath,
		totalAmountRub: record.totalAmountRub,
		taxYear: record.taxYear,
		taxPayerInn: record.taxPayerInn,
		payload: record.payloadJson ? JSON.parse(record.payloadJson) : null,
		taxPaymentSnapshot: record.taxPaymentSnapshotJson
			? JSON.parse(record.taxPaymentSnapshotJson)
			: null,
		taxXmlSourceSnapshot: record.taxXmlSourceSnapshot as any,
		taxXmlSnapshot: record.taxXmlSnapshot as any,
		signatureAttestation: record.signatureAttestation as any,
		cryptoSignaturePkcs7: record.cryptoSignaturePkcs7,
		voidAttestation: record.voidAttestation as any,
		releaseJournalEntry: record.releaseJournalEntry as any,
		issuedAt: record.issuedAt?.toISOString() ?? null,
		issuedSnapshotSha256: record.issuedSnapshotSha256,
		issuedSnapshotCreatedAt:
			record.issuedSnapshotCreatedAt?.toISOString() ?? null,
		issuedByUserId: record.issuedByUserId,
		voidedAt: record.voidedAt?.toISOString() ?? null,
		voidedByUserId: record.voidedByUserId,
		createdAt: record.createdAt.toISOString(),
	} as GeneratedDocument;
}

export async function getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

export async function getDocumentsByPatientId(
	organizationId: string,
	patientId: string,
): Promise<GeneratedDocument[]> {
	const records = await db
		.select()
		.from(schema.generatedDocuments)
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.patientId, patientId),
			),
		)
		.orderBy(desc(schema.generatedDocuments.createdAt));
	return records.map(mapDocument);
}

export async function getDocumentById(
	organizationId: string,
	id: string,
): Promise<GeneratedDocument | null> {
	const [record] = await db
		.select()
		.from(schema.generatedDocuments)
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, id),
			),
		);
	return record ? mapDocument(record) : null;
}

const documentTitles: Record<string, string> = {
	medical_record_extract: "Выписка из медицинской карты",
	outpatient_medical_card_025u: "Медицинская карта 025/у",
	medical_document_release_receipt: "Расписка о получении",
	medical_record_copy_request: "Заявление о выдаче копии",
	tax_deduction_application: "Заявление на вычет",
	legacy_tax_deduction_certificate: "Справка об оплате мед. услуг",
	tax_deduction_registry: "Реестр для налогового вычета",
	patient_intake_questionnaire: "Анкета о здоровье",
};

export async function createGeneratedDocumentInDb(
	organizationId: string,
	input: {
		patientId: string;
		visitId?: string | null | undefined;
		kind: any;
		title?: string | undefined;
		totalAmountRub?: number | null | undefined;
		taxYear?: number | null | undefined;
		taxPayerInn?: string | null | undefined;
		payload?: any | null | undefined;
	},
): Promise<GeneratedDocument> {
	const title = input.title?.trim() || documentTitles[input.kind] || "Документ";
	const [record] = await db
		.insert(schema.generatedDocuments)
		.values({
			organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			kind: input.kind,
			title: title.length > 240 ? title.slice(0, 240) : title,
			status: "draft",
			totalAmountRub: input.totalAmountRub ?? null,
			taxYear: input.taxYear ?? null,
			taxPayerInn: input.taxPayerInn ?? null,
			payloadJson: input.payload ? JSON.stringify(input.payload) : null,
		})
		.returning();

	if (!record) throw new Error("Failed to create document");

	await recordAuditEvent({
		organizationId,
		entityType: "document",
		entityId: record.id,
		action: "document_created",
		reason: null,
	});

	return mapDocument(record);
}

export async function issueGeneratedDocumentInDb(
	organizationId: string,
	documentId: string,
	options: {
		issuedAt?: string;
		issuedByUserId?: string | null;
		releaseJournalEntry?: DocumentReleaseJournalEntry | null;
		snapshotHtml?: string;
		signatureAttestation?: DocumentIssueSignatureAttestation;
		taxPaymentSnapshot?: TaxPaymentSnapshot | null;
		taxXmlSourceSnapshot?: TaxXmlSourceSnapshot | null;
		totalAmountRub?: number | null;
	} = {},
): Promise<GeneratedDocument | null> {
	const [existing] = await db
		.select()
		.from(schema.generatedDocuments)
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		);

	if (!existing || existing.status === "voided") return null;
	if (existing.status === "issued") return mapDocument(existing);

	const snapshot = options.snapshotHtml
		? writeIssuedDocumentSnapshot(existing.id, options.snapshotHtml)
		: null;

	const [updated] = await db
		.update(schema.generatedDocuments)
		.set({
			status: "issued",
			issuedAt: options.issuedAt ? new Date(options.issuedAt) : new Date(),
			issuedByUserId: options.issuedByUserId || null,
			releaseJournalEntry: options.releaseJournalEntry || null,
			signatureAttestation: options.signatureAttestation || null,
			taxPaymentSnapshotJson: options.taxPaymentSnapshot
				? JSON.stringify(options.taxPaymentSnapshot)
				: existing.taxPaymentSnapshotJson,
			taxXmlSourceSnapshot:
				options.taxXmlSourceSnapshot || existing.taxXmlSourceSnapshot,
			totalAmountRub: options.totalAmountRub ?? existing.totalAmountRub,
			...(snapshot
				? {
						storagePath: snapshot.snapshotPath,
						issuedSnapshotSha256: snapshot.sha256,
						issuedSnapshotCreatedAt: new Date(snapshot.createdAt),
					}
				: {}),
		})
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		)
		.returning();

	if (!updated) return null;

	await recordAuditEvent({
		organizationId,
		entityType: "document",
		entityId: updated.id,
		action: "document_issued",
		reason: null,
	});

	return mapDocument(updated);
}

export async function voidGeneratedDocumentInDb(
	organizationId: string,
	documentId: string,
	options: {
		voidedAt?: string;
		voidAttestation?: DocumentVoidAttestation;
	} = {},
): Promise<GeneratedDocument | null> {
	const [existing] = await db
		.select()
		.from(schema.generatedDocuments)
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		);

	if (!existing) return null;
	if (existing.status === "voided") return mapDocument(existing);

	const [updated] = await db
		.update(schema.generatedDocuments)
		.set({
			status: "voided",
			voidedAt: options.voidedAt ? new Date(options.voidedAt) : new Date(),
			voidedByUserId: "doctor",
			voidAttestation: options.voidAttestation || null,
		})
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		)
		.returning();

	if (!updated) return null;

	await recordAuditEvent({
		organizationId,
		entityType: "document",
		entityId: updated.id,
		action: "document_voided",
		reason: null,
	});

	return mapDocument(updated);
}

export async function storeTaxXmlSnapshotInDb(
	organizationId: string,
	documentId: string,
	snapshot: Omit<TaxXmlSnapshot, "createdAt" | "sha256"> &
		Partial<Pick<TaxXmlSnapshot, "createdAt" | "sha256">>,
): Promise<any> {
	const completeSnapshot: TaxXmlSnapshot = {
		...snapshot,
		createdAt: snapshot.createdAt || new Date().toISOString(),
		sha256:
			snapshot.sha256 ||
			require("crypto").createHash("sha256").update(snapshot.xml).digest("hex"),
	};
	const [doc] = await db
		.update(schema.generatedDocuments)
		.set({ taxXmlSnapshot: completeSnapshot })
		.where(
			and(
				eq(schema.generatedDocuments.organizationId, organizationId),
				eq(schema.generatedDocuments.id, documentId),
			),
		)
		.returning();
	return doc;
}

export async function getDocumentRenderContextFromDb(
	organizationId: string,
	patientId?: string,
) {
	const { getClinicSettingsFromDb } = require("./settingsQuery.js");
	const { getServiceCatalogForOrganization } = require("./pricelistQuery.js");
	const { getPaymentsByPatientIdInDb } = require("./billingQuery.js");
	const { getTreatmentPlanItemsForPatient } = require("./clinicalQuery.js");
	const settings = await getClinicSettingsFromDb(organizationId);
	const serviceCatalog = await getServiceCatalogForOrganization(organizationId);
	let payments = [];
	let treatmentPlanItems = [];
	if (patientId) {
		payments = await getPaymentsByPatientIdInDb(organizationId, patientId);
		treatmentPlanItems = await getTreatmentPlanItemsForPatient(
			organizationId,
			patientId,
		);
	}
	return {
		clinicProfile: settings.profile,
		serviceCatalog,
		payments,
		treatmentPlanItems,
	};
}
