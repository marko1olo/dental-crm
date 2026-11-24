import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
	rublesToKopecks,
	type DocumentIssueSignatureAttestation,
	type DocumentReleaseJournalEntry,
	type DocumentVoidAttestation,
	type GeneratedDocument,
	type TaxPaymentSnapshot,
	type TaxXmlSnapshot,
	type TaxXmlSourceSnapshot,
	type TreatmentPlanItem,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getPaymentsByPatientIdInDb } from "./billing/index.js";
import { db, type TenantDb } from "./client.js";
import { getTreatmentPlanItemsForPatient } from "./clinicalQuery.js";
import { getServiceCatalogForOrganization } from "./pricelistQuery.js";
import * as schema from "./schema.js";
import { getClinicSettingsFromDb } from "./settingsQuery.js";

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

function stampedDocumentSnapshotPath(documentId: string): string {
	const dir = path.join(process.cwd(), ".dente-data", "documents");
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
	return path.join(dir, `${documentId}.stamped.html`);
}

export function writeStampedDocumentSnapshot(
	documentId: string,
	html: string,
): { sha256: string; snapshotPath: string; createdAt: string } {
	const file = stampedDocumentSnapshotPath(documentId);
	writeFileSync(file, html, "utf8");
	return {
		sha256: createHash("sha256").update(html, "utf8").digest("hex"),
		snapshotPath: file,
		createdAt: new Date().toISOString(),
	};
}

export function readIssuedDocumentSnapshot(
	document: Pick<
		import("@dental/shared").GeneratedDocument,
		"id" | "status" | "issuedSnapshotSha256" | "storagePath"
	>,
): string | null {
	if (document.status !== "issued" && document.status !== "voided") return null;
	if (!document.issuedSnapshotSha256) return null;
	const snapshotPath =
		document.storagePath || documentSnapshotPath(document.id);
	if (!existsSync(snapshotPath)) return null;
	const html = readFileSync(snapshotPath, "utf8");
	const actualHash = createHash("sha256").update(html, "utf8").digest("hex");
	if (actualHash !== document.issuedSnapshotSha256) return null;
	return html;
}

import { recordAuditEvent } from "../audit.js";

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
	if (!raw || typeof raw !== "string" || !raw.trim()) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function toSafeIsoString(date: unknown, fallbackIso: string | null = null): string | null {
	if (!date) return fallbackIso;
	const d = date instanceof Date ? date : new Date(String(date));
	return Number.isNaN(d.getTime()) ? fallbackIso : d.toISOString();
}

// Basic mapping from schema to type
function mapDocument(
	record: typeof schema.generatedDocuments.$inferSelect,
): GeneratedDocument {
	return {
		id: record.id,
		organizationId: record.organizationId,
		patientId: record.patientId,
		visitId: record.visitId,
		kind: record.kind,
		status: record.status,
		title: record.title,
		storagePath: record.storagePath,
		totalAmountRub: record.totalAmountRub,
		totalAmountKopecks:
			record.totalAmountKopecks !== null && record.totalAmountKopecks !== undefined
				? Number(record.totalAmountKopecks)
				: (record.totalAmountRub !== null && record.totalAmountRub !== undefined
					? rublesToKopecks(record.totalAmountRub)
					: null),
		taxYear: record.taxYear,
		taxPayerInn: record.taxPayerInn,
		payload: safeJsonParse<Record<string, unknown> | null>(record.payloadJson, null),
		taxPaymentSnapshot: safeJsonParse<TaxPaymentSnapshot | null>(
			record.taxPaymentSnapshotJson,
			null,
		),
		taxXmlSourceSnapshot: record.taxXmlSourceSnapshot,
		taxXmlSnapshot: record.taxXmlSnapshot,
		signatureAttestation: record.signatureAttestation,
		voidAttestation: record.voidAttestation,
		releaseJournalEntry: record.releaseJournalEntry,
		issuedAt: toSafeIsoString(record.issuedAt),
		issuedSnapshotSha256: record.issuedSnapshotSha256,
		issuedSnapshotCreatedAt: toSafeIsoString(record.issuedSnapshotCreatedAt),
		issuedByUserId: record.issuedByUserId,
		voidedAt: toSafeIsoString(record.voidedAt),
		voidedByUserId: record.voidedByUserId,
		signatureSvg: record.signatureSvg ?? null,
		cryptoSignaturePkcs7: record.cryptoSignaturePkcs7 ?? null,
		doctorSignaturePkcs7: record.doctorSignaturePkcs7 ?? null,
		doctorCertSerial: record.doctorCertSerial ?? null,
		doctorCertSubject: record.doctorCertSubject ?? null,
		doctorSignedAt: toSafeIsoString(record.doctorSignedAt),
		createdAt: toSafeIsoString(record.createdAt, new Date().toISOString()) ?? new Date().toISOString(),
	} as GeneratedDocument;
}

export async function getDefaultOrganizationId(): Promise<string | null> {
	const [org] = await db.select().from(schema.organizations).limit(1);
	return org?.id || null;
}

export async function getDocumentsByPatientId(
	organizationId: string,
	patientId: string,
	tx?: TenantDb | undefined,
): Promise<GeneratedDocument[]> {
	const client = tx ?? db;
	const records = await client
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

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getDocumentById(
	organizationId: string,
	id: string,
	tx?: TenantDb | undefined,
): Promise<GeneratedDocument | null> {
	if (!id || !UUID_REGEX.test(id)) {
		return null;
	}

	const client = tx ?? db;
	const [record] = await client
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
	medical_record_extract: "Выписка из медицинской карты стоматологического пациента",
	dental_medical_card_043u: "Медицинская карта стоматологического приёма",
	orthodontic_medical_card_043_1u: "Ортодонтическая карта приёма",
	daily_dentist_diary_037u: "Дневник ежедневного приёма врача-стоматолога",
	summary_dentist_statement_039u: "Сводная ведомость стоматологического приёма",
	radiation_dose_sheet: "Лист учета дозовых нагрузок",
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
		kind: GeneratedDocument["kind"];
		title?: string | undefined;
		totalAmountRub?: number | null | undefined;
		totalAmountKopecks?: number | null | undefined;
		taxYear?: number | null | undefined;
		taxPayerInn?: string | null | undefined;
		payload?: Record<string, unknown> | null | undefined;
		signatureSvg?: string | null | undefined;
		actorUserId?: string | null | undefined;
		tx?: TenantDb | undefined;
	},
): Promise<GeneratedDocument> {
	const client = input.tx ?? db;

	// Ownership assert: patient (and optional visit) must belong to caller org.
	// Route-layer checks exist, but the query helper is callable from anywhere.
	const [ownedPatient] = await client
		.select({ id: schema.patients.id })
		.from(schema.patients)
		.where(
			and(
				eq(schema.patients.organizationId, organizationId),
				eq(schema.patients.id, input.patientId),
			),
		)
		.limit(1);
	if (!ownedPatient) {
		throw new Error("Пациент не принадлежит организации: создание документа отклонено");
	}
	if (input.visitId) {
		const [ownedVisit] = await client
			.select({ id: schema.visits.id })
			.from(schema.visits)
			.where(
				and(
					eq(schema.visits.organizationId, organizationId),
					eq(schema.visits.id, input.visitId),
					eq(schema.visits.patientId, input.patientId),
				),
			)
			.limit(1);
		if (!ownedVisit) {
			throw new Error(
				"Приём не принадлежит организации или пациенту: создание документа отклонено",
			);
		}
	}
	const title = input.title?.trim() || documentTitles[input.kind] || "Документ";
	const [record] = await client
		.insert(schema.generatedDocuments)
		.values({
			organizationId,
			patientId: input.patientId,
			visitId: input.visitId || null,
			kind: input.kind,
			title: title.length > 240 ? title.slice(0, 240) : title,
			status: "draft",
			totalAmountRub: input.totalAmountRub ?? null,
			totalAmountKopecks:
				input.totalAmountKopecks !== undefined && input.totalAmountKopecks !== null
					? BigInt(input.totalAmountKopecks)
					: (input.totalAmountRub !== undefined && input.totalAmountRub !== null
						? BigInt(rublesToKopecks(input.totalAmountRub))
						: null),
			taxYear: input.taxYear ?? null,
			taxPayerInn: input.taxPayerInn ?? null,
			payloadJson: input.payload ? JSON.stringify(input.payload) : null,
			signatureSvg: input.signatureSvg ?? null,
		})
		.returning();

	if (!record) throw new Error("Не удалось создать документ в базе данных");

	await recordAuditEvent({
		organizationId,
		actorUserId: input.actorUserId ?? null,
		entityType: "document",
		entityId: record.id,
		action: "document_created",
		reason: null,
		tx: input.tx,
	});

	return mapDocument(record);
}

const signerUserIdSchema = z.string().uuid();

/**
 * Проверяет идентификатор сотрудника перед записью в юридически значимую колонку.
 *
 * БЫЛО: в `issued_by_user_id` уходил литерал `"doctor"`, а в `voided_by_user_id`
 * — он же. Обе колонки объявлены как `uuid ... references(users.id)`
 * (db/schema.ts:505 и :507), поэтому строка «doctor» не просто подменяла
 * подписанта — Postgres отвергал её с 22P02 `invalid input syntax for type
 * uuid`, и выдача документа падала целиком. Тот же класс отказа уже описан в
 * routes/documents/issue.ts:57-59 для прежней подстановки «mock-org».
 *
 * Значение обязано быть либо UUID реального сотрудника, либо `null`
 * («подписант не установлен»). Подстановка произвольной строки запрещена: она
 * приписывает юридический документ несуществующему лицу.
 */
function signerUserIdForColumn(
	value: string | null,
	column: "issued_by_user_id" | "voided_by_user_id",
): string | null {
	if (value === null) return null;
	const parsed = signerUserIdSchema.safeParse(value);
	if (!parsed.success) {
		throw new Error(
			`${column}: ожидался UUID сотрудника или null, получено ${JSON.stringify(value)}. ` +
				"Колонка — uuid с внешним ключом на users.id; произвольная строка делает " +
				"документ юридически недостоверным и отвергается Postgres (22P02).",
		);
	}
	return parsed.data;
}

export async function issueGeneratedDocumentInDb(
	organizationId: string,
	documentId: string,
	options: {
		/**
		 * Сотрудник, ВЫДАВШИЙ документ. Поле обязательно к передаче, чтобы каждый
		 * вызывающий осознанно выбрал: реальный пользователь из проверенного токена
		 * либо `null`, если авторизованного человека в запросе нет. Значения по
		 * умолчанию нет намеренно — именно оно и было источником литерала "doctor".
		 */
		issuedByUserId: string | null;
		issuedAt?: string;
		releaseJournalEntry?: DocumentReleaseJournalEntry | null;
		snapshotHtml?: string;
		signatureAttestation?: DocumentIssueSignatureAttestation;
		signatureSvg?: string | null;
		taxPaymentSnapshot?: TaxPaymentSnapshot | null;
		taxXmlSourceSnapshot?: TaxXmlSourceSnapshot | null;
		taxXmlSnapshot?: TaxXmlSnapshot | null;
		totalAmountRub?: number | null | undefined;
		totalAmountKopecks?: number | null | undefined;
		tx?: TenantDb | undefined;
	},
): Promise<GeneratedDocument | null> {
	const client = options.tx ?? db;
	const issuedByUserId = signerUserIdForColumn(
		options.issuedByUserId,
		"issued_by_user_id",
	);
	const [existing] = await client
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

	const snapshotMeta = options.snapshotHtml
		? {
				sha256: createHash("sha256").update(options.snapshotHtml, "utf8").digest("hex"),
				snapshotPath: documentSnapshotPath(existing.id),
				createdAt: new Date().toISOString(),
			}
		: null;

	const [updated] = await client
		.update(schema.generatedDocuments)
		.set({
			status: "issued",
			issuedAt: options.issuedAt ? new Date(options.issuedAt) : new Date(),
			issuedByUserId,
			releaseJournalEntry: options.releaseJournalEntry || null,
			signatureAttestation: options.signatureAttestation || null,
			signatureSvg: options.signatureSvg ?? existing.signatureSvg,
			taxPaymentSnapshotJson: options.taxPaymentSnapshot
				? JSON.stringify(options.taxPaymentSnapshot)
				: existing.taxPaymentSnapshotJson,
			taxXmlSourceSnapshot:
				options.taxXmlSourceSnapshot || existing.taxXmlSourceSnapshot,
			taxXmlSnapshot:
				options.taxXmlSnapshot !== undefined
					? options.taxXmlSnapshot
					: existing.taxXmlSnapshot,
			totalAmountRub: options.totalAmountRub ?? existing.totalAmountRub,
			totalAmountKopecks:
				options.totalAmountKopecks !== undefined && options.totalAmountKopecks !== null
					? BigInt(options.totalAmountKopecks)
					: (options.totalAmountRub !== undefined && options.totalAmountRub !== null
						? BigInt(rublesToKopecks(options.totalAmountRub))
						: existing.totalAmountKopecks),
			...(snapshotMeta
				? {
						storagePath: snapshotMeta.snapshotPath,
						issuedSnapshotSha256: snapshotMeta.sha256,
						issuedSnapshotCreatedAt: new Date(snapshotMeta.createdAt),
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

	if (options.snapshotHtml) {
		writeIssuedDocumentSnapshot(existing.id, options.snapshotHtml);
	}

	if (options.signatureAttestation || options.signatureSvg) {
		await client.insert(schema.documentSignatures).values({
			organizationId,
			documentId: updated.id,
			patientId: updated.patientId,
			signerRole: "patient",
			signerName:
				options.signatureAttestation?.recipientFullName ||
				"Пациент (ПЭП 63-ФЗ)",
			signatureType: options.signatureSvg ? "pep_canvas" : "pep_sms",
			signatureSvg: options.signatureSvg ?? updated.signatureSvg ?? null,
			documentSha256:
				updated.issuedSnapshotSha256 ||
				createHash("sha256")
					.update(`${updated.id}:${toSafeIsoString(updated.issuedAt, "") ?? ""}`)
					.digest("hex"),
			signedAt: updated.issuedAt ?? new Date(),
		});
	}

	await recordAuditEvent({
		organizationId,
		actorUserId: issuedByUserId,
		entityType: "document",
		entityId: updated.id,
		action: "document_issued",
		reason: null,
		tx: options.tx,
	});

	return mapDocument(updated);
}

export async function voidGeneratedDocumentInDb(
	organizationId: string,
	documentId: string,
	options: {
		/**
		 * Сотрудник, АННУЛИРОВАВШИЙ документ. Обязателен к передаче по той же
		 * причине, что и issuedByUserId: аннулирование — юридическое действие,
		 * и приписывать его литералу "doctor" нельзя.
		 */
		voidedByUserId: string | null;
		voidedAt?: string;
		voidAttestation?: DocumentVoidAttestation | undefined;
		tx?: TenantDb | undefined;
	},
): Promise<GeneratedDocument | null> {
	const voidedByUserId = signerUserIdForColumn(
		options.voidedByUserId,
		"voided_by_user_id",
	);

	const client = options.tx ?? db;
	const [existing] = await client
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

	const [updated] = await client
		.update(schema.generatedDocuments)
		.set({
			status: "voided",
			voidedAt: options.voidedAt ? new Date(options.voidedAt) : new Date(),
			voidedByUserId,
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
		actorUserId: voidedByUserId,
		entityType: "document",
		entityId: updated.id,
		action: "document_voided",
		reason: options.voidAttestation?.reasonText || null,
		tx: options.tx,
	});

	return mapDocument(updated);
}

export async function storeTaxXmlSnapshotInDb(
	organizationId: string,
	documentId: string,
	snapshot: Omit<TaxXmlSnapshot, "createdAt" | "sha256"> &
		Partial<Pick<TaxXmlSnapshot, "createdAt" | "sha256">>,
): Promise<GeneratedDocument | null> {
	const completeSnapshot: TaxXmlSnapshot = {
		...snapshot,
		createdAt: snapshot.createdAt || new Date().toISOString(),
		sha256:
			snapshot.sha256 ||
			createHash("sha256").update(snapshot.xml).digest("hex"),
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
	return doc ? mapDocument(doc) : null;
}

export async function getDocumentRenderContextFromDb(
	organizationId: string,
	patientId?: string,
) {
	const settings = await getClinicSettingsFromDb(organizationId);
	const serviceCatalog = await getServiceCatalogForOrganization(organizationId);
	let payments: Awaited<ReturnType<typeof getPaymentsByPatientIdInDb>> = [];
	let treatmentPlanItems: TreatmentPlanItem[] = [];
	if (patientId) {
		payments = await getPaymentsByPatientIdInDb(organizationId, patientId);
		// Строки treatment_items — это форма базы, а не доменный тип: quantity там
		// numeric (драйвер отдаёт строку), serviceId может быть NULL, а названия
		// услуги на момент выдачи (snapshotServiceName) в таблице нет вообще.
		// Рендер документа печатает именно snapshotServiceName, поэтому подставляем
		// title строки — он и есть зафиксированное название позиции плана.
		treatmentPlanItems = (
			await getTreatmentPlanItemsForPatient(organizationId, patientId)
		).map(
			(item): TreatmentPlanItem => ({
				id: item.id,
				organizationId: item.organizationId,
				patientId: item.patientId,
				visitId: item.visitId ?? null,
				serviceId: item.serviceId ?? "",
				snapshotServiceName: item.title,
				snapshotServiceCategory: null,
				toothCode: item.toothCode ?? null,
				quantity: Number(item.quantity) || 1,
				unitPriceRub: Math.max(0, item.unitPriceRub),
				discountRub: Math.max(0, item.discountRub),
				status: item.status,
				plannedDoctorUserId: item.plannedDoctorUserId ?? null,
				plannedChairId: item.plannedChairId ?? null,
				notes: item.notes ?? null,
			}),
		);
	}
	return {
		clinicProfile: settings.profile,
		serviceCatalog,
		payments,
		treatmentPlanItems,
	};
}
