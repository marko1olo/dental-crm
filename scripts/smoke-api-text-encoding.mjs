import path from "node:path";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

process.env.DENTAL_STATE_PERSISTENCE = "off";

const sampleDataUrl = pathToFileURL(path.resolve("apps/api/dist/sampleData.js")).href;
const rendererUrl = pathToFileURL(path.resolve("apps/api/dist/documents/renderDocument.js")).href;
const { buildDashboard } = await import(`${sampleDataUrl}?encoding-smoke=${Date.now()}`);
const { documentIssueBlockReason, renderDocumentHtml } = await import(`${rendererUrl}?encoding-smoke=${Date.now()}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function collectStrings(value, output = []) {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) => collectStrings(entry, output));
  }
  return output;
}

const dashboard = buildDashboard();
const renderContext = { clinicProfile: dashboard.clinicSettings.profile, payments: dashboard.payments };
const renderedDocuments = dashboard.documents
  .map((document) => {
    const patient = dashboard.patients.find((entry) => entry.id === document.patientId);
    return patient ? renderDocumentHtml(document, patient, renderContext) : "";
  })
  .filter(Boolean);
const documentIssueReasons = dashboard.documents
  .map((document) => {
    const patient = dashboard.patients.find((entry) => entry.id === document.patientId);
    return patient ? documentIssueBlockReason({ ...document, status: "voided" }, patient, renderContext) : null;
  })
  .filter(Boolean);
const checkedStrings = collectStrings({ dashboard, renderedDocuments, documentIssueReasons });
const mojibakeHits = checkedStrings.filter((value) => /(?:Ã.|Â.|Ð.|Ñ.|â.)/.test(value));

assert(checkedStrings.length > 250, "encoding smoke did not inspect enough UI strings");
assert(mojibakeHits.length === 0, `mojibake text leaked to dashboard: ${mojibakeHits.slice(0, 3).join(" | ")}`);
assert(renderedDocuments.length > 0, "encoding smoke did not render document HTML");
assert(renderedDocuments.some((html) => html.includes("Пациент")), "document HTML was not inspected as readable Russian");
assert(renderedDocuments.some((html) => html.includes('class="check-list"')), "document checklist HTML was not inspected");
assert(renderedDocuments.some((html) => html.includes("\u25a1")), "document checklist marker was not rendered as a real square marker");
assert(
  !renderedDocuments.some((html) => html.includes("\u00e2\u2013\u00a1")),
  "document checklist marker rendered as mojibake"
);
assert(
  documentIssueReasons.some((reason) => reason.includes("Аннулированный")),
  "document issue block reason was not inspected as readable Russian"
);
assert(
  dashboard.communicationTemplates.some((template) => template.title.includes("Подтверждение приема")),
  "communication template title was not repaired"
);
assert(
  dashboard.protocolTemplates.some((template) => template.objectiveTemplate.includes("Осмотр слизистой")),
  "protocol template text was not repaired"
);
assert(
  dashboard.appointments.some((appointment) => appointment.reason?.includes("Лечение 36")),
  "appointment reason was not repaired"
);
assert(
  dashboard.appointmentReadiness.some((item) => item.checks.some((check) => check.title === "Пациент")),
  "appointment readiness labels were not repaired"
);

const sharedSource = readFileSync("packages/shared/src/index.ts", "utf8");
const serverSource = readFileSync("apps/api/src/server.ts", "utf8");
const appSource = readFileSync("apps/web/src/App.tsx", "utf8");
const userFacingApiSources = [
  readFileSync("apps/api/src/sampleData.ts", "utf8"),
  readFileSync("apps/api/src/documents/renderDocument.ts", "utf8"),
  readFileSync("apps/api/src/routes/documents.ts", "utf8"),
  readFileSync("apps/api/src/routes/speech.ts", "utf8"),
  readFileSync("apps/api/src/routes/imaging.ts", "utf8"),
  readFileSync("apps/api/src/ingestion/documentExtractor.ts", "utf8")
].join("\n");
const mojibakeSourceHits = userFacingApiSources.match(/"(?:[^"\\]|\\.)*(?:Ð|Ñ|Ã|Â|â)(?:[^"\\]|\\.)*"/g) ?? [];
assert(
  mojibakeSourceHits.length === 0,
  `mojibake source text leaked from user-facing API sources: ${mojibakeSourceHits.slice(0, 5).join(", ")}`
);
const englishValidationHits =
  sharedSource.match(/"[^"]*(must be|is required|Invalid input|Telegram bot username|startsAt must|endsAt must)[^"]*"/g) ??
  [];
assert(
  englishValidationHits.length === 0,
  `english validation text leaked from shared schemas: ${englishValidationHits.slice(0, 5).join(", ")}`
);
assert(serverSource.includes("publicValidationErrorMessage"), "API must keep bounded generic validation fallback copy.");
assert(serverSource.includes("createDenteApiApp"), "API server must expose an app factory for runtime error-boundary proof.");
assert(!serverSource.includes("issues: error.issues"), "API global validation fallback must not return raw zod issue arrays.");
assert(!serverSource.includes("localizeZodIssueMessage"), "API global validation fallback must not map zod issue details into public payloads.");
assert(serverSource.includes("apiTechnicalErrorPattern"), "API catch-all error handler must filter technical exception text.");
assert(serverSource.includes("publicApiErrorMessage"), "API catch-all error handler must keep only operator-readable domain messages.");
assert(!serverSource.includes("reply.send(error);"), "API catch-all error handler must not send raw Error objects.");
assert(
  serverSource.includes("Сервер не выполнил действие. Повторите позже или обратитесь к администратору клиники."),
  "API catch-all error handler must expose a readable recovery message for technical failures."
);
const englishApiMessageHits =
  userFacingApiSources.match(
    /"[^"]*(Telegram bot username|Telegram preview|Telegram link code clinic scope|Visit not found|Communication task not found|Clinical rule not found|visitId or patientId is required|Image files need|MPR mode is reserved|DICOMweb base URL is required|WebGL2 is required|IndexedDB is required|Staff member not found|Server bundle stores metadata|Clinic legal\/contact\/profile fields were updated|CRM stores the CT surface route|Archive or unknown surface format is metadata-only|Send this CT surface|Open this surface in an external model viewer|Keep this surface as metadata)[^"]*"/g
  ) ?? [];
assert(englishApiMessageHits.length === 0, `english API user-facing text leaked: ${englishApiMessageHits.slice(0, 5).join(", ")}`);
const englishUiMessageHits = ['"Undo"', ">Undo<", "кнопкой Undo", "local undo"].filter((snippet) => appSource.includes(snippet));
assert(englishUiMessageHits.length === 0, `english UI text leaked: ${englishUiMessageHits.slice(0, 5).join(", ")}`);

console.log(
  JSON.stringify({
    ok: true,
    checkedStrings: checkedStrings.length,
    checkedDocumentHtml: renderedDocuments.length,
    checkedDocumentReasons: documentIssueReasons.length,
    mojibakeHits: 0
  })
);
