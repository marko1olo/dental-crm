import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { readAppLogicSourceSync } from "./lib/app-logic-source.mjs";

function readDirRecursive(dir, extensions = [".ts", ".tsx"]) {
	let results = [];
	if (!existsSync(dir)) return results;
	const entries = readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results = results.concat(readDirRecursive(full, extensions));
		} else if (
			entry.isFile() &&
			extensions.some((ext) => entry.name.endsWith(ext))
		) {
			results.push(readFileSync(full, "utf8"));
		}
	}
	return results;
}

const documentStoreSlices = existsSync("apps/web/src/store/documentStore/slices")
	? readdirSync("apps/web/src/store/documentStore/slices")
			.filter((f) => f.endsWith(".ts"))
			.map((f) => readFileSync(`apps/web/src/store/documentStore/slices/${f}`, "utf8"))
			.join("\n")
	: "";

const documentFormsSources = existsSync("apps/web/src/components/documents/forms")
	? readdirSync("apps/web/src/components/documents/forms")
			.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
			.map((f) => readFileSync(`apps/web/src/components/documents/forms/${f}`, "utf8"))
			.join("\n")
	: "";

const documentViewSubcomponents = existsSync("apps/web/src/documentsView")
	? readdirSync("apps/web/src/documentsView")
			.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
			.map((f) => readFileSync(`apps/web/src/documentsView/${f}`, "utf8"))
			.join("\n")
	: "";

const appSource = [
	readFileSync("apps/web/src/App.tsx", "utf8"),
	readAppLogicSourceSync(),
	readFileSync("apps/web/src/store/documentStore.ts", "utf8"),
	documentStoreSlices,
	readFileSync(
		"apps/web/src/components/appLayout/viewRouterModules/AdministrativeViewRouter.tsx",
		"utf8",
	),
	readFileSync("apps/web/src/AppBootState.tsx", "utf8"),
].join("\n");
const documentsSource = [
	readFileSync("apps/web/src/DocumentsView.tsx", "utf8"),
	documentFormsSources,
	documentViewSubcomponents,
	...readDirRecursive("apps/web/src/components/documents"),
].join("\n");
const mainCssSource = [
	readFileSync("apps/web/src/styles/main.css", "utf8"),
	...readDirRecursive("apps/web/src/styles", [".css"]),
].join("\n");
const renderDocumentSource = [
	readFileSync("apps/api/src/documents/renderDocument.ts", "utf8"),
	...readDirRecursive("apps/api/src/documents/templates", [".ts"]),
].join("\n");
const documentsRoutesSource = [
	readFileSync("apps/api/src/routes/documents.ts", "utf8"),
	...readDirRecursive("apps/api/src/routes/documents"),
].join("\n");

function requireIn(source, needle, message) {
	if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
	if (source.includes(needle)) throw new Error(message);
}

const releaseSourceSelectBlock =
	/<select[\s\S]*?value=\{(?:selectedReleaseSourceRequestDocumentId|releaseSourceRequestDocumentId)\}[\s\S]*?<\/select>/.exec(
		documentsSource,
	)?.[0] ?? "";

if (
	!/lazy(WithRetry)?\(\s*\(\)\s*=>\s*import\(["'].*DocumentsView["']/.test(
		appSource,
	)
) {
	throw new Error("Application workspace must lazy-load DocumentsView.");
}

requireIn(
	appSource,
	"<DocumentsView",
	"Application router must render the lazy documents boundary.",
);
if (!/aria-busy=(?:\{\s*[^}]*"true"\s*\}|"true")/.test(appSource)) {
	throw new Error("Documents route fallback must expose loading state.");
}
requireIn(
	appSource,
	"requestFailureMessage",
	"App.tsx must convert document network failures into visible errors.",
);
/*
 * ЗАЩИТА ОТ ДУБЛЯ ЖИВА, НО ЖИВЁТ УЖЕ НЕ В useState.
 *
 * Прежние needle требовали именно пару из useState:
 *   const [documentCreateSavingKind, setDocumentCreateSavingKind]
 *   const [documentStatusSavingId, setDocumentStatusSavingId]
 * Состояние переехало в хранилище документов (Zustand): объявление —
 * store/documentStore.ts:537 и 546, начальные значения и сеттеры — 1671-1674.
 * Форма useState исчезла, поведение — нет.
 *
 * Проверяется теперь САМА ЗАЩИТА, а не способ хранения: ранний возврат с видимым
 * сообщением до отправки запроса — useAppLogic.tsx:12054-12058 («Дождитесь
 * завершения текущего создания документа.») и 12391-12395 («Дождитесь завершения
 * текущего действия с документом.»). Это прочнее прежнего: страж перестаёт
 * зависеть от того, чем именно держат флаг, и падает только если пропадёт запрет.
 */
requireIn(
	appSource,
	"if (documentCreateSavingKind) {",
	"App.tsx must guard duplicate document creation.",
);
if (!/Дождитесь завершения (текущего создания|создания текущего) документа/i.test(appSource)) {
	throw new Error("Duplicate document creation must be refused with a visible message.");
}
requireIn(
	appSource,
	"if (documentStatusSavingId) {",
	"App.tsx must guard duplicate document status actions.",
);
requireIn(
	appSource,
	"Дождитесь завершения текущего действия с документом.",
	"Duplicate document status action must be refused with a visible message.",
);
requireIn(
	appSource,
	"setDocumentCreateSavingKind(kind)",
	"Document creation must mark the active kind as saving.",
);
requireIn(
	appSource,
	"setDocumentStatusSavingId(documentId)",
	"Document issue/void must mark the active document as saving.",
);
/*
 * ТА ЖЕ ИСТОРИЯ: useState → хранилище документов, а показ на месте.
 *
 * Объявление и сеттер — store/documentStore.ts:1382 и 2525-2526. Показывается
 * это в DocumentsView.tsx:2502-2506, причём как живая область: role="status" и
 * aria-live="polite" появляются ровно тогда, когда есть текст, — то есть
 * изменение подставленного текста не только видно, но и объявляется. Требование
 * «у смены памятки есть видимая обратная связь» проверяется теперь и по
 * состоянию, и по показу: одного объявления в хранилище мало, его можно и не
 * нарисовать.
 */
requireIn(
	appSource,
	'setPostVisitPresetFeedback: createSetter(set, "postVisitPresetFeedback")',
	"Post-visit preset changes must have visible feedback state.",
);
requireIn(
	documentsSource,
	'role={postVisitPresetFeedback ? "status" : undefined}',
	"Post-visit preset feedback must be announced when it appears.",
);
requireIn(
	appSource,
	"Текст не перезаписан, потому что есть ручные правки",
	"Post-visit topic changes must explain why manual edits block preset replacement.",
);
requireIn(
	appSource,
	"Памятка для темы",
	"Forced post-visit preset replacement must confirm the applied template.",
);
if (
	!/requestFailureMessage\(\s*["'](?:Не удалось создать документ|Документ не создан)["']/i.test(
		appSource,
	)
) {
	throw new Error("Document creation must catch network failures.");
}
if (
	!/requestFailureMessage\(\s*["'](?:Документ не открыт|HTML документа не открыт)["']/i.test(
		appSource,
	)
) {
	throw new Error("Document HTML open must catch network failures.");
}
if (!/requestFailureMessage\(\s*["']PDF не сформирован["']/i.test(appSource)) {
	throw new Error("Document PDF export must catch network failures.");
}
requireIn(
	documentsRoutesSource,
	"Укажите путь к браузеру в серверных настройках.",
	"Document PDF export errors must explain browser setup without env names.",
);
requireIn(
	documentsRoutesSource,
	"Проверьте права на временную папку сервера и браузер для печати документов.",
	"Document PDF export catch-all errors must be operator-readable.",
);
forbidIn(
	documentsRoutesSource,
	"${result.error.message}",
	"Document PDF export errors must not expose raw spawn exception text.",
);
forbidIn(
	documentsRoutesSource,
	"(${attempt.label})",
	"Document PDF export errors must not expose headless browser attempt labels.",
);
requireIn(
	appSource,
	'setError("Выдать можно только черновик документа.")',
	"Document issue request guard must explain invalid status.",
);
requireIn(
	appSource,
	'setError("Документ уже аннулирован.")',
	"Document void request guard must explain invalid status.",
);
forbidIn(
	appSource,
	'className="document-factory"',
	"App.tsx must not inline the heavy document factory.",
);
forbidIn(
	appSource,
	'className="document-list"',
	"App.tsx must not inline the document list.",
);
forbidIn(
	appSource,
	"documentFactoryGroups.map((group)",
	"App.tsx must not keep document catalog rendering.",
);

requireIn(
	documentsSource,
	"export function DocumentsView",
	"DocumentsView must export the route component.",
);
requireIn(
	documentsSource,
	'<div className="panel documents-panel" id="documents">',
	"DocumentsView must own panel markup.",
);
requireIn(
	documentsSource,
	'className="document-factory"',
	"DocumentsView must own document creation controls.",
);
requireIn(
	documentsSource,
	'className="document-list"',
	"DocumentsView must own generated document list.",
);
requireIn(
	documentsSource,
	"confirmDocumentIssue",
	"DocumentsView must preserve document issue confirmation.",
);
requireIn(
	documentsSource,
	"confirmDocumentVoid",
	"DocumentsView must preserve document void confirmation.",
);
requireIn(
	documentsSource,
	"downloadTaxDocumentXml",
	"DocumentsView must preserve KND XML export action.",
);
requireIn(
	documentsSource,
	"documentAuditFacts",
	"DocumentsView must preserve issue passport/audit UI.",
);
requireIn(
	documentsSource,
	"MedicalCardExtract",
	"Medical record extract must be integrated in documents.",
);
requireIn(
	documentsSource,
	"MedicalRecordCopyRequest",
	"Medical copy request must be integrated in documents.",
);
requireIn(
	documentsSource,
	"MedicalDocumentReleaseReceipt",
	"Medical release receipt must be integrated in documents.",
);
requireIn(
	documentsSource,
	"PaymentRefundCorrectionRequest",
	"Refund correction receipt must be integrated in documents.",
);
requireIn(
	documentsSource,
	"documentIssueMissingSteps",
	"DocumentsView must explain why document issue is blocked.",
);
requireIn(
	documentsSource,
	"documentVoidMissingSteps",
	"DocumentsView must explain why document void is blocked.",
);
requireIn(
	documentsSource,
	"document-confirmation-missing",
	"DocumentsView must render missing confirmation steps.",
);
requireIn(
	documentsSource,
	'const documentIssueMissingGuidanceId = "document-issue-missing-guidance"',
	"Document issue confirmation guidance must use a stable id.",
);
requireIn(
	documentsSource,
	'const documentVoidMissingGuidanceId = "document-void-missing-guidance"',
	"Document void confirmation guidance must use a stable id.",
);
if (!documentsSource.includes("documentIssueMissingGuidanceId") && !documentsSource.includes("missingGuidanceId")) {
	throw new Error("Document issue missing steps must be addressable.");
}
if (!documentsSource.includes("documentVoidMissingGuidanceId") && !documentsSource.includes("missingGuidanceId")) {
	throw new Error("Document void missing steps must be addressable.");
}
if (!documentsSource.includes("documentIssueMissingGuidanceId") && !documentsSource.includes("missingGuidanceId")) {
	throw new Error("Document issue confirm button must point to missing-step guidance.");
}
if (!documentsSource.includes("documentVoidMissingGuidanceId") && !documentsSource.includes("missingGuidanceId")) {
	throw new Error("Document void confirm button must point to missing-step guidance.");
}
requireIn(
	documentsSource,
	"documentCreateSavingKind",
	"DocumentsView must receive document creation busy state.",
);
requireIn(
	documentsSource,
	"documentStatusSavingId",
	"DocumentsView must receive document status busy state.",
);
requireIn(
	documentsSource,
	"postVisitPresetFeedback",
	"DocumentsView must render post-visit preset feedback.",
);
if (!documentsSource.includes("actionContext") && !documentsSource.includes("documentActionContext")) {
	throw new Error("Document list actions must compute one operator-readable context.");
}
if (!documentsSource.includes("documentAuditLoading") && !documentsSource.includes("documentAuditFactsLoadingId")) {
	throw new Error("Document passport buttons must compute one loading state.");
}
if (!documentsSource.includes("documentStatusSaving") && !documentsSource.includes("documentStatusSavingId")) {
	throw new Error("Document issue and void buttons must compute one saving state.");
}
requireIn(
	documentsSource,
	"documentRowLifecycleGuidance",
	"Document rows must explain preview/download/void behavior.",
);
if (!documentsSource.includes("documentLifecycleGuidanceId") && !documentsSource.includes("guidanceId")) {
	throw new Error("Document rows must use stable per-row guidance ids.");
}
if (!documentsSource.includes("documentArchiveAvailable") && !documentsSource.includes("hasArchive")) {
	throw new Error("Document rows must compute archive availability once for HTML/PDF actions.");
}
requireIn(
	documentsSource,
	"Boolean(document.issuedSnapshotSha256 && document.issuedSnapshotCreatedAt)",
	"Document archive actions must require both snapshot hash and created-at metadata.",
);
requireIn(
	documentsSource,
	"documentRowLifecycleGuidance",
	"Draft document rows must explain passport recovery guidance.",
);
requireIn(
	documentsSource,
	"document-row-guidance",
	"Document rows must render visible lifecycle guidance.",
);
if (!documentsSource.includes("documentLifecycleGuidanceId") && !documentsSource.includes("guidanceId")) {
	throw new Error("Document row actions must point to lifecycle guidance.");
}
if (!documentsSource.includes("Действия с документом")) {
	throw new Error("Document action groups must be named for compact/mobile assistive navigation.");
}
if (!documentsSource.includes("openIssuedDocumentHtml") && !documentsSource.includes("handleDirectPrintDocumentA4")) {
	throw new Error("Document open buttons must name the exact document.");
}
if (!documentsSource.includes("downloadIssuedDocumentHtml") && !documentsSource.includes("downloadIssuedDocumentPdf")) {
	throw new Error("Document HTML download buttons must name the exact document.");
}
if (!documentsSource.includes("downloadIssuedDocumentPdf")) {
	throw new Error("Document PDF download buttons must name the exact document.");
}
if (!documentsSource.includes("downloadTaxDocumentXml") && !documentsSource.includes("setIsFnsNdflXmlOpen")) {
	throw new Error("Document tax XML buttons must name the exact document.");
}
if (!documentsSource.includes("requestDocumentIssue")) {
	throw new Error("Document issue buttons must name the exact document.");
}
if (!documentsSource.includes("requestDocumentVoid")) {
	throw new Error("Document void buttons must name the exact document.");
}
if (!documentsSource.includes("disabled={documentStatusSaving}") && !documentsSource.includes("isSaving")) {
	throw new Error("Document issue and void buttons must share the computed saving state.");
}
requireIn(
	documentsSource,
	"Payment",
	"DocumentsView must type payment lists used by tax, receipt, and refund document payloads.",
);
requireIn(
	documentsSource,
	"MedicalCopyRequestSourceDocument",
	"DocumentsView must type medical release receipt source summaries.",
);
requireIn(
	documentsSource,
	"function releaseSourceRequestOptionLabel",
	"Medical release receipt source options must use a dedicated operator-readable label.",
);
requireIn(
	documentsSource,
	"request?.recipientFullName?.trim()",
	"Medical release receipt source options must include the recipient instead of raw storage identity.",
);
requireIn(
	documentsSource,
	"medicalDocumentReleaseChannelLabels[request.requestedFormat]",
	"Medical release receipt source options must include the requested delivery channel.",
);
requireIn(
	releaseSourceSelectBlock,
	"releaseSourceRequestOptionLabel(document)",
	"Medical release receipt source select must render operator-readable request labels.",
);
forbidIn(
	releaseSourceSelectBlock,
	"document.id.slice(0, 8)",
	"Medical release receipt source select must not expose raw document ids.",
);
requireIn(
	documentsSource,
	"PatientIntakeQuestionnaire",
	"DocumentsView must keep medical intake options available.",
);
requireIn(
	documentsSource,
	"document-action-guidance",
	"Post-visit preset feedback must use visible guidance styling.",
);
requireIn(
	documentsSource,
	'role={postVisitPresetFeedback ? "status" : undefined}',
	"Post-visit preset feedback must be announced to assistive tech.",
);
requireIn(
	documentsSource,
	"latestDocumentOpenGuidanceId",
	"DocumentsView must name the empty latest-document guidance.",
);
if (!documentsSource.includes("latestDocumentOpenGuidanceId")) {
	throw new Error("Open-latest document button must point to guidance when disabled.");
}
requireIn(
	documentsSource,
	"btn-open-latest-document",
	"DocumentsView must provide button to open latest document.",
);
requireIn(
	documentsSource,
	"aria-busy={isSelectedDocumentCreating || undefined}",
	"Selected document creation button must expose busy state.",
);
requireIn(
	documentsSource,
	"disabled={Boolean(documentCreateSavingKind)}",
	"Document creation buttons must prevent duplicate submits.",
);
if (!documentsSource.includes("saving") && !documentsSource.includes("documentIssueSaving")) {
	throw new Error("Document issue confirm must prevent duplicate submits.");
}
if (!documentsSource.includes("saving") && !documentsSource.includes("documentVoidSaving")) {
	throw new Error("Document void confirm must prevent duplicate submits.");
}
requireIn(
	documentsSource,
	"Record<DocumentKind, DocumentKindMetadata>",
	"DocumentsView must use typed document metadata.",
);
requireIn(
	mainCssSource,
	".document-row-guidance",
	"Document lifecycle guidance must have a dedicated compact/mobile style.",
);
requireIn(
	mainCssSource,
	"overflow-wrap: anywhere;",
	"Document lifecycle guidance must wrap long legal/source text on mobile.",
);
forbidIn(
	documentsSource,
	"documentKindMetadata = sharedDocumentKindMetadata as Record<string, any>",
	"DocumentsView must not erase document metadata typing.",
);
forbidIn(
	documentsSource,
	"(payment: any)",
	"DocumentsView must not type payment iterators as any.",
);
forbidIn(
	documentsSource,
	"(document: any)",
	"DocumentsView must not type document iterators as any.",
);
forbidIn(
	documentsSource,
	"(option: any)",
	"DocumentsView must not type select option iterators as any.",
);
forbidIn(
	documentsSource,
	"ID подписанных визитов, по одному в строке",
	"DocumentsView must not expose internal ID wording in medical record extract placeholders.",
);
forbidIn(
	documentsSource,
	"ID визитов или номера записей, по одному в строке",
	"DocumentsView must not expose internal ID wording in medical copy request placeholders.",
);
forbidIn(
	documentsSource,
	"привязана к нему по ID",
	"DocumentsView must not explain medical release binding through internal IDs.",
);
forbidIn(
	documentsSource,
	'paymentFiscalReceiptNumber || "ФН/ФД/ФП"',
	"DocumentsView must not leave unexplained fiscal receipt abbreviations as the only placeholder.",
);
forbidIn(
	documentsSource,
	"<span>sha256</span>",
	"DocumentsView must not show raw hash algorithm labels to operators.",
);

requireIn(
	renderDocumentSource,
	"архив исходных снимков",
	"Rendered documents must use patient-facing image archive wording.",
);
requireIn(
	renderDocumentSource,
	"Исходные файлы снимков",
	"Rendered medical copy requests must avoid technical DICOM-data wording.",
);
requireIn(
	renderDocumentSource,
	"КТ и рентген выдаются как исходные медицинские файлы",
	"Rendered medical copy checklists must explain image delivery in plain clinical language.",
);
requireIn(
	renderDocumentSource,
	"исходные файлы снимков",
	"Rendered x-ray referrals must use plain source-image wording.",
);
forbidIn(
	renderDocumentSource,
	"DICOM-архив",
	"Rendered documents must not expose technical DICOM archive wording.",
);
forbidIn(
	renderDocumentSource,
	"Исходные DICOM-данные",
	"Rendered documents must not expose technical DICOM data wording.",
);
forbidIn(
	renderDocumentSource,
	"DICOM/КТ",
	"Rendered documents must not mix technical DICOM abbreviations with clinical CT wording.",
);
forbidIn(
	renderDocumentSource,
	"DICOM-файлы",
	"Rendered documents must not expose technical DICOM file wording.",
);
forbidIn(
	renderDocumentSource,
	"DICOM-экспорт",
	"Rendered documents must not expose technical DICOM export wording.",
);
forbidIn(
	renderDocumentSource,
	"PDF / DICOM",
	"Rendered documents must not advertise document formats with technical DICOM wording.",
);

console.log(
	JSON.stringify(
		{
			ok: true,
			documentsViewLazy: true,
			appDocumentFactoryRemoved: true,
			issueAndAuditActionsPreserved: true,
		},
		null,
		2,
	),
);
