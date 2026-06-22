import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { FastifyInstance } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import {
  createDocumentSchema,
  documentAuditFactsSchema,
  documentKindMetadata,
  issueDocumentSchema,
  publicGeneratedDocumentSchema,
  voidDocumentSchema,
  type DocumentIssueSignatureAttestation,
  type DocumentReleaseJournalEntry,
  type DocumentReleaseMaterialKind,
  type GeneratedDocument,
  type ClinicProfile,
  type MedicalDocumentReleaseReceiptPayload,
  type MedicalRecordCopyRequestPayload,
  type MedicalRecordExtractPayload,
  type OutpatientMedicalCard025uPayload,
  type Patient,
  type Payment,
  type TaxPaymentSnapshot,
  type TaxXmlSourceSnapshot,
  type TaxDeductionApplicationPayload,
  type TaxDeductionApplicationRelationship
} from "@dental/shared";
import {
  appointments,
  createGeneratedDocument,
  clinicProfile,
  documents,
  findVisitById,
  issueGeneratedDocument,
  patients,
  payments,
  readIssuedDocumentSnapshot,
  serviceCatalog,
  storeTaxXmlSnapshot,
  treatmentPlanItems,
  voidGeneratedDocument
} from "../sampleData.js";
import {
  paidAmountRubForDocument,
  paymentRefundCorrectionSelectionErrorForDocument,
  paymentReceiptSelectionErrorForDocument,
  plannedAmountRubForDocument,
  taxPaymentSelectionErrorForDocument,
  validateDocumentCreation
} from "../documents/guards.js";
import { documentIssueBlockReason, renderDocumentHtml, taxFiscalDocumentBlockReason } from "../documents/renderDocument.js";
import {
  buildTaxPaymentSnapshotForIssue,
  paymentIdsForTaxDocument,
  receiptKeysForTaxDocument,
  taxDocumentDuplicateSensitive,
  taxDocumentUsesPaymentSnapshot,
  taxPaymentSnapshotTotalRub,
  taxPaymentsForDocumentScope
} from "../documents/taxPaymentSnapshot.js";
import { buildKnd1151156Xml } from "../documents/taxXml.js";
import { repairMojibakeDeep, repairMojibakeText } from "../text/repairMojibake.js";

export function documentAttachmentFileName(document: GeneratedDocument, extension: "html" | "pdf" | "xml"): string {
  return `dente-${document.kind}-${document.id}.${extension}`;
}

export function documentRequiresIssuedArchive(document: GeneratedDocument): boolean {
  return document.status === "issued" || (document.status === "voided" && Boolean(document.issuedAt));
}

export function documentHasIssuedArchiveMetadata(document: GeneratedDocument): boolean {
  return Boolean(document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt);
}

export const issuedArchiveIntegrityError =
  "Архивная копия выданного документа отсутствует или не прошла проверку целостности.";

export function pdfBrowserCandidates(): string[] {
  return [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/microsoft-edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((candidate): candidate is string => Boolean(candidate));
}

const allowedPdfBrowserExecutables = new Set([
  "msedge.exe",
  "microsoft edge",
  "google chrome",
  "microsoft-edge",
  "google-chrome",
  "chromium",
  "chromium-browser",
  "chrome.exe",
  "chrome"
]);

function isSafeBrowserPath(candidate: string): boolean {
  const basename = candidate.split(/[\/]/).pop()?.toLowerCase();
  return basename ? allowedPdfBrowserExecutables.has(basename) : false;
}

export function findPdfBrowserPath(): string | null {
  return pdfBrowserCandidates().find((candidate) => isSafeBrowserPath(candidate) && existsSync(candidate)) ?? null;
}

export function configuredPdfExportTimeoutMs(): number {
  const raw = Number(process.env.DENTE_PDF_EXPORT_TIMEOUT_MS ?? "60000");
  if (!Number.isFinite(raw)) return 60000;
  return Math.min(180000, Math.max(10000, Math.trunc(raw)));
}

export async function readValidPdfFile(pdfPath: string): Promise<Buffer | null> {
  try {
    const pdf = await readFile(pdfPath);
    if (pdf.length >= 512 && pdf.subarray(0, 4).equals(Buffer.from("%PDF"))) return pdf;
  } catch {
    return null;
  }
  return null;
}

export async function renderIssuedHtmlToPdf(html: string): Promise<{ ok: true; pdf: Buffer } | { ok: false; error: string }> {
  const browserPath = findPdfBrowserPath();
  if (!browserPath) {
    return {
      ok: false,
      error: "PDF-экспорт недоступен: на сервере клиники не найден браузер для печати документов. Укажите путь к браузеру в серверных настройках."
    };
  }

  const workDir = await mkdtemp(path.join(os.tmpdir(), "dente-pdf-"));
  const htmlPath = path.join(workDir, "document.html");
  await writeFile(
    htmlPath,
    html.includes("<meta charset=") ? html : html.replace(/<head>/i, '<head><meta charset="utf-8">'),
    "utf8"
  );

  try {
    const timeoutMs = configuredPdfExportTimeoutMs();
    const attempts = [
      { label: "headless-new", headlessFlag: "--headless=new" },
      { label: "headless-classic", headlessFlag: "--headless" }
    ] as const;
    let lastFailure = "PDF-экспорт завершился неизвестной ошибкой.";

    for (const [index, attempt] of attempts.entries()) {
      const profileDir = path.join(workDir, `profile-${index}`);
      const pdfPath = path.join(workDir, `document-${index}.pdf`);
      const result = await new Promise<{ code: number | null; timedOut: boolean; error?: Error }>((resolve) => {
        const child = spawn(
          browserPath,
          [
            attempt.headlessFlag,
            "--disable-gpu",
            "--disable-background-networking",
            "--disable-breakpad",
            "--disable-component-update",
            "--disable-default-apps",
            "--disable-extensions",
            "--disable-features=OptimizationHints,Translate",
            "--disable-dev-shm-usage",
            "--hide-scrollbars",
            "--mute-audio",
            "--no-first-run",
            "--no-default-browser-check",
            "--print-to-pdf-no-header",
            "--run-all-compositor-stages-before-draw",
            "--virtual-time-budget=10000",
            `--user-data-dir=${profileDir}`,
            `--print-to-pdf=${pdfPath}`,
            pathToFileURL(htmlPath).href
          ],
          { stdio: "ignore" }
        );
        let completed = false;
        let timedOut = false;
        const complete = (value: { code: number | null; timedOut: boolean; error?: Error }) => {
          if (completed) return;
          completed = true;
          clearTimeout(timeout);
          resolve(value);
        };
        const timeout = setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, timeoutMs);
        child.once("error", (error) => complete({ code: null, timedOut, error }));
        child.once("exit", (code) => complete({ code, timedOut }));
      });

      const pdf = await readValidPdfFile(pdfPath);
      if (pdf) return { ok: true, pdf };
      if (result.error) {
        lastFailure = "PDF-экспорт не запустил браузер документов. Проверьте путь к браузеру в серверных настройках.";
        continue;
      }
      if (result.timedOut) {
        lastFailure = `PDF-экспорт не завершился за ${Math.round(timeoutMs / 1000)} секунд. Проверьте, что браузер документов запускается на сервере клиники.`;
        continue;
      }
      if (result.code !== 0) {
        lastFailure = "PDF-экспорт завершился с ошибкой браузера документов. Проверьте установку браузера на сервере клиники.";
        continue;
      }
      lastFailure = "PDF-экспорт вернул поврежденный файл. Повторите выгрузку или проверьте сервер печати документов.";
    }

    return { ok: false, error: lastFailure };
  } catch (error) {
    return {
      ok: false,
      error: "PDF-экспорт не завершился. Проверьте права на временную папку сервера и браузер для печати документов."
    };
  } finally {
    await rm(workDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
  }
}

export function normalizedDocumentChainValue(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function normalizedTaxpayerInn(value: string | null | undefined): string {
  return (value ?? "").replace(/\D+/g, "");
}

type TaxCertificateAnnualTaxpayerScope = {
  inn: string;
  identityKey: string;
};

export function paymentAnnualTaxpayerScope(payment: Payment): TaxCertificateAnnualTaxpayerScope {
  const relationship =
    normalizeTaxApplicationRelationship(payment.payerRelationship) ?? normalizedDocumentChainValue(payment.payerRelationship);
  return {
    inn: normalizedTaxpayerInn(payment.payerInn),
    identityKey: [
      normalizedDocumentChainValue(payment.payerFullName),
      normalizedDocumentChainValue(payment.payerBirthDate),
      normalizedDocumentChainValue(payment.payerIdentityDocument),
      relationship
    ].join("|")
  };
}

export function annualTaxpayerScopesForDocument(document: GeneratedDocument): TaxCertificateAnnualTaxpayerScope[] {
  const scopes = new Map<string, TaxCertificateAnnualTaxpayerScope>();
  const addScope = (scope: TaxCertificateAnnualTaxpayerScope) => {
    const key = scope.inn ? `inn:${scope.inn}` : `identity:${scope.identityKey}`;
    if (scope.inn || scope.identityKey.replace(/\|/g, "")) scopes.set(key, scope);
  };

  for (const payment of taxPaymentsForDocumentScope(document, payments)) {
    addScope(paymentAnnualTaxpayerScope(payment));
  }

  const documentInn = normalizedTaxpayerInn(document.taxPayerInn) || normalizedTaxpayerInn(document.taxPaymentSnapshot?.taxPayerInn);
  if (documentInn) {
    addScope({ inn: documentInn, identityKey: "" });
  }

  return [...scopes.values()];
}

export function annualTaxpayerScopesOverlap(
  left: readonly TaxCertificateAnnualTaxpayerScope[],
  right: readonly TaxCertificateAnnualTaxpayerScope[]
): boolean {
  for (const leftScope of left) {
    for (const rightScope of right) {
      if (leftScope.inn && rightScope.inn && leftScope.inn === rightScope.inn) return true;
      if (leftScope.identityKey && rightScope.identityKey && leftScope.identityKey === rightScope.identityKey) return true;
    }
  }
  return false;
}

export function findIssuedDuplicateTaxCertificate(document: GeneratedDocument): GeneratedDocument | null {
  if (!taxDocumentDuplicateSensitive(document.kind) || !document.taxYear) return null;
  const targetAnnualScopes = annualTaxpayerScopesForDocument(document);
  const targetReceiptKeys = receiptKeysForTaxDocument(document, payments);
  const targetPaymentIds = paymentIdsForTaxDocument(document, payments);
  if (!targetAnnualScopes.length && !targetReceiptKeys.size && !targetPaymentIds.size) return null;

  return (
    documents.find((candidate) => {
      if (candidate.id === document.id) return false;
      if (candidate.organizationId !== document.organizationId) return false;
      if (candidate.status !== "issued") return false;
      if (candidate.kind !== document.kind) return false;
      if (candidate.patientId !== document.patientId) return false;
      if (candidate.taxYear !== document.taxYear) return false;

      const candidateAnnualScopes = annualTaxpayerScopesForDocument(candidate);
      if (annualTaxpayerScopesOverlap(targetAnnualScopes, candidateAnnualScopes)) return true;

      const candidateReceiptKeys = receiptKeysForTaxDocument(candidate, payments);
      const candidatePaymentIds = paymentIdsForTaxDocument(candidate, payments);
      return (
        [...candidateReceiptKeys].some((key) => targetReceiptKeys.has(key)) ||
        [...candidatePaymentIds].some((id) => targetPaymentIds.has(id))
      );
    }) ?? null
  );
}

export function taxSnapshotDocument(document: GeneratedDocument, snapshot: TaxPaymentSnapshot | null): GeneratedDocument {
  if (!snapshot) return document;
  return {
    ...document,
    totalAmountRub: taxPaymentSnapshotTotalRub(snapshot),
    taxPaymentSnapshot: snapshot
  };
}

export function cloneSnapshotValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function taxXmlSourceSnapshotSha256(snapshot: TaxXmlSourceSnapshot | null | undefined): string | null {
  if (!snapshot) return null;
  return createHash("sha256").update(JSON.stringify(snapshot), "utf8").digest("hex");
}

export function taxXmlSourceSnapshotForIssue(
  document: GeneratedDocument,
  patient: Patient,
  snapshot: TaxPaymentSnapshot | null,
  issuedAt: string
): TaxXmlSourceSnapshot | null {
  if (document.kind !== "tax_deduction_certificate" || !snapshot) return null;
  return {
    createdAt: issuedAt,
    patient: cloneSnapshotValue(patient),
    clinicProfile: cloneSnapshotValue(clinicProfile),
    payments: snapshot.payments.map((payment) => cloneSnapshotValue(payment))
  };
}

export function frozenTaxXmlPatient(document: GeneratedDocument, fallbackPatient: Patient): Patient {
  return document.taxXmlSourceSnapshot?.patient ?? fallbackPatient;
}

export function frozenTaxXmlClinicProfile(document: GeneratedDocument, fallbackClinicProfile: ClinicProfile): ClinicProfile {
  return document.taxXmlSourceSnapshot?.clinicProfile ?? fallbackClinicProfile;
}

export function frozenTaxXmlPayments(document: GeneratedDocument, fallbackPayments: Payment[]): Payment[] {
  return document.taxXmlSourceSnapshot?.payments ?? fallbackPayments;
}

export function releasedDocumentTypesCoveredByRequest(releasedTypes: readonly string[], requestedTypes: readonly string[]): boolean {
  const requestedValues = new Set(requestedTypes.map((item) => normalizedDocumentChainValue(item)).filter(Boolean));
  return releasedTypes.every((item) => requestedValues.has(normalizedDocumentChainValue(item)));
}

export function comparableDocumentChainDate(value: string | null | undefined): number | null {
  const normalized = (value ?? "").trim();
  if (!normalized) return null;
  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
  if (!datePrefix) return null;
  const year = Number(datePrefix[1]);
  const month = Number(datePrefix[2]);
  const day = Number(datePrefix[3]);
  const parsed = Date.UTC(year, month - 1, day);
  const date = new Date(parsed);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return parsed;
}

export function documentChainDateIsBlankOrValid(value: string | null | undefined): boolean {
  const normalized = (value ?? "").trim();
  return !normalized || comparableDocumentChainDate(normalized) !== null;
}

export function documentChainDateRangeIsChronological(
  periodStart: string | null | undefined,
  periodEnd: string | null | undefined
): boolean {
  const start = comparableDocumentChainDate(periodStart);
  const end = comparableDocumentChainDate(periodEnd);
  if (!documentChainDateIsBlankOrValid(periodStart) || !documentChainDateIsBlankOrValid(periodEnd)) return false;
  return start === null || end === null || start <= end;
}

export function medicalRecordExtractPeriodIsChronological(payload: MedicalRecordExtractPayload): boolean {
  return documentChainDateRangeIsChronological(payload.periodStart, payload.periodEnd);
}

export function medicalRecordExtractDatesAreValid(payload: MedicalRecordExtractPayload): boolean {
  return (
    documentChainDateIsBlankOrValid(payload.periodStart) &&
    documentChainDateIsBlankOrValid(payload.periodEnd) &&
    documentChainDateIsBlankOrValid(payload.issuedAt) &&
    documentChainDateRangeIsChronological(payload.periodStart, payload.periodEnd)
  );
}

export function medicalRecordCopyRequestDatesAreValid(payload: MedicalRecordCopyRequestPayload): boolean {
  return (
    documentChainDateIsBlankOrValid(payload.periodStart) &&
    documentChainDateIsBlankOrValid(payload.periodEnd) &&
    documentChainDateIsBlankOrValid(payload.requestedAt) &&
    documentChainDateRangeIsChronological(payload.periodStart, payload.periodEnd)
  );
}

export function outpatientMedicalCard025uDatesAreValid(payload: OutpatientMedicalCard025uPayload): boolean {
  const dates = [
    payload.openedAt,
    payload.periodStart,
    payload.periodEnd,
    payload.patientBirthDate,
    payload.omsIssuedAt,
    ...payload.chronicDispensaryRegister.map((item) => item.date),
    ...payload.finalDiagnoses.map((item) => item.date),
    ...payload.specialistVisitRecords.map((item) => item.visitDate),
    ...payload.dynamicObservationRecords.map((item) => item.date),
    ...payload.stageEpicrisisRecords.map((item) => item.date),
    ...payload.departmentHeadConsultations.map((item) => item.date),
    ...payload.medicalCommissionRecords.map((item) => item.date),
    ...payload.dispensaryObservationEntries.map((item) => item.date),
    ...payload.hospitalizationRows.map((item) => item.date),
    ...payload.ambulatorySurgeryRows.map((item) => item.date),
    ...payload.xrayDoseRows.map((item) => item.date),
    ...payload.functionalResults.map((item) => item.date),
    ...payload.laboratoryResults.map((item) => item.date)
  ];
  return dates.every(documentChainDateIsBlankOrValid) && documentChainDateRangeIsChronological(payload.periodStart, payload.periodEnd);
}

export function medicalDocumentReleaseReceiptDatesAreValid(payload: MedicalDocumentReleaseReceiptPayload): boolean {
  const deliveredAt = comparableDocumentChainDate(payload.deliveredAt);
  const accessExpiresAt = comparableDocumentChainDate(payload.accessExpiresAt);
  if (
    !documentChainDateIsBlankOrValid(payload.periodStart) ||
    !documentChainDateIsBlankOrValid(payload.periodEnd) ||
    !documentChainDateIsBlankOrValid(payload.deliveredAt) ||
    !documentChainDateIsBlankOrValid(payload.accessExpiresAt)
  ) {
    return false;
  }
  if (!documentChainDateRangeIsChronological(payload.periodStart, payload.periodEnd)) return false;
  if (deliveredAt !== null && accessExpiresAt !== null && accessExpiresAt < deliveredAt) return false;
  return true;
}

export function releaseMaterialKindForDelivery(
  deliveryMethod: DocumentReleaseJournalEntry["deliveryMethod"],
  documentTypes: readonly string[] = [],
  includeDicomSourceData = false
): DocumentReleaseMaterialKind {
  if (deliveryMethod === "dicom_archive") return "dicom_archive";
  if (includeDicomSourceData || documentTypes.some((type) => /dicom|кт|cbct|сним/i.test(type))) return "mixed";
  if (deliveryMethod === "other") return "other";
  return "copy";
}

export function releaseSourceSnapshotSha256(document: GeneratedDocument, scope: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        schema: "dente.medical-release-source.v1",
        scope,
        documentId: document.id,
        organizationId: document.organizationId,
        patientId: document.patientId,
        visitId: document.visitId,
        kind: document.kind,
        status: document.status,
        issuedAt: document.issuedAt ?? null,
        totalAmountRub: document.totalAmountRub ?? null,
        payload: document.payload ?? null
      }),
      "utf8"
    )
    .digest("hex");
}

export function buildMedicalDocumentReleaseJournalEntry(
  document: GeneratedDocument,
  issuedAt: string,
  signatureAttestation: DocumentIssueSignatureAttestation
): DocumentReleaseJournalEntry | null {
  const responsibleStaff = `${signatureAttestation.staffRole} ${signatureAttestation.staffFullName}`.trim();
  if (document.kind === "medical_record_copy_request") {
    const payload = document.payload?.medicalRecordCopyRequest;
    if (!payload) return null;
    return {
      id: randomUUID(),
      entryKind: "request_registered",
      documentId: document.id,
      sourceRequestDocumentId: null,
      organizationId: document.organizationId,
      patientId: document.patientId,
      visitId: document.visitId,
      materialKind: releaseMaterialKindForDelivery(payload.requestedFormat, payload.requestedDocumentTypes, payload.includeDicomSourceData),
      deliveryMethod: payload.requestedFormat,
      documentTypes: payload.requestedDocumentTypes,
      periodStart: payload.periodStart ?? null,
      periodEnd: payload.periodEnd ?? null,
      recipientFullName: payload.recipientFullName,
      recipientIdentityDocument: payload.recipientIdentityDocument,
      recipientAuthority: payload.recipientAuthority,
      deliveredAt: payload.requestedAt,
      retentionPolicy:
        `Запрос зарегистрирован в DENTE; ответственный: ${responsibleStaff}. Фактическая выдача закрывается отдельной распиской о передаче медицинской документации.`,
      sourceSnapshotSha256: releaseSourceSnapshotSha256(document, "copy_request"),
      createdAt: issuedAt,
      createdByUserId: null
    };
  }

  if (document.kind === "medical_record_extract") {
    const payload = document.payload?.medicalRecordExtract;
    if (!payload) return null;
    return {
      id: randomUUID(),
      entryKind: "extract_issued",
      documentId: document.id,
      sourceRequestDocumentId: null,
      organizationId: document.organizationId,
      patientId: document.patientId,
      visitId: document.visitId,
      materialKind: "extract",
      deliveryMethod: "paper",
      documentTypes: ["Выписка из медицинской карты"],
      periodStart: payload.periodStart,
      periodEnd: payload.periodEnd,
      recipientFullName: payload.recipientFullName,
      recipientIdentityDocument: null,
      recipientAuthority: payload.recipientAuthority,
      deliveredAt: payload.issuedAt || issuedAt,
      retentionPolicy: `Выданная выписка и отметка подписания хранятся вместе с неизменяемым HTML/PDF архивом документа; ответственный: ${responsibleStaff}.`,
      sourceSnapshotSha256: releaseSourceSnapshotSha256(document, "medical_record_extract"),
      createdAt: issuedAt,
      createdByUserId: null
    };
  }

  if (document.kind === "medical_document_release_receipt") {
    const payload = document.payload?.medicalDocumentReleaseReceipt;
    if (!payload) return null;
    const sourceRequest = findIssuedMedicalCopyRequestForRelease(document);
    return {
      id: randomUUID(),
      entryKind: "release_completed",
      documentId: document.id,
      sourceRequestDocumentId: payload.sourceRequestDocumentId,
      organizationId: document.organizationId,
      patientId: document.patientId,
      visitId: document.visitId,
      materialKind: releaseMaterialKindForDelivery(payload.releaseChannel, payload.documentTypes),
      deliveryMethod: payload.releaseChannel,
      documentTypes: payload.documentTypes,
      periodStart: payload.periodStart ?? null,
      periodEnd: payload.periodEnd ?? null,
      recipientFullName: payload.recipientFullName,
      recipientIdentityDocument: payload.recipientIdentityDocument,
      recipientAuthority: payload.recipientAuthority,
      deliveredAt: payload.deliveredAt,
      retentionPolicy:
        payload.releaseChannel === "secure_link"
          ? `Защищенная ссылка и срок доступа фиксируются в расписке${payload.accessExpiresAt ? ` до ${payload.accessExpiresAt}` : ""}; ответственный: ${responsibleStaff}.`
          : `Факт передачи, состав документов и канал выдачи хранятся с архивной распиской DENTE; ответственный: ${responsibleStaff}.`,
      sourceSnapshotSha256: sourceRequest?.issuedSnapshotSha256 ?? releaseSourceSnapshotSha256(document, "release_receipt"),
      createdAt: issuedAt,
      createdByUserId: null
    };
  }

  return null;
}

export function releasePeriodCoveredByRequest(
  release: MedicalDocumentReleaseReceiptPayload,
  request: MedicalRecordCopyRequestPayload
): boolean {
  if (!medicalDocumentReleaseReceiptDatesAreValid(release) || !medicalRecordCopyRequestDatesAreValid(request)) return false;
  const requestStart = comparableDocumentChainDate(request.periodStart);
  const requestEnd = comparableDocumentChainDate(request.periodEnd);
  const releaseStart = comparableDocumentChainDate(release.periodStart);
  const releaseEnd = comparableDocumentChainDate(release.periodEnd);

  if (requestStart !== null && (releaseStart === null || releaseStart < requestStart)) return false;
  if (requestEnd !== null && (releaseEnd === null || releaseEnd > requestEnd)) return false;
  return true;
}

export function taxCertificateExpectedApplicationForm(document: GeneratedDocument): TaxDeductionApplicationPayload["requestedForm"] | null {
  if (document.kind === "tax_deduction_certificate") return "knd_1151156";
  if (document.kind === "tax_deduction_registry") return "knd_1151156";
  if (document.kind === "legacy_tax_deduction_certificate") return "legacy_2021_2023";
  return null;
}

export function normalizeTaxApplicationRelationship(value: string | null | undefined): TaxDeductionApplicationRelationship | null {
  const normalized = normalizedDocumentChainValue(value);
  if (!normalized) return null;
  if (["self", "patient", "пациент", "сам", "сама", "лично"].includes(normalized)) return "self";
  if (["spouse", "супруг", "супруга", "муж", "жена"].includes(normalized)) return "spouse";
  if (["parent", "родитель", "мать", "отец", "мама", "папа"].includes(normalized)) return "parent";
  if (["child", "сын", "дочь", "ребенок", "ребёнок"].includes(normalized)) return "child";
  if (["ward", "опекун", "попечитель", "подопечный"].includes(normalized)) return "ward";
  return null;
}

export function paymentMatchesTaxApplication(payment: Payment, application: TaxDeductionApplicationPayload): boolean {
  return (
    normalizedDocumentChainValue(payment.payerInn) === normalizedDocumentChainValue(application.taxpayerInn) &&
    normalizedDocumentChainValue(payment.payerFullName) === normalizedDocumentChainValue(application.taxpayerFullName) &&
    normalizedDocumentChainValue(payment.payerBirthDate) === normalizedDocumentChainValue(application.taxpayerBirthDate) &&
    normalizedDocumentChainValue(payment.payerIdentityDocument) === normalizedDocumentChainValue(application.taxpayerIdentityDocument) &&
    normalizeTaxApplicationRelationship(payment.payerRelationship) === application.relationshipToPatient
  );
}

export function taxApplicationMatchesSelectedPayments(paymentsForDocument: Payment[], application: TaxDeductionApplicationPayload): boolean {
  const applicationPaymentIds = application.selectedPaymentIds ?? [];
  if (!applicationPaymentIds.length) return true;
  const documentPaymentIds = new Set(paymentsForDocument.map((payment) => payment.id));
  if (documentPaymentIds.size !== applicationPaymentIds.length) return false;
  return applicationPaymentIds.every((paymentId) => documentPaymentIds.has(paymentId));
}

export function hasIssuedTaxApplicationForCertificate(document: GeneratedDocument): boolean {
  const expectedForm = taxCertificateExpectedApplicationForm(document);
  if (!expectedForm || !document.taxYear) return false;
  const taxPayments = taxPaymentsForDocumentScope(document, payments);
  if (!taxPayments.length) return false;

  return documents.some((candidate) => {
    const application = candidate.payload?.taxDeductionApplication;
    if (!application) return false;
    if (candidate.status !== "issued") return false;
    if (candidate.kind !== "tax_deduction_application") return false;
    if (candidate.organizationId !== document.organizationId) return false;
    if (candidate.patientId !== document.patientId) return false;
    if (application.requestedTaxYear !== document.taxYear) return false;
    if (application.requestedForm !== expectedForm) return false;
    if (
      document.taxPayerInn &&
      normalizedDocumentChainValue(application.taxpayerInn) !== normalizedDocumentChainValue(document.taxPayerInn)
    ) {
      return false;
    }
    if (!taxApplicationMatchesSelectedPayments(taxPayments, application)) return false;
    return taxPayments.every((payment) => paymentMatchesTaxApplication(payment, application));
  });
}

export function releaseReceiptMatchesCopyRequest(
  release: MedicalDocumentReleaseReceiptPayload,
  request: MedicalRecordCopyRequestPayload
): boolean {
  return (
    normalizedDocumentChainValue(release.recipientFullName) === normalizedDocumentChainValue(request.recipientFullName) &&
    normalizedDocumentChainValue(release.recipientIdentityDocument) === normalizedDocumentChainValue(request.recipientIdentityDocument) &&
    normalizedDocumentChainValue(release.recipientAuthority) === normalizedDocumentChainValue(request.recipientAuthority) &&
    release.releaseChannel === request.requestedFormat &&
    releasedDocumentTypesCoveredByRequest(release.documentTypes, request.requestedDocumentTypes) &&
    releasePeriodCoveredByRequest(release, request)
  );
}

export function findIssuedMedicalCopyRequestForRelease(document: GeneratedDocument): GeneratedDocument | null {
  const release = document.payload?.medicalDocumentReleaseReceipt;
  if (!release) return null;
  const sourceRequestDocumentId = release.sourceRequestDocumentId;
  return (
    documents.find((candidate) => {
      const request = candidate.payload?.medicalRecordCopyRequest;
      if (!request) return false;
      return (
        candidate.id === sourceRequestDocumentId &&
        candidate.status === "issued" &&
        candidate.kind === "medical_record_copy_request" &&
        candidate.organizationId === document.organizationId &&
        candidate.patientId === document.patientId &&
        releaseReceiptMatchesCopyRequest(release, request)
      );
    }) ?? null
  );
}

export function hasIssuedMedicalCopyRequestForRelease(document: GeneratedDocument): boolean {
  return Boolean(findIssuedMedicalCopyRequestForRelease(document));
}

export function completedWorksActMatchesIssuedContract(document: GeneratedDocument): boolean {
  const act = document.payload?.completedWorksAct;
  if (!act) return false;
  return documents.some((candidate) => {
    const contract = candidate.payload?.paidMedicalServicesContract;
    if (!contract) return false;
    if (candidate.id !== act.linkedContractDocumentId) return false;
    if (candidate.status !== "issued") return false;
    if (candidate.kind !== "paid_medical_services_contract") return false;
    if (candidate.organizationId !== document.organizationId) return false;
    if (candidate.patientId !== document.patientId) return false;
    if (candidate.visitId !== document.visitId) return false;
    return normalizedDocumentChainValue(act.contractNumber).includes(normalizedDocumentChainValue(contract.contractNumber));
  });
}

export function medicalRecordExtractVisitDate(visitId: string): number | null {
  const visit = findVisitById(visitId);
  if (!visit) return null;
  const appointment = visit.appointmentId ? appointments.find((candidate) => candidate.id === visit.appointmentId) : null;
  return (
    comparableDocumentChainDate(appointment?.startsAt) ??
    comparableDocumentChainDate(visit.updatedAt) ??
    comparableDocumentChainDate(visit.createdAt)
  );
}

export function signedMedicalSourceVisitsAreValid(
  sourceVisitIds: readonly string[],
  document: GeneratedDocument,
  periodStartRaw: string | null | undefined,
  periodEndRaw: string | null | undefined
): boolean {
  const periodStart = comparableDocumentChainDate(periodStartRaw);
  const periodEnd = comparableDocumentChainDate(periodEndRaw);
  if (!documentChainDateRangeIsChronological(periodStartRaw, periodEndRaw)) return false;
  return sourceVisitIds.every((visitId) => {
    const visit = findVisitById(visitId);
    if (!visit || visit.patientId !== document.patientId || visit.status !== "signed") return false;

    const visitDate = medicalRecordExtractVisitDate(visitId);
    if (visitDate === null) return false;
    if (periodStart !== null && visitDate < periodStart) return false;
    if (periodEnd !== null && visitDate > periodEnd) return false;
    return true;
  });
}

export function medicalRecordExtractSourcesAreValid(payload: MedicalRecordExtractPayload, document: GeneratedDocument): boolean {
  return signedMedicalSourceVisitsAreValid(payload.sourceVisitIds, document, payload.periodStart, payload.periodEnd);
}

export function outpatientMedicalCard025uSourcesAreValid(payload: OutpatientMedicalCard025uPayload, document: GeneratedDocument): boolean {
  if (!payload.sourceVisitIds.length || !payload.specialistVisitRecords.length) return false;
  const sourceIds = new Set(payload.sourceVisitIds);
  if (payload.specialistVisitRecords.some((record) => !sourceIds.has(record.sourceVisitId))) return false;
  return signedMedicalSourceVisitsAreValid(payload.sourceVisitIds, document, payload.periodStart, payload.periodEnd);
}

export function documentRenderContext() {
  return { clinicProfile, payments, serviceCatalog, treatmentPlanItems };
}

export function apiError(message: string, error = "DocumentOperationRejected") {
  return {
    error,
    message: repairMojibakeText(message)
  };
}

export const documentCreateValidationMessage =
  "Документ не создан: выберите пациента, тип документа и заполните обязательные поля формы.";
export const documentIssueValidationMessage =
  "Документ не выдан: подтвердите подпись или получение, проверку личности и ответственного сотрудника.";
export const documentVoidValidationMessage =
  "Документ не аннулирован: укажите причину, ответственного сотрудника, архив и проверку статуса.";

export function objectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function documentCreateValidationMessageForRequest(body: unknown): string {
  const input = objectRecord(body);
  const payload = objectRecord(input?.payload);
  const application = objectRecord(payload?.taxDeductionApplication);
  const taxpayerInn = typeof application?.taxpayerInn === "string" ? application.taxpayerInn.replace(/\D+/g, "") : "";

  if (application?.requestedForm === "knd_1151156" && taxpayerInn.length > 0 && taxpayerInn.length !== 12) {
    return "Документ не создан: для заявления на КНД 1151156 нужен 12-значный ИНН физического лица.";
  }

  return documentCreateValidationMessage;
}

export function configuredTaxOfficeCode(): string | null {
  return process.env.DENTE_FNS_TAX_OFFICE_CODE?.trim() || process.env.FNS_TAX_OFFICE_CODE?.trim() || null;
}

export function documentIssueChainBlockReason(document: GeneratedDocument): string | null {
  if (taxCertificateExpectedApplicationForm(document) && !hasIssuedTaxApplicationForCertificate(document)) {
    return "Перед выдачей налогового документа нужно выпустить заявление налогоплательщика с тем же годом, формой, ИНН, реквизитами плательщика и точным набором выбранных фискальных чеков.";
  }

  const copyRequest = document.payload?.medicalRecordCopyRequest;
  if (document.kind === "medical_record_copy_request" && copyRequest && !medicalRecordCopyRequestDatesAreValid(copyRequest)) {
    return "Запрос копии медицинских документов нельзя выдать: даты запроса или периода указаны в нераспознаваемом формате либо период указан в обратном порядке.";
  }

  const releaseReceipt = document.payload?.medicalDocumentReleaseReceipt;
  if (document.kind === "medical_document_release_receipt" && releaseReceipt) {
    if (!medicalDocumentReleaseReceiptDatesAreValid(releaseReceipt)) {
      return "Расписку о выдаче медицинских документов нельзя выдать: даты выдачи, доступа или периода указаны в нераспознаваемом формате либо период указан в обратном порядке.";
    }
    if (!hasIssuedMedicalCopyRequestForRelease(document)) {
      return "Перед распиской о выдаче медицинских документов нужно выбрать конкретный уже выданный запрос пациента или представителя с тем же получателем, форматом, периодом и не меньшим составом документов.";
    }
  }

  if (document.kind === "completed_works_act" && !completedWorksActMatchesIssuedContract(document)) {
    return "Перед выдачей акта нужно выбрать конкретный уже выданный договор платных медицинских услуг по этому пациенту и визиту.";
  }

  const card025u = document.payload?.outpatientMedicalCard025u;
  if (document.kind === "outpatient_medical_card_025u" && card025u) {
    if (!outpatientMedicalCard025uDatesAreValid(card025u)) {
      return "Карту 025/у нельзя выдать: даты открытия, периода, записей или результатов указаны в нераспознаваемом формате либо период указан в обратном порядке.";
    }
    if (!outpatientMedicalCard025uSourcesAreValid(card025u, document)) {
      return "Карту 025/у нельзя выдать: исходные визиты не найдены, принадлежат другому пациенту, не подписаны врачом, не входят в период карты или запись врача ссылается на отсутствующий источник.";
    }
  }

  const extract = document.payload?.medicalRecordExtract;
  if (document.kind === "medical_record_extract" && extract) {
    if (!medicalRecordExtractDatesAreValid(extract)) {
      return "Выписку нельзя выдать: даты периода или выдачи указаны в нераспознаваемом формате либо период указан в обратном порядке.";
    }
    if (!medicalRecordExtractPeriodIsChronological(extract)) {
      return "Выписку нельзя выдать: период выписки указан в обратном порядке.";
    }
    if (!medicalRecordExtractSourcesAreValid(extract, document)) {
      return "Выписку нельзя выдать: один или несколько исходных приемов не найдены, принадлежат другому пациенту, еще не подписаны врачом или не входят в период выписки.";
    }
  }

  return null;
}

export function buildDocumentAuditFacts(document: GeneratedDocument, patient: (typeof patients)[number]) {
  const renderContext = documentRenderContext();
  const issueBlockReason =
    document.status === "draft" ? documentIssueBlockReason(document, patient, renderContext) ?? documentIssueChainBlockReason(document) : null;
  const issuedArchiveRequired = documentRequiresIssuedArchive(document);
  const issuedSnapshot = readIssuedDocumentSnapshot(document);
  const immutableSnapshotReady = Boolean(issuedSnapshot && documentHasIssuedArchiveMetadata(document) && issuedArchiveRequired);
  const hasIssueSignatureAttestation = Boolean(document.signatureAttestation);
  const blockers = [
    issueBlockReason,
    issuedArchiveRequired && !immutableSnapshotReady
      ? "Архивная HTML-копия выданного документа отсутствует или не прошла проверку sha256."
      : null,
    issuedArchiveRequired && !hasIssueSignatureAttestation
      ? "Для PDF/XML выгрузки нужна отметка подписания и получения документа."
      : null
  ]
    .filter((value): value is string => Boolean(value))
    .map(repairMojibakeText);
  const warnings = [
    document.status === "draft" ? "Документ еще не выдан. HTML доступен как предпросмотр, но не как архивная копия." : null,
    document.status === "voided" ? "Документ аннулирован. Архивная копия сохранена только для проверки истории выдачи." : null,
    document.status === "voided" && document.voidAttestation ? `Причина аннулирования: ${document.voidAttestation.reasonText}` : null,
    document.kind === "tax_deduction_certificate"
      ? "XML КНД выгружается как проверяемый файл данных. Подпись, отправка в ФНС и XSD-валидация должны выполняться отдельным контуром."
      : null
  ]
    .filter((value): value is string => Boolean(value))
    .map(repairMojibakeText);
  const metadata = documentKindMetadata[document.kind];
  const htmlPreviewUrl = `/api/documents/${document.id}/html`;
  const htmlDownloadUrl = immutableSnapshotReady ? `${htmlPreviewUrl}?download=1` : null;
  const pdfDownloadUrl = immutableSnapshotReady && hasIssueSignatureAttestation ? `/api/documents/${document.id}/pdf` : null;
  const canExportFnsXml =
    document.kind === "tax_deduction_certificate" &&
    document.status === "issued" &&
    immutableSnapshotReady &&
    hasIssueSignatureAttestation &&
    blockers.length === 0;
  const taxXmlSourceSnapshotDigest = taxXmlSourceSnapshotSha256(document.taxXmlSourceSnapshot);
  const taxXmlOfficialValidationStatus =
    document.kind === "tax_deduction_certificate" && Boolean(taxXmlSourceSnapshotDigest || document.taxXmlSnapshot)
      ? "external_validation_required"
      : "not_applicable";
  const taxXmlOfficialValidationNote =
    taxXmlOfficialValidationStatus === "external_validation_required"
      ? "DENTE хранит только черновик XML и внутреннюю предпроверку. Официальная XSD-валидация, КЭП и отправка ЭДО/ТКС выполняются вне DENTE."
      : null;

  return documentAuditFactsSchema.parse({
    documentId: document.id,
    organizationId: document.organizationId,
    patientId: document.patientId,
    visitId: document.visitId,
    kind: document.kind,
    title: document.title,
    status: document.status,
    issuedAt: document.issuedAt,
    issuedByUserId: document.issuedByUserId ?? null,
    signatureAttestation: document.signatureAttestation ?? null,
    voidAttestation: document.voidAttestation ?? null,
    releaseJournalEntry: document.releaseJournalEntry ?? null,
    generatedAt: new Date().toISOString(),
    snapshotSha256: document.issuedSnapshotSha256 ?? null,
    snapshotCreatedAt: document.issuedSnapshotCreatedAt ?? null,
    immutableSnapshotReady,
    canPreviewHtml: blockers.length === 0 || immutableSnapshotReady,
    canDownloadHtml: Boolean(htmlDownloadUrl),
    canExportPdf: Boolean(pdfDownloadUrl),
    canExportFnsXml,
    htmlPreviewUrl,
    htmlDownloadUrl,
    pdfDownloadUrl,
    taxXmlDownloadUrl: canExportFnsXml ? `/api/documents/${document.id}/tax-xml` : null,
    taxXmlSourceSnapshotSha256: taxXmlSourceSnapshotDigest,
    taxXmlSnapshotSha256: document.taxXmlSnapshot?.sha256 ?? null,
    taxXmlSnapshotCreatedAt: document.taxXmlSnapshot?.createdAt ?? null,
    taxXmlOfficialValidationStatus,
    taxXmlOfficialValidationNote,
    sourceStatus: metadata.sourceStatus,
    sourceAuthority: metadata.sourceAuthority,
    sourceReference: metadata.sourceReference,
    sourceNote: metadata.sourceNote,
    sourceCheckedAt: metadata.sourceCheckedAt,
    sourceUrls: [...metadata.sourceUrls],
    blockers,
    warnings
  });
}

export { documentIssueBlockReason, renderDocumentHtml, taxFiscalDocumentBlockReason };
import { register as registerCreate } from "./documents/create.js";
import { register as registerIssue } from "./documents/issue.js";
import { register as registerVoid } from "./documents/void.js";
import { register as registerTaxXml } from "./documents/taxXml.js";
import { register as registerAuditFacts } from "./documents/auditFacts.js";
import { register as registerPdf } from "./documents/pdf.js";
import { register as registerHtml } from "./documents/html.js";

export async function registerDocumentRoutes(app: FastifyInstance) {
  await registerCreate(app);
  await registerIssue(app);
  await registerVoid(app);
  await registerTaxXml(app);
  await registerAuditFacts(app);
  await registerPdf(app);
  await registerHtml(app);
}
