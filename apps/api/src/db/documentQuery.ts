import { db } from "./client.js";
import * as schema from "./schema.js";
import { eq, and, desc, inArray } from "drizzle-orm";
import type { 
  GeneratedDocument,
  DocumentKind,
  DocumentPayload,
  DocumentReleaseJournalEntry,
  DocumentIssueSignatureAttestation,
  DocumentVoidAttestation,
  TaxPaymentSnapshot,
  TaxXmlSourceSnapshot,
  TaxXmlSnapshot,
  TreatmentPlanItem
} from "@dental/shared";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from "zod";

function documentSnapshotPath(documentId: string): string {
  const dir = path.join(process.cwd(), '.dente-data', 'documents');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, `${documentId}.html`);
}

export function writeIssuedDocumentSnapshot(documentId: string, html: string): { sha256: string; snapshotPath: string; createdAt: string } {
  const file = documentSnapshotPath(documentId);
  writeFileSync(file, html, 'utf8');
  return {
    sha256: createHash('sha256').update(html, 'utf8').digest('hex'),
    snapshotPath: file,
    createdAt: new Date().toISOString()
  };
}

export function readIssuedDocumentSnapshot(document: import('@dental/shared').GeneratedDocument): string | null {
  if (document.status !== 'issued' && document.status !== 'voided') return null;
  if (!document.issuedSnapshotSha256) return null;
  const snapshotPath = document.storagePath || documentSnapshotPath(document.id);
  if (!existsSync(snapshotPath)) return null;
  const html = readFileSync(snapshotPath, 'utf8');
  const actualHash = createHash('sha256').update(html, 'utf8').digest('hex');
  if (actualHash !== document.issuedSnapshotSha256) return null;
  return html;
}
import { recordAuditEvent } from "../audit.js";

// Basic mapping from schema to type
function mapDocument(record: typeof schema.generatedDocuments.$inferSelect): GeneratedDocument {
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
    taxYear: record.taxYear,
    taxPayerInn: record.taxPayerInn,
    payload: record.payloadJson ? JSON.parse(record.payloadJson) : null,
    taxPaymentSnapshot: record.taxPaymentSnapshotJson ? JSON.parse(record.taxPaymentSnapshotJson) : null,
    taxXmlSourceSnapshot: record.taxXmlSourceSnapshot,
    taxXmlSnapshot: record.taxXmlSnapshot,
    signatureAttestation: record.signatureAttestation,
    voidAttestation: record.voidAttestation,
    releaseJournalEntry: record.releaseJournalEntry,
    issuedAt: record.issuedAt?.toISOString() ?? null,
    issuedSnapshotSha256: record.issuedSnapshotSha256,
    issuedSnapshotCreatedAt: record.issuedSnapshotCreatedAt?.toISOString() ?? null,
    issuedByUserId: record.issuedByUserId,
    voidedAt: record.voidedAt?.toISOString() ?? null,
    voidedByUserId: record.voidedByUserId,
    createdAt: record.createdAt.toISOString()
  } as GeneratedDocument;
}

export async function getDefaultOrganizationId(): Promise<string | null> {
  const [org] = await db.select().from(schema.organizations).limit(1);
  return org?.id || null;
}

export async function getDocumentsByPatientId(organizationId: string, patientId: string): Promise<GeneratedDocument[]> {
  const records = await db
    .select()
    .from(schema.generatedDocuments)
    .where(and(
      eq(schema.generatedDocuments.organizationId, organizationId),
      eq(schema.generatedDocuments.patientId, patientId)
    ))
    .orderBy(desc(schema.generatedDocuments.createdAt));
  return records.map(mapDocument);
}

export async function getDocumentById(organizationId: string, id: string): Promise<GeneratedDocument | null> {
  const [record] = await db
    .select()
    .from(schema.generatedDocuments)
    .where(and(
      eq(schema.generatedDocuments.organizationId, organizationId),
      eq(schema.generatedDocuments.id, id)
    ));
  return record ? mapDocument(record) : null;
}

const documentTitles: Record<string, string> = {
  medical_record_extract: "Выписка из медицинской карты",
  outpatient_medical_card_025u: "Медицинская карта 025/у",
  dental_medical_card_043u: "Медицинская карта 043/у",
  medical_document_release_receipt: "Расписка о получении",
  medical_record_copy_request: "Заявление о выдаче копии",
  tax_deduction_application: "Заявление на вычет",
  legacy_tax_deduction_certificate: "Справка об оплате мед. услуг",
  tax_deduction_registry: "Реестр для налогового вычета",
  patient_intake_questionnaire: "Анкета о здоровье"
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
  }
): Promise<GeneratedDocument> {
  // Ownership assert: patient (and optional visit) must belong to caller org.
  // Route-layer checks exist, but the query helper is callable from anywhere.
  const [ownedPatient] = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(and(eq(schema.patients.organizationId, organizationId), eq(schema.patients.id, input.patientId)))
    .limit(1);
  if (!ownedPatient) {
    throw new Error("document create: patient does not belong to organization");
  }
  if (input.visitId) {
    const [ownedVisit] = await db
      .select({ id: schema.visits.id })
      .from(schema.visits)
      .where(and(
        eq(schema.visits.organizationId, organizationId),
        eq(schema.visits.id, input.visitId),
        eq(schema.visits.patientId, input.patientId),
      ))
      .limit(1);
    if (!ownedVisit) {
      throw new Error("document create: visit does not belong to organization/patient");
    }
  }
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
      payloadJson: input.payload ? JSON.stringify(input.payload) : null
    })
    .returning();

  if (!record) throw new Error("Failed to create document");

  await recordAuditEvent({
    organizationId,
    entityType: "document",
    entityId: record.id,
    action: "document_created",
    reason: null
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
  column: "issued_by_user_id" | "voided_by_user_id"
): string | null {
  if (value === null) return null;
  const parsed = signerUserIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error(
      `${column}: ожидался UUID сотрудника или null, получено ${JSON.stringify(value)}. ` +
        "Колонка — uuid с внешним ключом на users.id; произвольная строка делает " +
        "документ юридически недостоверным и отвергается Postgres (22P02)."
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
    taxPaymentSnapshot?: TaxPaymentSnapshot | null;
    taxXmlSourceSnapshot?: TaxXmlSourceSnapshot | null;
    totalAmountRub?: number | null;
  }
): Promise<GeneratedDocument | null> {
  const issuedByUserId = signerUserIdForColumn(options.issuedByUserId, "issued_by_user_id");
  const [existing] = await db
    .select()
    .from(schema.generatedDocuments)
    .where(and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId)));

  if (!existing || existing.status === "voided") return null;
  if (existing.status === "issued") return mapDocument(existing);

  const snapshot = options.snapshotHtml ? writeIssuedDocumentSnapshot(existing.id, options.snapshotHtml) : null;

  const [updated] = await db
    .update(schema.generatedDocuments)
    .set({
      status: "issued",
      issuedAt: options.issuedAt ? new Date(options.issuedAt) : new Date(),
      issuedByUserId,
      releaseJournalEntry: options.releaseJournalEntry || null,
      signatureAttestation: options.signatureAttestation || null,
      taxPaymentSnapshotJson: options.taxPaymentSnapshot ? JSON.stringify(options.taxPaymentSnapshot) : existing.taxPaymentSnapshotJson,
      taxXmlSourceSnapshot: options.taxXmlSourceSnapshot || existing.taxXmlSourceSnapshot,
      totalAmountRub: options.totalAmountRub ?? existing.totalAmountRub,
      ...(snapshot ? {
        storagePath: snapshot.snapshotPath,
        issuedSnapshotSha256: snapshot.sha256,
        issuedSnapshotCreatedAt: new Date(snapshot.createdAt)
      } : {})
    })
    .where(and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId)))
    .returning();

  if (!updated) return null;

  await recordAuditEvent({
    organizationId,
    entityType: "document",
    entityId: updated.id,
    action: "document_issued",
    reason: null
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
    voidAttestation?: DocumentVoidAttestation;
  }
): Promise<GeneratedDocument | null> {
  const voidedByUserId = signerUserIdForColumn(options.voidedByUserId, "voided_by_user_id");
  const [existing] = await db
    .select()
    .from(schema.generatedDocuments)
    .where(and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId)));

  if (!existing) return null;
  if (existing.status === "voided") return mapDocument(existing);

  const [updated] = await db
    .update(schema.generatedDocuments)
    .set({
      status: "voided",
      voidedAt: options.voidedAt ? new Date(options.voidedAt) : new Date(),
      voidedByUserId,
      voidAttestation: options.voidAttestation || null
    })
    .where(and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId)))
    .returning();

  if (!updated) return null;

  await recordAuditEvent({
    organizationId,
    entityType: "document",
    entityId: updated.id,
    action: "document_voided",
    reason: null
  });

  return mapDocument(updated);
}

export async function storeTaxXmlSnapshotInDb(
  organizationId: string,
  documentId: string,
  snapshot: Omit<TaxXmlSnapshot, "createdAt" | "sha256"> & Partial<Pick<TaxXmlSnapshot, "createdAt" | "sha256">>
): Promise<any> {
  const completeSnapshot: TaxXmlSnapshot = {
    ...snapshot,
    createdAt: snapshot.createdAt || new Date().toISOString(),
    // БЫЛО: require("crypto") в ES-модуле — ReferenceError при попытке
    // посчитать контрольную сумму налогового XML, то есть сохранение снимка
    // падало ровно тогда, когда хеш не пришёл извне.
    sha256: snapshot.sha256 || createHash("sha256").update(snapshot.xml).digest("hex")
  };
  const [doc] = await db
    .update(schema.generatedDocuments)
    .set({ taxXmlSnapshot: completeSnapshot })
    .where(and(eq(schema.generatedDocuments.organizationId, organizationId), eq(schema.generatedDocuments.id, documentId)))
    .returning();
  return doc;
}

export async function getDocumentRenderContextFromDb(organizationId: string, patientId?: string) {
  // БЫЛО: require(...) внутри ES-модуля. В apps/api объявлен "type": "module",
  // поэтому require здесь не определён — функция падала с ReferenceError при
  // КАЖДОМ вызове. Именно поэтому «Паспорт документа» не мог собрать данные.
  // Динамический import — штатный способ отложенной загрузки в ESM и заодно
  // сохраняет разрыв циклических зависимостей, ради которого это писалось.
  const [
    { getClinicSettingsFromDb },
    { getServiceCatalogForOrganization },
    { getPaymentsByPatientIdInDb },
    { getTreatmentPlanItemsForPatient },
  ] = await Promise.all([
    import('./settingsQuery.js'),
    import('./pricelistQuery.js'),
    import('./billingQuery.js'),
    import('./clinicalQuery.js'),
  ]);
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
    treatmentPlanItems = (await getTreatmentPlanItemsForPatient(organizationId, patientId)).map(
      (item): TreatmentPlanItem => ({
        id: item.id,
        organizationId: item.organizationId,
        patientId: item.patientId,
        visitId: item.visitId ?? null,
        serviceId: item.serviceId ?? "",
        snapshotServiceName: item.title,
        snapshotServiceCategory: null,
        toothCode: item.toothCode ?? null,
        quantity: Math.max(1, Math.round(Number(item.quantity) || 1)),
        unitPriceRub: Math.max(0, item.unitPriceRub),
        discountRub: Math.max(0, item.discountRub),
        status: item.status,
        plannedDoctorUserId: item.plannedDoctorUserId ?? null,
        plannedChairId: item.plannedChairId ?? null,
        notes: item.notes ?? null,
      })
    );
  }
  return { clinicProfile: settings.profile, serviceCatalog, payments, treatmentPlanItems };
}
