import { readFileSync } from "node:fs";

const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const documentsSource = readFileSync("apps/web/src/DocumentsView.tsx", "utf8");

function requireIn(source, needle, message) {
  if (!source.includes(needle)) throw new Error(message);
}

function forbidIn(source, needle, message) {
  if (source.includes(needle)) throw new Error(message);
}

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
requireIn(documentsSource, "documentIssueMissingSteps", "DocumentsView must explain why document issue is blocked.");
requireIn(documentsSource, "documentVoidMissingSteps", "DocumentsView must explain why document void is blocked.");
requireIn(documentsSource, "document-confirmation-missing", "DocumentsView must render missing confirmation steps.");
requireIn(documentsSource, "documentCreateSavingKind", "DocumentsView must receive document creation busy state.");
requireIn(documentsSource, "documentStatusSavingId", "DocumentsView must receive document status busy state.");
requireIn(documentsSource, "postVisitPresetFeedback", "DocumentsView must render post-visit preset feedback.");
requireIn(documentsSource, "document-action-guidance", "Post-visit preset feedback must use visible guidance styling.");
requireIn(documentsSource, "role={postVisitPresetFeedback ? \"status\" : undefined}", "Post-visit preset feedback must be announced to assistive tech.");
requireIn(documentsSource, "aria-busy={isSelectedDocumentCreating || undefined}", "Selected document creation button must expose busy state.");
requireIn(documentsSource, "disabled={Boolean(documentCreateSavingKind)}", "Document creation buttons must prevent duplicate submits.");
requireIn(documentsSource, "disabled={!documentIssueAttestationReady || documentIssueSaving}", "Document issue confirm must prevent duplicate submits.");
requireIn(documentsSource, "disabled={!documentVoidReady || documentVoidSaving}", "Document void confirm must prevent duplicate submits.");
requireIn(documentsSource, "Record<DocumentKind, DocumentKindMetadata>", "DocumentsView must use typed document metadata.");
forbidIn(documentsSource, "documentKindMetadata = sharedDocumentKindMetadata as Record<string, any>", "DocumentsView must not erase document metadata typing.");

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
