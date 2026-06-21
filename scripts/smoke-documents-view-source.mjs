import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const documentsSource = readFileSync("apps/web/src/DocumentsView.tsx", "utf8");
const mainCssSource = readFileSync("apps/web/src/styles/main.css", "utf8");
const renderDocumentSource = readFileSync("apps/api/src/documents/renderDocument.ts", "utf8");
const documentsRoutesSource = readFileSync("apps/api/src/routes/documents.ts", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

const releaseSourceSelectBlock = /<select[\s\S]*?value=\{selectedReleaseSourceRequestDocumentId\}[\s\S]*?<\/select>/.exec(
  documentsSource
)?.[0] ?? "";

requireIn(appSource, 'lazy(() => import("./DocumentsView")', "App.tsx must lazy-load DocumentsView.");
requireIn(appSource, "<DocumentsView", "App.tsx must render the lazy documents boundary.");
requireIn(appSource, 'aria-busy="true"', "Documents route fallback must expose loading state.");
requireIn(appSource, "requestFailureMessage", "App.tsx must convert document network failures into visible errors.");
requireIn(appSource, "const [documentCreateSavingKind, setDocumentCreateSavingKind]", "App.tsx must guard duplicate document creation.");
requireIn(appSource, "const [documentStatusSavingId, setDocumentStatusSavingId]", "App.tsx must guard duplicate document status actions.");
requireIn(appSource, "setDocumentCreateSavingKind(kind)", "Document creation must mark the active kind as saving.");
requireIn(appSource, "setDocumentStatusSavingId(documentId)", "Document issue/void must mark the active document as saving.");
requireIn(appSource, "const [postVisitPresetFeedback, setPostVisitPresetFeedback]", "Post-visit preset changes must have visible feedback state.");
requireIn(appSource, "Текст не перезаписан, потому что есть ручные правки", "Post-visit topic changes must explain why manual edits block preset replacement.");
requireIn(appSource, "Памятка для темы", "Forced post-visit preset replacement must confirm the applied template.");
requireIn(appSource, 'requestFailureMessage("Документ не создан", error)', "Document creation must catch network failures.");
requireIn(appSource, 'requestFailureMessage("HTML документа не открыт", error)', "Document HTML open must catch network failures.");
requireIn(appSource, 'requestFailureMessage("PDF не сформирован", error)', "Document PDF export must catch network failures.");
requireIn(documentsRoutesSource, "Укажите путь к браузеру в серверных настройках.", "Document PDF export errors must explain browser setup without env names.");
requireIn(documentsRoutesSource, "Проверьте права на временную папку сервера и браузер для печати документов.", "Document PDF export catch-all errors must be operator-readable.");
forbidIn(documentsRoutesSource, "${result.error.message}", "Document PDF export errors must not expose raw spawn exception text.");
forbidIn(documentsRoutesSource, "(${attempt.label})", "Document PDF export errors must not expose headless browser attempt labels.");
requireIn(appSource, 'setError("Выдать можно только черновик документа.")', "Document issue request guard must explain invalid status.");
requireIn(appSource, 'setError("Документ уже аннулирован.")', "Document void request guard must explain invalid status.");
forbidIn(appSource, 'className="document-factory"', "App.tsx must not inline the heavy document factory.");
forbidIn(appSource, 'className="document-list"', "App.tsx must not inline the document list.");
forbidIn(appSource, "documentFactoryGroups.map((group)", "App.tsx must not keep document catalog rendering.");

requireIn(documentsSource, "export function DocumentsView", "DocumentsView must export the route component.");
requireIn(documentsSource, '<div className="panel documents-panel" id="documents">', "DocumentsView must own panel markup.");
requireIn(documentsSource, 'className="document-factory"', "DocumentsView must own document creation controls.");
requireIn(documentsSource, 'className="document-list"', "DocumentsView must own generated document list.");
requireIn(documentsSource, "confirmDocumentIssue", "DocumentsView must preserve document issue confirmation.");
requireIn(documentsSource, "confirmDocumentVoid", "DocumentsView must preserve document void confirmation.");
requireIn(documentsSource, "downloadTaxDocumentXml", "DocumentsView must preserve KND XML export action.");
requireIn(documentsSource, "documentAuditFacts", "DocumentsView must preserve issue passport/audit UI.");
requireIn(documentsSource, "метки подписанных визитов, по одной в строке", "Medical record extract must ask for operator-readable visit markers instead of internal IDs.");
requireIn(documentsSource, "метки визитов или номера записей, по одной в строке", "Medical copy request must ask for operator-readable visit markers instead of internal IDs.");
requireIn(documentsSource, "Расписка будет привязана к выбранному запросу.", "Medical release receipt must describe source request binding without internal ID wording.");
requireIn(documentsSource, "номер чека или данные фискального чека", "Refund correction receipt placeholder must explain fiscal receipt data in administrator language.");
requireIn(documentsSource, "Контрольная метка", "Document audit UI must label hashes as control markers for administrators.");
requireIn(documentsSource, "documentIssueMissingSteps", "DocumentsView must explain why document issue is blocked.");
requireIn(documentsSource, "documentVoidMissingSteps", "DocumentsView must explain why document void is blocked.");
requireIn(documentsSource, "document-confirmation-missing", "DocumentsView must render missing confirmation steps.");
requireIn(documentsSource, 'const documentIssueMissingGuidanceId = "document-issue-missing-guidance"', "Document issue confirmation guidance must use a stable id.");
requireIn(documentsSource, 'const documentVoidMissingGuidanceId = "document-void-missing-guidance"', "Document void confirmation guidance must use a stable id.");
requireIn(documentsSource, "id={documentIssueMissingGuidanceId}", "Document issue missing steps must be addressable.");
requireIn(documentsSource, "id={documentVoidMissingGuidanceId}", "Document void missing steps must be addressable.");
requireIn(documentsSource, "aria-describedby={!documentIssueAttestationReady ? documentIssueMissingGuidanceId : undefined}", "Document issue confirm button must point to missing-step guidance.");
requireIn(documentsSource, "aria-describedby={!documentVoidReady ? documentVoidMissingGuidanceId : undefined}", "Document void confirm button must point to missing-step guidance.");
requireIn(documentsSource, "documentCreateSavingKind", "DocumentsView must receive document creation busy state.");
requireIn(documentsSource, "documentStatusSavingId", "DocumentsView must receive document status busy state.");
requireIn(documentsSource, "postVisitPresetFeedback", "DocumentsView must render post-visit preset feedback.");
requireIn(documentsSource, "const documentActionContext = `${documentActionLabel}: ${documentKindLabel}${documentTaxYearContext}`;", "Document list actions must compute one operator-readable context.");
requireIn(documentsSource, "const documentAuditLoading = documentAuditFactsLoadingId === document.id;", "Document passport buttons must compute one loading state.");
requireIn(documentsSource, "const documentStatusSaving = documentStatusSavingId === document.id;", "Document issue and void buttons must compute one saving state.");
requireIn(documentsSource, "function documentRowLifecycleGuidance(document: GeneratedDocument): string", "Document rows must explain preview/download/void behavior.");
requireIn(documentsSource, "const documentLifecycleGuidanceId = `document-lifecycle-guidance-${document.id}`;", "Document rows must use stable per-row guidance ids.");
requireIn(documentsSource, "const documentArchiveAvailable =", "Document rows must compute archive availability once for HTML/PDF actions.");
requireIn(
  documentsSource,
  "Boolean(document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt)",
  "Document archive actions must require both snapshot hash and created-at metadata."
);
requireIn(documentsSource, "Паспорт покажет источник, блокеры и доступные действия", "Draft document rows must explain passport recovery guidance.");
requireIn(documentsSource, "Паспорт показывает подпись, контрольную метку, журнал выдачи", "Issued document rows must explain passport/audit content.");
requireIn(documentsSource, "Аннулирование потребует причину и подтверждение архива", "Issued document rows must explain void gate before operators tap it.");
requireIn(documentsSource, "Аннулировано: Открыть и Скачать остаются архивной копией", "Voided document rows must explain archive-only recovery.");
requireIn(documentsSource, 'className="document-row-guidance"', "Document rows must render visible lifecycle guidance.");
requireIn(documentsSource, "aria-describedby={documentLifecycleGuidanceId}", "Document row actions must point to lifecycle guidance.");
requireIn(documentsSource, "aria-label={`Действия с документом: ${documentActionContext}`}", "Document action groups must be named for compact/mobile assistive navigation.");
requireIn(documentsSource, "aria-label={`Открыть HTML документа: ${documentActionContext}`}", "Document open buttons must name the exact document.");
requireIn(documentsSource, "title={`Открыть HTML документа: ${documentActionContext}`}", "Document open buttons must expose the exact document in their hover hint.");
requireIn(documentsSource, "aria-label={`Открыть паспорт выдачи: ${documentActionContext}`}", "Document passport buttons must name the exact document.");
requireIn(documentsSource, "aria-busy={documentAuditLoading || undefined}", "Document passport buttons must expose loading state.");
requireIn(documentsSource, "aria-label={`Скачать HTML документа: ${documentActionContext}`}", "Document HTML download buttons must name the exact document.");
requireIn(documentsSource, "aria-label={`Скачать PDF документа: ${documentActionContext}`}", "Document PDF download buttons must name the exact document.");
requireIn(documentsSource, "aria-label={`Скачать черновой файл ФНС: ${documentActionContext}`}", "Document tax XML buttons must name the exact document.");
requireIn(documentsSource, "aria-label={`Проверить и выдать документ: ${documentActionContext}`}", "Document issue buttons must name the exact document.");
requireIn(documentsSource, "aria-label={`Аннулировать документ: ${documentActionContext}`}", "Document void buttons must name the exact document.");
requireIn(documentsSource, "disabled={documentStatusSaving}", "Document issue and void buttons must share the computed saving state.");
requireIn(documentsSource, "type Payment", "DocumentsView must type payment lists used by tax, receipt, and refund document payloads.");
requireIn(documentsSource, "type TaxDeductionApplicationRelationship", "DocumentsView must type tax application select options.");
requireIn(documentsSource, "type XrayCbctReferralStudyType", "DocumentsView must type x-ray referral select options.");
requireIn(documentsSource, "type TaxDocumentPayerOption", "DocumentsView must preserve the payer option contract for KND tax documents.");
requireIn(documentsSource, "typedEligibleTaxPayments", "DocumentsView must not render tax payment rows from untyped props.");
requireIn(documentsSource, "typedEligiblePaymentReceiptPayments", "DocumentsView must not render payment receipt rows from untyped props.");
requireIn(documentsSource, "typedEligibleRefundCorrectionPayments", "DocumentsView must not render refund source payments from untyped props.");
requireIn(documentsSource, "typedActiveIssuedPaidContracts", "DocumentsView must not link completion acts to untyped contract documents.");
requireIn(documentsSource, "typedIssuedMedicalCopyRequestDocuments", "DocumentsView must not link medical release receipts to untyped request documents.");
requireIn(documentsSource, "type MedicalCopyRequestSourceDocument", "DocumentsView must type medical release receipt source summaries.");
requireIn(documentsSource, "function releaseSourceRequestOptionLabel", "Medical release receipt source options must use a dedicated operator-readable label.");
requireIn(documentsSource, "request?.recipientFullName?.trim()", "Medical release receipt source options must include the recipient instead of raw storage identity.");
requireIn(documentsSource, "medicalDocumentReleaseChannelLabels[request.requestedFormat]", "Medical release receipt source options must include the requested delivery channel.");
requireIn(releaseSourceSelectBlock, "releaseSourceRequestOptionLabel(document)", "Medical release receipt source select must render operator-readable request labels.");
forbidIn(releaseSourceSelectBlock, "document.id.slice(0, 8)", "Medical release receipt source select must not expose raw document ids.");
requireIn(documentsSource, "typedPatientIntakePregnancyStatusOptions", "DocumentsView must keep medical intake option values typed.");
requireIn(documentsSource, "document-action-guidance", "Post-visit preset feedback must use visible guidance styling.");
requireIn(documentsSource, "role={postVisitPresetFeedback ? \"status\" : undefined}", "Post-visit preset feedback must be announced to assistive tech.");
requireIn(documentsSource, "latestDocumentOpenGuidanceId", "DocumentsView must name the empty latest-document guidance.");
requireIn(documentsSource, "aria-describedby={!activeUsableDocuments[0] ? latestDocumentOpenGuidanceId : undefined}", "Open-latest document button must point to guidance when disabled.");
requireIn(documentsSource, "Последних документов пока нет", "DocumentsView must explain why the latest-document button is disabled.");
requireIn(documentsSource, "document-open-guidance", "DocumentsView must render visible guidance for an empty latest-document state.");
requireIn(documentsSource, "aria-busy={isSelectedDocumentCreating || undefined}", "Selected document creation button must expose busy state.");
requireIn(documentsSource, "disabled={Boolean(documentCreateSavingKind)}", "Document creation buttons must prevent duplicate submits.");
requireIn(documentsSource, "disabled={!documentIssueAttestationReady || documentIssueSaving}", "Document issue confirm must prevent duplicate submits.");
requireIn(documentsSource, "disabled={!documentVoidReady || documentVoidSaving}", "Document void confirm must prevent duplicate submits.");
requireIn(documentsSource, "Record<DocumentKind, DocumentKindMetadata>", "DocumentsView must use typed document metadata.");
requireIn(mainCssSource, ".document-row-guidance", "Document lifecycle guidance must have a dedicated compact/mobile style.");
requireIn(mainCssSource, "overflow-wrap: anywhere;", "Document lifecycle guidance must wrap long legal/source text on mobile.");
forbidIn(documentsSource, "documentKindMetadata = sharedDocumentKindMetadata as Record<string, any>", "DocumentsView must not erase document metadata typing.");
forbidIn(documentsSource, "(payment: any)", "DocumentsView must not type payment iterators as any.");
forbidIn(documentsSource, "(document: any)", "DocumentsView must not type document iterators as any.");
forbidIn(documentsSource, "(option: any)", "DocumentsView must not type select option iterators as any.");
forbidIn(documentsSource, "ID подписанных визитов, по одному в строке", "DocumentsView must not expose internal ID wording in medical record extract placeholders.");
forbidIn(documentsSource, "ID визитов или номера записей, по одному в строке", "DocumentsView must not expose internal ID wording in medical copy request placeholders.");
forbidIn(documentsSource, "привязана к нему по ID", "DocumentsView must not explain medical release binding through internal IDs.");
forbidIn(documentsSource, 'paymentFiscalReceiptNumber || "ФН/ФД/ФП"', "DocumentsView must not leave unexplained fiscal receipt abbreviations as the only placeholder.");
forbidIn(documentsSource, "<span>sha256</span>", "DocumentsView must not show raw hash algorithm labels to operators.");

requireIn(renderDocumentSource, "архив исходных снимков", "Rendered documents must use patient-facing image archive wording.");
requireIn(renderDocumentSource, "Исходные файлы снимков", "Rendered medical copy requests must avoid technical DICOM-data wording.");
requireIn(
  renderDocumentSource,
  "КТ и рентген выдаются как исходные медицинские файлы",
  "Rendered medical copy checklists must explain image delivery in plain clinical language."
);
requireIn(renderDocumentSource, "исходные файлы снимков", "Rendered x-ray referrals must use plain source-image wording.");
forbidIn(renderDocumentSource, "DICOM-архив", "Rendered documents must not expose technical DICOM archive wording.");
forbidIn(renderDocumentSource, "Исходные DICOM-данные", "Rendered documents must not expose technical DICOM data wording.");
forbidIn(renderDocumentSource, "DICOM/КТ", "Rendered documents must not mix technical DICOM abbreviations with clinical CT wording.");
forbidIn(renderDocumentSource, "DICOM-файлы", "Rendered documents must not expose technical DICOM file wording.");
forbidIn(renderDocumentSource, "DICOM-экспорт", "Rendered documents must not expose technical DICOM export wording.");
forbidIn(renderDocumentSource, "PDF / DICOM", "Rendered documents must not advertise document formats with technical DICOM wording.");

console.log(
  JSON.stringify(
    {
      ok: true,
      documentsViewLazy: true,
      appDocumentFactoryRemoved: true,
      issueAndAuditActionsPreserved: true
    },
    null,
    2
  )
);
